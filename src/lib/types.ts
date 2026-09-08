// src/lib/types.ts
export type { Setor, Item, Movimentacao } from "./db";
import type { Movimentacao } from "./db";

export interface MovimentacaoComItem extends Movimentacao {
  itemNome: string;
}

export type TipoMovimentacaoFiltro = "TODOS" | "ENTRADA" | "SAIDA";

export interface HistoricoFiltros {
  dataInicial?: string; // formato yyyy-mm-dd
  dataFinal?: string; // formato yyyy-mm-dd
  tipo?: TipoMovimentacaoFiltro;
  matricula?: string;
}
