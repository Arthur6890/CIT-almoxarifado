// src/lib/repository.ts
import {
  db,
  type Funcionario,
  type Item,
  type Movimentacao,
  type Projeto,
  type StatusSaida,
} from "./db";
import type { HistoricoFiltros, LocalizacaoItem, MovimentacaoComItem } from "./types";

// ----------------- Projetos -----------------

export async function listarProjetos(): Promise<Projeto[]> {
  return db.projetos.orderBy("nome").toArray();
}

// Busca um projeto existente pelo nome (case insensitive) ou cria um novo.
// Usado quando o usuário escolhe "Novo Projeto" no Autocomplete e confirma o formulário.
export async function criarOuObterProjeto(nome: string): Promise<Projeto> {
  const nomeNormalizado = nome.trim();
  if (!nomeNormalizado) {
    throw new Error("Nome do projeto é obrigatório");
  }

  const projetos = await db.projetos.toArray();
  const existente = projetos.find(
    (projeto) => projeto.nome.trim().toLowerCase() === nomeNormalizado.toLowerCase(),
  );
  if (existente) return existente;

  const id = await db.projetos.add({ nome: nomeNormalizado });
  return { id, nome: nomeNormalizado };
}

// Resolve o id do projeto a partir da seleção feita no ProjetoAutocomplete: cria o projeto
// se for novo, ou busca o id do projeto existente pelo nome escolhido.
export async function resolverIdProjeto(selecao: {
  nome: string;
  isNovo: boolean;
}): Promise<number> {
  if (selecao.isNovo) {
    const projeto = await criarOuObterProjeto(selecao.nome);
    if (projeto.id === undefined) {
      throw new Error("Não foi possível criar o projeto");
    }
    return projeto.id;
  }

  const projeto = await db.projetos.where("nome").equals(selecao.nome).first();
  if (!projeto || projeto.id === undefined) {
    throw new Error("Projeto inválido");
  }
  return projeto.id;
}

// ----------------- Funcionários -----------------

export interface DadosFuncionario {
  nome: string;
  matricula?: string;
  eh_almoxarife: boolean;
}

export async function listarFuncionarios(): Promise<Funcionario[]> {
  return db.funcionarios.orderBy("nome").toArray();
}

export async function listarAlmoxarifes(): Promise<Funcionario[]> {
  const todos = await listarFuncionarios();
  return todos.filter((funcionario) => funcionario.eh_almoxarife);
}

function validarFuncionario(dados: DadosFuncionario): void {
  if (!dados.nome.trim()) {
    throw new Error("Nome do funcionário é obrigatório");
  }
  if (dados.matricula && !/^\d{7}$/.test(dados.matricula)) {
    throw new Error("Matrícula deve ter exatamente 7 dígitos numéricos");
  }
}

async function garantirMatriculaDisponivel(matricula: string, idAtual?: number): Promise<void> {
  const existente = await db.funcionarios.where("matricula").equals(matricula).first();
  if (existente && existente.id !== idAtual) {
    throw new Error("Já existe um funcionário com essa matrícula");
  }
}

export async function criarFuncionario(dados: DadosFuncionario): Promise<number> {
  validarFuncionario(dados);
  if (dados.matricula) {
    await garantirMatriculaDisponivel(dados.matricula);
  }
  return db.funcionarios.add({
    nome: dados.nome.trim(),
    matricula: dados.matricula,
    eh_almoxarife: dados.eh_almoxarife,
  });
}

export async function atualizarFuncionario(id: number, dados: DadosFuncionario): Promise<void> {
  validarFuncionario(dados);
  if (dados.matricula) {
    await garantirMatriculaDisponivel(dados.matricula, id);
  }
  await db.funcionarios.update(id, {
    nome: dados.nome.trim(),
    matricula: dados.matricula,
    eh_almoxarife: dados.eh_almoxarife,
  });
}

export async function removerFuncionario(id: number): Promise<void> {
  await db.funcionarios.delete(id);
}

// Formato padrão de exibição nos dropdowns e no Histórico: "MATRICULA - NOME", ou
// "BOLSISTA - NOME" quando o funcionário não tem matrícula cadastrada.
export function formatarFuncionario(funcionario: Pick<Funcionario, "nome" | "matricula">): string {
  const prefixo = funcionario.matricula ? funcionario.matricula : "BOLSISTA";
  return `${prefixo} - ${funcionario.nome}`;
}

