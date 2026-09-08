import Dexie, { type Table } from "dexie";

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
  local_projeto: string;
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
        "++id, nome, projeto_id, quantidade, prateleira, piso_andar, local_projeto, organizador",
      movimentacoes: "++id, item_id, tipo, created_at, matricula_usuario",
    });
  }
}

export const db = new Database();

// Popula o banco com dados iniciais de exemplo, apenas na primeira execução
export async function seedDatabase(): Promise<void> {
  const projetosCount = await db.projetos.count();
  if (projetosCount > 0) return;

  const nomesprojetos = ["MADA", "CEMIG", "JMMTECH"];
  const idsprojetos = await db.projetos.bulkAdd(
    nomesprojetos.map((nome) => ({ nome })),
    { allKeys: true },
  );
  const [madaId, cemigId, jmmtechId] = idsprojetos;

  const agora = new Date();

  await db.itens.bulkAdd([
    {
      nome: "Parafuso M8 - Aço Inox",
      projeto_id: madaId,
      quantidade: 150,
      prateleira: "5",
      piso_andar: "P1",
      local_projeto: "A",
      organizador: "12",
      created_at: agora,
      updated_at: agora,
    },
    {
      nome: "Porca M8 - Zincada",
      projeto_id: madaId,
      quantidade: 300,
      prateleira: "5",
      piso_andar: "P1",
      local_projeto: "A",
      organizador: "13",
      created_at: agora,
      updated_at: agora,
    },
    {
      nome: "Óxido de grafeno - NANO VIEW",
      projeto_id: cemigId,
      quantidade: 5,
      prateleira: "2",
      piso_andar: "P1",
      local_projeto: "B",
      organizador: "73",
      created_at: agora,
      updated_at: agora,
    },
    {
      nome: "Resina Epóxi - 500ml",
      projeto_id: cemigId,
      quantidade: 12,
      prateleira: "3",
      piso_andar: "P1",
      local_projeto: "B",
      organizador: "45",
      created_at: agora,
      updated_at: agora,
    },
    {
      nome: "Bateria Li-ion 18650",
      projeto_id: jmmtechId,
      quantidade: 8,
      prateleira: "1",
      piso_andar: "P2",
      local_projeto: "C",
      organizador: "22",
      created_at: agora,
      updated_at: agora,
    },
    {
      nome: "Arduino Mega 2560",
      projeto_id: jmmtechId,
      quantidade: 3,
      prateleira: "4",
      piso_andar: "P2",
      local_projeto: "C",
      organizador: "31",
      created_at: agora,
      updated_at: agora,
    },
  ]);
}
