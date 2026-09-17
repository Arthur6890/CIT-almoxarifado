// src/hooks/useItems.ts
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import {
  buscarItensPorTermo,
  contarRetornosPendentes,
  listarHistorico,
  listarRetornosPendentes,
  listarUltimasMovimentacoes,
  quantidadesPendentesPorProjeto,
} from "../lib/repository";
import type {
  Funcionario,
  HistoricoFiltros,
  Item,
  MovimentacaoComItem,
  Projeto,
} from "../lib/types";

export function useProjetos(): Projeto[] {
  return (
    useLiveQuery(() => db.projetos.orderBy("nome").toArray(), [], []) ?? []
  );
}

export function useItensPorProjeto(
  projetoId: number | "",
  termo: string,
): Item[] {
  return (
    useLiveQuery(
      async () => {
        if (projetoId === "") return [];
        return buscarItensPorTermo(projetoId, termo);
      },
      [projetoId, termo],
      [],
    ) ?? []
  );
}

// Nomes dos itens já cadastrados em um projeto, usado para alimentar o Autocomplete
// de "Nome do item" nas telas de Entrada, Saída e Novo Item.
export function useNomesItensDoProjeto(projetoId: number | null): string[] {
  const itens = useItensPorProjeto(projetoId ?? "", "");
  return itens.map((item) => item.nome);
}

// Quantidade pendente de retorno por item (item_id -> quantidade), para o projeto selecionado.
// Usado em Consultar para mostrar "X pendente(s) de retorno" no card de cada item.
export function useQuantidadesPendentesPorProjeto(
  projetoId: number | "",
): Map<number, number> {
  return (
    useLiveQuery(
      async () => {
        if (projetoId === "") return new Map<number, number>();
        return quantidadesPendentesPorProjeto(projetoId);
      },
      [projetoId],
      new Map<number, number>(),
    ) ?? new Map<number, number>()
  );
}

export function useFuncionarios(apenasAlmoxarifes = false): Funcionario[] {
  return (
    useLiveQuery(
      async () => {
        const todos = await db.funcionarios.orderBy("nome").toArray();
        return apenasAlmoxarifes ? todos.filter((f) => f.eh_almoxarife) : todos;
      },
      [apenasAlmoxarifes],
      [],
    ) ?? []
  );
}

export function useUltimasMovimentacoes(limite = 5): MovimentacaoComItem[] {
  return (
    useLiveQuery(() => listarUltimasMovimentacoes(limite), [limite], []) ?? []
  );
}

export function useHistorico(filtros: HistoricoFiltros): MovimentacaoComItem[] {
  return (
    useLiveQuery(
      () => listarHistorico(filtros),
      [
        filtros.dataInicial,
        filtros.dataFinal,
        filtros.tipo,
        filtros.status,
        filtros.funcionario,
        filtros.projetoId,
      ],
      [],
    ) ?? []
  );
}

export function useRetornosPendentes(): MovimentacaoComItem[] {
  return useLiveQuery(() => listarRetornosPendentes(), [], []) ?? [];
}

export function useContagemRetornosPendentes(): number {
  return useLiveQuery(() => contarRetornosPendentes(), [], 0) ?? 0;
}