// Confere que o funcionário informado (matrícula/quem retirou ou devolveu) existe de fato.
// A UI só deixa escolher da lista real, mas o repositório não confia cegamente no chamador.
async function garantirFuncionarioExiste(id: number): Promise<void> {
  const funcionario = await db.funcionarios.get(id);
  if (!funcionario) {
    throw new Error("Funcionário não encontrado");
  }
}

// Confere que o almoxarife informado existe e está de fato marcado como almoxarife.
async function garantirAlmoxarifeValido(id: number): Promise<void> {
  const funcionario = await db.funcionarios.get(id);
  if (!funcionario) {
    throw new Error("Almoxarife não encontrado");
  }
  if (!funcionario.eh_almoxarife) {
    throw new Error("Funcionário informado não é um almoxarife");
  }
}

// ----------------- Itens -----------------

export async function listarItensPorProjeto(projetoId: number): Promise<Item[]> {
  return db.itens.where("projeto_id").equals(projetoId).toArray();
}

export async function buscarItensPorTermo(projetoId: number, termo: string): Promise<Item[]> {
  const itens = await listarItensPorProjeto(projetoId);
  const termoNormalizado = termo.trim().toLowerCase();
  if (!termoNormalizado) return itens;
  return itens.filter((item) => item.nome.toLowerCase().includes(termoNormalizado));
}

// Regra de negócio: a chave de um item é a combinação nome + projeto_id,
// pois o mesmo nome de item pode existir em projetos diferentes.
export async function buscarItemPorNomeEProjeto(
  nome: string,
  projetoId: number,
): Promise<Item | undefined> {
  const nomeNormalizado = nome.trim().toLowerCase();
  if (!nomeNormalizado || !projetoId) return undefined;
  const itensDoProjeto = await listarItensPorProjeto(projetoId);
  return itensDoProjeto.find((item) => item.nome.trim().toLowerCase() === nomeNormalizado);
}

// Soma, por item, a quantidade que já saiu mas ainda está com retorno pendente
// (quantidade_antes - quantidade_depois de cada movimentação SAIDA com status PENDENTE_RETORNO).
// Usado em Consultar para mostrar "X pendente(s) de retorno" mesmo quando a quantidade
// disponível do item ainda é maior que zero.
export async function quantidadesPendentesPorProjeto(
  projetoId: number,
): Promise<Map<number, number>> {
  const itensDoProjeto = await listarItensPorProjeto(projetoId);
  const idsItensDoProjeto = new Set(itensDoProjeto.map((item) => item.id));

  const pendentes = await db.movimentacoes.where("status").equals("PENDENTE_RETORNO").toArray();

  const mapa = new Map<number, number>();
  for (const mov of pendentes) {
    if (!idsItensDoProjeto.has(mov.item_id)) continue;
    const quantidade = mov.quantidade_antes - mov.quantidade_depois;
    mapa.set(mov.item_id, (mapa.get(mov.item_id) ?? 0) + quantidade);
  }
  return mapa;
}

export interface NovoItemDados extends LocalizacaoItem {
  nome: string;
  projetoId: number;
  quantidadeInicial: number;
  funcionarioId: number;
  almoxarifeId: number;
  observacao?: string;
}

// Cria um item novo no estoque (tela /novo-item) e já registra a movimentação de ENTRADA
// correspondente à quantidade inicial informada.
export async function criarItem(dados: NovoItemDados): Promise<number> {
  const nomeNormalizado = dados.nome.trim();
  if (!nomeNormalizado) {
    throw new Error("Nome do item é obrigatório");
  }
  if (dados.quantidadeInicial < 1) {
    throw new Error("A quantidade inicial deve ser maior que zero");
  }
  await garantirFuncionarioExiste(dados.funcionarioId);
  await garantirAlmoxarifeValido(dados.almoxarifeId);

  const existente = await buscarItemPorNomeEProjeto(nomeNormalizado, dados.projetoId);
  if (existente) {
    throw new Error("Já existe um item com esse nome para o projeto selecionado");
  }

  return db.transaction("rw", db.itens, db.movimentacoes, async () => {
    const agora = new Date();
    const itemId = await db.itens.add({
      nome: nomeNormalizado,
      projeto_id: dados.projetoId,
      quantidade: dados.quantidadeInicial,
      organizador: dados.organizador,
      local_setor: dados.setor,
      piso_andar: dados.andar,
      prateleira: dados.prateleira,
      created_at: agora,
      updated_at: agora,
    });

    await db.movimentacoes.add({
      item_id: itemId,
      tipo: "ENTRADA",
      quantidade_antes: 0,
      quantidade_depois: dados.quantidadeInicial,
      funcionario_id: dados.funcionarioId,
      almoxarife_id: dados.almoxarifeId,
      observacao: dados.observacao,
      created_at: agora,
    });

    return itemId;
  });
}

