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

export function useUltimasMovimentacoes(limite = 5): MovimentacaoComItem[] {
  return (
    useLiveQuery(() => listarUltimasMovimentacoes(limite), [limite], []) ?? []
  );
}

export function useHistorico(filtros: HistoricoFiltros): MovimentacaoComItem[] {
  return (
    useLiveQuery(
      () => listarHistorico(filtros),
      [filtros.dataInicial, filtros.dataFinal, filtros.tipo, filtros.matricula],
      [],
    ) ?? []
  );
}
