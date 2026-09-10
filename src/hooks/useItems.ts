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

export function useSetores(): Projeto[] {
  return (
    useLiveQuery(() => db.projetos.orderBy("nome").toArray(), [], []) ?? []
  );
}

export function useItensPorSetor(setorId: number | "", termo: string): Item[] {
  return (
    useLiveQuery(
      async () => {
        if (setorId === "") return [];
        return buscarItensPorTermo(setorId, termo);
      },
      [setorId, termo],
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