// ----------------- Movimentações -----------------

export interface DadosMovimentacaoItem extends LocalizacaoItem {
  nomeItem: string;
  projetoId: number;
  quantidade: number;
  funcionarioId: number;
  almoxarifeId: number;
  observacao?: string;
}

export interface DadosSaidaItem extends DadosMovimentacaoItem {
  // true = "Com retorno" (status inicial PENDENTE_RETORNO); false = "Sem retorno" (SEM_RETORNO).
  comRetorno: boolean;
}

export interface ResultadoEntrada {
  quantidade: number;
  itemCriado: boolean;
}

// Registra uma entrada de N unidades (dados.quantidade). Se o item ainda não existir para o
// projeto selecionado, ele é criado automaticamente com os dados de localização informados no formulário.
export async function registrarEntrada(dados: DadosMovimentacaoItem): Promise<ResultadoEntrada> {
  const nomeNormalizado = dados.nomeItem.trim();
  if (!nomeNormalizado) {
    throw new Error("Nome do item é obrigatório");
  }
  if (!Number.isInteger(dados.quantidade) || dados.quantidade < 1) {
    throw new Error("A quantidade deve ser um número inteiro maior que zero");
  }
  await garantirFuncionarioExiste(dados.funcionarioId);
  await garantirAlmoxarifeValido(dados.almoxarifeId);

  const itemExistente = await buscarItemPorNomeEProjeto(nomeNormalizado, dados.projetoId);

  return db.transaction("rw", db.itens, db.movimentacoes, async () => {
    const agora = new Date();
    let itemId: number;
    let quantidadeAntes: number;
    let quantidadeDepois: number;
    let itemCriado = false;

    if (itemExistente && itemExistente.id !== undefined) {
      itemId = itemExistente.id;
      quantidadeAntes = itemExistente.quantidade;
      quantidadeDepois = quantidadeAntes + dados.quantidade;
      await db.itens.update(itemId, {
        quantidade: quantidadeDepois,
        organizador: dados.organizador,
        local_setor: dados.setor,
        piso_andar: dados.andar,
        prateleira: dados.prateleira,
        updated_at: agora,
      });
    } else {
      quantidadeAntes = 0;
      quantidadeDepois = dados.quantidade;
      itemId = await db.itens.add({
        nome: nomeNormalizado,
        projeto_id: dados.projetoId,
        quantidade: quantidadeDepois,
        organizador: dados.organizador,
        local_setor: dados.setor,
        piso_andar: dados.andar,
        prateleira: dados.prateleira,
        created_at: agora,
        updated_at: agora,
      });
      itemCriado = true;
    }

    await db.movimentacoes.add({
      item_id: itemId,
      tipo: "ENTRADA",
      quantidade_antes: quantidadeAntes,
      quantidade_depois: quantidadeDepois,
      funcionario_id: dados.funcionarioId,
      almoxarife_id: dados.almoxarifeId,
      observacao: dados.observacao,
      created_at: agora,
    });

    return { quantidade: quantidadeDepois, itemCriado };
  });
}

// Verifica se um item ainda tem alguma saída em aberto (status PENDENTE_RETORNO). Usado para
// decidir se um item que acabou de zerar pode ser excluído automaticamente do estoque.
async function temRetornoPendente(itemId: number): Promise<boolean> {
  const quantidade = await db.movimentacoes
    .where("item_id")
    .equals(itemId)
    .and((mov) => mov.status === "PENDENTE_RETORNO")
    .count();
  return quantidade > 0;
}

