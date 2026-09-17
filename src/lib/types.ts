// src/lib/types.ts
export type { Projeto, Item, Movimentacao, Funcionario, TipoMovimentacao, StatusSaida } from "./db";
import type { Movimentacao, StatusSaida, TipoMovimentacao } from "./db";

export interface MovimentacaoComItem extends Movimentacao {
  itemNome: string;
  projetoId?: number;
  projetoNome: string;
  funcionarioNome: string;
  almoxarifeNome: string;
}

export type TipoMovimentacaoFiltro = "TODOS" | TipoMovimentacao;
export type StatusSaidaFiltro = "TODOS" | StatusSaida;

export interface HistoricoFiltros {
  dataInicial?: string; // formato yyyy-mm-dd
  dataFinal?: string; // formato yyyy-mm-dd
  tipo?: TipoMovimentacaoFiltro;
  status?: StatusSaidaFiltro;
  // Busca por nome ou matrícula do funcionário responsável pela movimentação.
  funcionario?: string;
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
