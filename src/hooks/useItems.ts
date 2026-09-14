// src/hooks/useItems.ts
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import {
  buscarItensPorTermo,
  listarHistorico,
  listarUltimasMovimentacoes,
} from "../lib/repository";
import type {
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
        filtros.matricula,
        filtros.projetoId,
      ],
      [],
    ) ?? []
  );
}