// Registra uma saída de N unidades (dados.quantidade). O item precisa existir para o projeto
// selecionado e ter quantidade suficiente em estoque.
//
// Regra de exclusão automática: se essa saída zerar a quantidade do item E o item não tiver
// nenhuma saída em aberto com retorno pendente (nem essa, nem nenhuma anterior), o item é
// removido do estoque. Se houver retorno pendente, o item permanece (mesmo com quantidade 0)
// até o retorno ser registrado — ver registrarRetorno.
export async function registrarSaida(dados: DadosSaidaItem): Promise<number> {
  const nomeNormalizado = dados.nomeItem.trim();
  if (!nomeNormalizado) {
    throw new Error("Nome do item é obrigatório");
  }
  if (!Number.isInteger(dados.quantidade) || dados.quantidade < 1) {
    throw new Error("A quantidade deve ser um número inteiro maior que zero");
  }
  await garantirFuncionarioExiste(dados.funcionarioId);
  await garantirAlmoxarifeValido(dados.almoxarifeId);

  const item = await buscarItemPorNomeEProjeto(nomeNormalizado, dados.projetoId);
  if (!item || item.id === undefined) {
    throw new Error("Item não encontrado para o projeto selecionado");
  }
  if (item.quantidade <= 0) {
    throw new Error("Item sem estoque disponível");
  }
  if (dados.quantidade > item.quantidade) {
    throw new Error("Quantidade solicitada maior que o estoque disponível");
  }

  const quantidadeAntes = item.quantidade;
  const quantidadeDepois = quantidadeAntes - dados.quantidade;
  const status: StatusSaida = dados.comRetorno ? "PENDENTE_RETORNO" : "SEM_RETORNO";
  const itemId = item.id;

  await db.transaction("rw", db.itens, db.movimentacoes, async () => {
    await db.itens.update(itemId, {
      quantidade: quantidadeDepois,
      organizador: dados.organizador,
      local_setor: dados.setor,
      piso_andar: dados.andar,
      prateleira: dados.prateleira,
      updated_at: new Date(),
    });
    await db.movimentacoes.add({
      item_id: itemId,
      tipo: "SAIDA",
      quantidade_antes: quantidadeAntes,
      quantidade_depois: quantidadeDepois,
      funcionario_id: dados.funcionarioId,
      almoxarife_id: dados.almoxarifeId,
      status,
      observacao: dados.observacao,
      created_at: new Date(),
    });

    if (quantidadeDepois === 0 && status !== "PENDENTE_RETORNO") {
      const temPendente = await temRetornoPendente(itemId);
      if (!temPendente) {
        await db.itens.delete(itemId);
      }
    }
  });

  return quantidadeDepois;
}

export interface DadosRetorno {
  movimentacaoOrigemId: number;
  funcionarioId: number;
  almoxarifeId: number;
  observacao?: string;
}

// Fecha uma saída "com retorno": soma a quantidade de volta ao estoque do item, cria um novo
// registro de movimentação do tipo RETORNO (rastreável, aponta para a saída original via
// movimentacao_origem_id) e marca a saída original como RETORNADO. O retorno é sempre integral
// (toda a quantidade que saiu volta de uma vez, sem devolução parcial).
export async function registrarRetorno(dados: DadosRetorno): Promise<void> {
  const original = await db.movimentacoes.get(dados.movimentacaoOrigemId);
  if (!original || original.tipo !== "SAIDA" || original.status !== "PENDENTE_RETORNO") {
    throw new Error("Essa movimentação não está pendente de retorno");
  }
  await garantirFuncionarioExiste(dados.funcionarioId);
  await garantirAlmoxarifeValido(dados.almoxarifeId);

  const quantidadeRetornada = original.quantidade_antes - original.quantidade_depois;

  await db.transaction("rw", db.itens, db.movimentacoes, async () => {
    const item = await db.itens.get(original.item_id);
    if (!item || item.id === undefined) {
      throw new Error("Item não encontrado para registrar o retorno");
    }

    const quantidadeAntes = item.quantidade;
    const quantidadeDepois = quantidadeAntes + quantidadeRetornada;

    await db.itens.update(item.id, {
      quantidade: quantidadeDepois,
      updated_at: new Date(),
    });

    await db.movimentacoes.add({
      item_id: item.id,
      tipo: "RETORNO",
      quantidade_antes: quantidadeAntes,
      quantidade_depois: quantidadeDepois,
      funcionario_id: dados.funcionarioId,
      almoxarife_id: dados.almoxarifeId,
      movimentacao_origem_id: original.id,
      observacao: dados.observacao,
      created_at: new Date(),
    });

    await db.movimentacoes.update(original.id!, { status: "RETORNADO" });
  });
}

