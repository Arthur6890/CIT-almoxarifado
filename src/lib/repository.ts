// src/lib/repository.ts
import { db, type Item, type Movimentacao, type Setor } from "./db";
import type { HistoricoFiltros, MovimentacaoComItem } from "./types";

// ----------------- Setores -----------------

export async function listarSetores(): Promise<Setor[]> {
  return db.setores.orderBy("nome").toArray();
}

// ----------------- Itens -----------------

export async function listarItensPorSetor(setorId: number): Promise<Item[]> {
  return db.itens.where("setor_id").equals(setorId).toArray();
}

export async function buscarItensPorTermo(setorId: number, termo: string): Promise<Item[]> {
  const itens = await listarItensPorSetor(setorId);
  const termoNormalizado = termo.trim().toLowerCase();
  if (!termoNormalizado) return itens;
  return itens.filter((item) => item.nome.toLowerCase().includes(termoNormalizado));
}

// Busca um item pelo nome exato (case insensitive), usado nas telas de entrada/saída
export async function buscarItemPorNome(nome: string): Promise<Item | undefined> {
  const nomeNormalizado = nome.trim().toLowerCase();
  if (!nomeNormalizado) return undefined;
  const itens = await db.itens.toArray();
  return itens.find((item) => item.nome.trim().toLowerCase() === nomeNormalizado);
}

// ----------------- Movimentações -----------------

export async function registrarEntrada(
  nomeItem: string,
  matricula: string,
  observacao?: string,
): Promise<number> {
  const item = await buscarItemPorNome(nomeItem);
  if (!item || item.id === undefined) {
    throw new Error("Item não encontrado");
  }

  const quantidadeAntes = item.quantidade;
  const quantidadeDepois = quantidadeAntes + 1;

  await db.transaction("rw", db.itens, db.movimentacoes, async () => {
    await db.itens.update(item.id!, { quantidade: quantidadeDepois, updated_at: new Date() });
    await db.movimentacoes.add({
      item_id: item.id!,
      tipo: "ENTRADA",
      quantidade_antes: quantidadeAntes,
      quantidade_depois: quantidadeDepois,
      matricula_usuario: matricula,
      observacao,
      created_at: new Date(),
    });
  });

  return quantidadeDepois;
}

export async function registrarSaida(
  nomeItem: string,
  matricula: string,
  observacao?: string,
): Promise<number> {
  const item = await buscarItemPorNome(nomeItem);
  if (!item || item.id === undefined) {
    throw new Error("Item não encontrado");
  }
  if (item.quantidade <= 0) {
    throw new Error("Item sem estoque disponível");
  }

  const quantidadeAntes = item.quantidade;
  const quantidadeDepois = quantidadeAntes - 1;

  await db.transaction("rw", db.itens, db.movimentacoes, async () => {
    await db.itens.update(item.id!, { quantidade: quantidadeDepois, updated_at: new Date() });
    await db.movimentacoes.add({
      item_id: item.id!,
      tipo: "SAIDA",
      quantidade_antes: quantidadeAntes,
      quantidade_depois: quantidadeDepois,
      matricula_usuario: matricula,
      observacao,
      created_at: new Date(),
    });
  });

  return quantidadeDepois;
}

export async function listarUltimasMovimentacoes(limite = 5): Promise<MovimentacaoComItem[]> {
  const movimentacoes = await db.movimentacoes.orderBy("created_at").reverse().limit(limite).toArray();
  return anexarNomeItem(movimentacoes);
}

export async function listarHistorico(filtros: HistoricoFiltros): Promise<MovimentacaoComItem[]> {
  let movimentacoes = await db.movimentacoes.orderBy("created_at").reverse().toArray();

  if (filtros.dataInicial) {
    const inicio = new Date(`${filtros.dataInicial}T00:00:00`);
    movimentacoes = movimentacoes.filter((mov) => mov.created_at !== undefined && mov.created_at >= inicio);
  }
  if (filtros.dataFinal) {
    const fim = new Date(`${filtros.dataFinal}T23:59:59`);
    movimentacoes = movimentacoes.filter((mov) => mov.created_at !== undefined && mov.created_at <= fim);
  }
  if (filtros.tipo && filtros.tipo !== "TODOS") {
    movimentacoes = movimentacoes.filter((mov) => mov.tipo === filtros.tipo);
  }
  if (filtros.matricula) {
    const termo = filtros.matricula.trim().toLowerCase();
    movimentacoes = movimentacoes.filter((mov) => mov.matricula_usuario.toLowerCase().includes(termo));
  }

  return anexarNomeItem(movimentacoes);
}

async function anexarNomeItem(movimentacoes: Movimentacao[]): Promise<MovimentacaoComItem[]> {
  const idsItens = [...new Set(movimentacoes.map((mov) => mov.item_id))];
  const itens = await db.itens.where("id").anyOf(idsItens).toArray();
  const itensPorId = new Map(itens.map((item) => [item.id, item]));

  return movimentacoes.map((mov) => ({
    ...mov,
    itemNome: itensPorId.get(mov.item_id)?.nome ?? "Item removido",
  }));
}
