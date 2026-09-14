// src/lib/types.ts
export type { Projeto, Item, Movimentacao } from "./db";
import type { Movimentacao } from "./db";

export interface MovimentacaoComItem extends Movimentacao {
  itemNome: string;
  projetoId?: number;
  projetoNome: string;
}

export type TipoMovimentacaoFiltro = "TODOS" | "ENTRADA" | "SAIDA";

export interface HistoricoFiltros {
  dataInicial?: string; // formato yyyy-mm-dd
  dataFinal?: string; // formato yyyy-mm-dd
  tipo?: TipoMovimentacaoFiltro;
  matricula?: string;
  projetoId?: number | "";
}

// Representa a seleção feita nos campos de Autocomplete de Projeto/Item:
// quando `isNovo` é true, `nome` ainda não existe no banco e será criado ao confirmar o formulário.
export interface SelecaoComOpcaoNova {
  nome: string;
  isNovo: boolean;
}

export interface LocalizacaoItem {
  organizador: string;
  setor: string;
  andar: string;
  prateleira: string;
}