export async function listarRetornosPendentes(): Promise<MovimentacaoComItem[]> {
  const pendentes = await db.movimentacoes.where("status").equals("PENDENTE_RETORNO").toArray();
  const comDetalhes = await anexarDetalhes(pendentes);
  return comDetalhes.sort(
    (a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0),
  );
}

export async function contarRetornosPendentes(): Promise<number> {
  return db.movimentacoes.where("status").equals("PENDENTE_RETORNO").count();
}

export async function listarUltimasMovimentacoes(limite = 5): Promise<MovimentacaoComItem[]> {
  const movimentacoes = await db.movimentacoes
    .orderBy("created_at")
    .reverse()
    .limit(limite)
    .toArray();
  return anexarDetalhes(movimentacoes);
}

export async function listarHistorico(filtros: HistoricoFiltros): Promise<MovimentacaoComItem[]> {
  let movimentacoes = await db.movimentacoes.orderBy("created_at").reverse().toArray();

  if (filtros.dataInicial) {
    const inicio = new Date(`${filtros.dataInicial}T00:00:00`);
    movimentacoes = movimentacoes.filter(
      (mov) => mov.created_at !== undefined && mov.created_at >= inicio,
    );
  }
  if (filtros.dataFinal) {
    const fim = new Date(`${filtros.dataFinal}T23:59:59`);
    movimentacoes = movimentacoes.filter(
      (mov) => mov.created_at !== undefined && mov.created_at <= fim,
    );
  }
  if (filtros.tipo && filtros.tipo !== "TODOS") {
    movimentacoes = movimentacoes.filter((mov) => mov.tipo === filtros.tipo);
  }
  if (filtros.status && filtros.status !== "TODOS") {
    movimentacoes = movimentacoes.filter((mov) => mov.status === filtros.status);
  }

  let movimentacoesComDetalhes = await anexarDetalhes(movimentacoes);

  if (filtros.projetoId) {
    movimentacoesComDetalhes = movimentacoesComDetalhes.filter(
      (mov) => mov.projetoId === filtros.projetoId,
    );
  }
  if (filtros.funcionario) {
    const termo = filtros.funcionario.trim().toLowerCase();
    movimentacoesComDetalhes = movimentacoesComDetalhes.filter((mov) =>
      mov.funcionarioNome.toLowerCase().includes(termo),
    );
  }

  return movimentacoesComDetalhes;
}

async function anexarDetalhes(movimentacoes: Movimentacao[]): Promise<MovimentacaoComItem[]> {
  const idsItens = [...new Set(movimentacoes.map((mov) => mov.item_id))];
  const itens = await db.itens.where("id").anyOf(idsItens).toArray();
  const itensPorId = new Map(itens.map((item) => [item.id, item]));

  const idsProjetos = [...new Set(itens.map((item) => item.projeto_id))];
  const projetos = await db.projetos.where("id").anyOf(idsProjetos).toArray();
  const projetosPorId = new Map(projetos.map((projeto) => [projeto.id, projeto]));

  const idsFuncionarios = [
    ...new Set(movimentacoes.flatMap((mov) => [mov.funcionario_id, mov.almoxarife_id])),
  ].filter((id): id is number => id !== undefined && id !== null);
  const funcionariosEnvolvidos =
    idsFuncionarios.length > 0
      ? await db.funcionarios.where("id").anyOf(idsFuncionarios).toArray()
      : [];
  const funcionariosPorId = new Map(funcionariosEnvolvidos.map((f) => [f.id, f]));

  return movimentacoes.map((mov) => {
    const item = itensPorId.get(mov.item_id);
    const projeto = item ? projetosPorId.get(item.projeto_id) : undefined;
    const funcionario = funcionariosPorId.get(mov.funcionario_id);
    const almoxarife = funcionariosPorId.get(mov.almoxarife_id);

    return {
      ...mov,
      itemNome: item?.nome ?? "Item removido",
      projetoId: item?.projeto_id,
      projetoNome: projeto?.nome ?? "—",
      // Registros antigos (anteriores à tabela de funcionários) não têm funcionario_id: caem
      // no fallback do texto de matrícula legado, quando existir.
      funcionarioNome: funcionario ? formatarFuncionario(funcionario) : (mov.matricula_usuario ?? "—"),
      almoxarifeNome: almoxarife ? formatarFuncionario(almoxarife) : "—",
    };
  });
}
