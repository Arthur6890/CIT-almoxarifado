import Dexie, { type Table } from "dexie";
import { items as itensBrutos, type ItemImportado } from "./items";

export interface Projeto {
  id?: number;
  nome: string;
}

export interface Item {
  id?: number;
  nome: string;
  projeto_id: number;
  quantidade: number;
  prateleira: string;
  piso_andar: string;
  local_setor: string;
  organizador: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Movimentacao {
  id?: number;
  item_id: number;
  tipo: "ENTRADA" | "SAIDA";
  quantidade_antes: number;
  quantidade_depois: number;
  matricula_usuario: string;
  observacao?: string;
  created_at?: Date;
}

export class Database extends Dexie {
  projetos!: Table<Projeto, number>;
  itens!: Table<Item, number>;
  movimentacoes!: Table<Movimentacao, number>;

  constructor() {
    super("CITAlmoxarifadoDB");

    this.version(1).stores({
      projetos: "++id, nome",
      itens:
        "++id, nome, projeto_id, quantidade, prateleira, piso_andar, local_setor, organizador, [projeto_id+nome]",
      movimentacoes: "++id, item_id, tipo, created_at, matricula_usuario",
    });
  }
}

export const db = new Database();

// Correções conhecidas de nome (erros de digitação identificados na planilha de origem):
// linhas com esses nomes são tratadas como o mesmo item que o nome do lado direito.
// Adicione aqui outras variações que forem identificadas futuramente.
export const APELIDOS_NOME_ITEM: Record<string, string> = {
  "disco de corte 115x1x22,23": "Disco de corte 115x1x22,23mm",
};

export function nomeCanonicoItem(nomeBruto: string): string {
  const chave = nomeBruto.trim().toLowerCase();
  return APELIDOS_NOME_ITEM[chave] ?? nomeBruto.trim();
}

export interface ItemAgregado {
  nome: string;
  projetoNome: string;
  quantidade: number;
  prateleira: string;
  piso_andar: string;
  local_setor: string;
  organizador: string;
}

// Agrupa as linhas brutas de items.ts por nome + projeto, que é a chave de identidade de um
// item no app. A planilha de origem tem várias linhas para o mesmo item (uma por entrada de
// estoque ao longo do tempo); aqui elas viram um único item com a quantidade somada, usando a
// localização (prateleira/piso/setor/organizador) da linha mais recente — como a ordem de
// items.ts segue a ordem cronológica da planilha original, a mais recente é a última do grupo.
// Itens sem projeto associado (projeto_id vazio) ficam de fora: precisam de um projeto
// definido manualmente antes de entrar no estoque.
// Recebe a lista bruta por parâmetro (padrão: items.ts) para poder ser testada com dados
// sintéticos, sem depender do conteúdo real de items.ts.
export function agregarItensImportados(
  linhasBrutas: readonly ItemImportado[] = itensBrutos,
): ItemAgregado[] {
  const porChave = new Map<string, ItemAgregado>();

  for (const bruto of linhasBrutas) {
    if (!bruto.projeto_id) continue;

    const nome = nomeCanonicoItem(bruto.nome);
    const chave = `${nome.toLowerCase()}||${bruto.projeto_id.toLowerCase()}`;
    const existente = porChave.get(chave);

    if (existente) {
      existente.quantidade += bruto.quantidade;
      existente.prateleira = bruto.prateleira;
      existente.piso_andar = bruto.piso_andar;
      existente.local_setor = bruto.local_setor;
      existente.organizador = bruto.organizador;
    } else {
      porChave.set(chave, {
        nome,
        projetoNome: bruto.projeto_id,
        quantidade: bruto.quantidade,
        prateleira: bruto.prateleira,
        piso_andar: bruto.piso_andar,
        local_setor: bruto.local_setor,
        organizador: bruto.organizador,
      });
    }
  }

  return [...porChave.values()];
}

// Popula o banco com os itens importados de items.ts, apenas na primeira execução
export async function seedDatabase(): Promise<void> {
  const projetosCount = await db.projetos.count();
  if (projetosCount > 0) return;

  const itensAgregados = agregarItensImportados();

  const nomesProjetos = [
    ...new Set(itensAgregados.map((item) => item.projetoNome)),
  ];
  const idsProjetos = await db.projetos.bulkAdd(
    nomesProjetos.map((nome) => ({ nome })),
    { allKeys: true },
  );
  const idProjetoPorNome = new Map(
    nomesProjetos.map((nome, indice) => [nome, idsProjetos[indice]]),
  );

  const agora = new Date();

  await db.itens.bulkAdd(
    itensAgregados.map((item) => ({
      nome: item.nome,
      projeto_id: idProjetoPorNome.get(item.projetoNome)!,
      quantidade: item.quantidade,
      prateleira: item.prateleira,
      piso_andar: item.piso_andar,
      local_setor: item.local_setor,
      organizador: item.organizador,
      created_at: agora,
      updated_at: agora,
    })),
  );
}
