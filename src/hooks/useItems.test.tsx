// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../lib/db";
import { criarFuncionarioDeTeste, limparBanco } from "../test/dbHelpers";
import {
  useContagemRetornosPendentes,
  useFuncionarios,
  useHistorico,
  useItensPorProjeto,
  useNomesItensDoProjeto,
  useProjetos,
  useQuantidadesPendentesPorProjeto,
  useRetornosPendentes,
  useUltimasMovimentacoes,
} from "./useItems";
import { registrarSaida } from "../lib/repository";

beforeEach(async () => {
  await limparBanco();
});

async function criarItemDeTeste(
  projetoId: number,
  sobrescreve: Partial<{
    nome: string;
    quantidade: number;
  }> = {},
) {
  return db.itens.add({
    nome: sobrescreve.nome ?? "Item",
    projeto_id: projetoId,
    quantidade: sobrescreve.quantidade ?? 1,
    prateleira: "1",
    piso_andar: "P1",
    local_setor: "A",
    organizador: "1",
  });
}

describe("useProjetos", () => {
  it("retorna lista vazia quando não há projetos", async () => {
    const { result } = renderHook(() => useProjetos());
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it("retorna os projetos ordenados por nome", async () => {
    await db.projetos.bulkAdd([{ nome: "Zeta" }, { nome: "Alfa" }, { nome: "Beta" }]);

    const { result } = renderHook(() => useProjetos());

    await waitFor(() => {
      expect(result.current.map((p) => p.nome)).toEqual(["Alfa", "Beta", "Zeta"]);
    });
  });

  it("atualiza automaticamente quando um projeto é adicionado depois (live query)", async () => {
    const { result } = renderHook(() => useProjetos());
    await waitFor(() => expect(result.current).toEqual([]));

    await act(async () => {
      await db.projetos.add({ nome: "Novo Projeto" });
    });

    await waitFor(() => {
      expect(result.current.map((p) => p.nome)).toEqual(["Novo Projeto"]);
    });
  });
});

describe("useItensPorProjeto", () => {
  it('retorna lista vazia quando projetoId é ""', async () => {
    const { result } = renderHook(() => useItensPorProjeto("", ""));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it("retorna apenas os itens do projeto informado", async () => {
    const projetoA = await db.projetos.add({ nome: "Projeto A" });
    const projetoB = await db.projetos.add({ nome: "Projeto B" });
    await criarItemDeTeste(projetoA, { nome: "Item A" });
    await criarItemDeTeste(projetoB, { nome: "Item B" });

    const { result } = renderHook(() => useItensPorProjeto(projetoA, ""));

    await waitFor(() => {
      expect(result.current.map((i) => i.nome)).toEqual(["Item A"]);
    });
  });

  it("filtra pelo termo de busca", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    await criarItemDeTeste(projetoId, { nome: "Parafuso M8" });
    await criarItemDeTeste(projetoId, { nome: "Porca M8" });

    const { result } = renderHook(() => useItensPorProjeto(projetoId, "parafuso"));

    await waitFor(() => {
      expect(result.current.map((i) => i.nome)).toEqual(["Parafuso M8"]);
    });
  });

  it("atualiza quando um novo item é adicionado ao projeto (live query)", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    const { result } = renderHook(() => useItensPorProjeto(projetoId, ""));
    await waitFor(() => expect(result.current).toEqual([]));

    await act(async () => {
      await criarItemDeTeste(projetoId, { nome: "Item Novo" });
    });

    await waitFor(() => {
      expect(result.current.map((i) => i.nome)).toEqual(["Item Novo"]);
    });
  });
});

describe("useNomesItensDoProjeto", () => {
  it("retorna lista vazia quando projetoId é null", async () => {
    const { result } = renderHook(() => useNomesItensDoProjeto(null));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it("retorna só os nomes dos itens do projeto", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    await criarItemDeTeste(projetoId, { nome: "Parafuso" });
    await criarItemDeTeste(projetoId, { nome: "Porca" });

    const { result } = renderHook(() => useNomesItensDoProjeto(projetoId));

    await waitFor(() => {
      expect(result.current.sort()).toEqual(["Parafuso", "Porca"]);
    });
  });
});

describe("useFuncionarios", () => {
  it("retorna todos os funcionários ordenados por nome", async () => {
    await criarFuncionarioDeTeste({ nome: "Zeca" });
    await criarFuncionarioDeTeste({ nome: "Ana" });

    const { result } = renderHook(() => useFuncionarios());

    await waitFor(() => {
      expect(result.current.map((f) => f.nome)).toEqual(["Ana", "Zeca"]);
    });
  });

  it("filtra só os almoxarifes quando apenasAlmoxarifes é true", async () => {
    await criarFuncionarioDeTeste({ nome: "Comum", eh_almoxarife: false });
    await criarFuncionarioDeTeste({ nome: "Chefe", eh_almoxarife: true });

    const { result } = renderHook(() => useFuncionarios(true));

    await waitFor(() => {
      expect(result.current.map((f) => f.nome)).toEqual(["Chefe"]);
    });
  });
});

describe("useUltimasMovimentacoes", () => {
  it("respeita o limite e retorna as mais recentes primeiro", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    const itemId = await criarItemDeTeste(projetoId);
    const funcionarioId = await criarFuncionarioDeTeste();

    await db.movimentacoes.bulkAdd(
      Array.from({ length: 3 }, (_, indice) => ({
        item_id: itemId,
        tipo: "ENTRADA" as const,
        quantidade_antes: indice,
        quantidade_depois: indice + 1,
        funcionario_id: funcionarioId,
        almoxarife_id: funcionarioId,
        created_at: new Date(2026, 0, indice + 1),
      })),
    );

    const { result } = renderHook(() => useUltimasMovimentacoes(2));

    await waitFor(() => {
      expect(result.current).toHaveLength(2);
      expect(result.current[0].quantidade_depois).toBe(3);
      expect(result.current[0].itemNome).toBe("Item");
    });
  });
});

describe("useHistorico", () => {
  it("retorna as movimentações que atendem aos filtros informados", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    const itemId = await criarItemDeTeste(projetoId);
    const funcionarioId = await criarFuncionarioDeTeste({ nome: "Fulano" });

    await db.movimentacoes.bulkAdd([
      {
        item_id: itemId,
        tipo: "ENTRADA",
        quantidade_antes: 0,
        quantidade_depois: 1,
        funcionario_id: funcionarioId,
        almoxarife_id: funcionarioId,
        created_at: new Date(2026, 0, 1),
      },
      {
        item_id: itemId,
        tipo: "SAIDA",
        quantidade_antes: 1,
        quantidade_depois: 0,
        funcionario_id: funcionarioId,
        almoxarife_id: funcionarioId,
        status: "SEM_RETORNO",
        created_at: new Date(2026, 0, 2),
      },
    ]);

    const { result } = renderHook(() => useHistorico({ tipo: "SAIDA" }));

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
      expect(result.current[0].tipo).toBe("SAIDA");
    });
  });

  it("reconsulta quando os filtros mudam", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    const itemId = await criarItemDeTeste(projetoId);
    const funcionarioId = await criarFuncionarioDeTeste();

    await db.movimentacoes.bulkAdd([
      {
        item_id: itemId,
        tipo: "ENTRADA",
        quantidade_antes: 0,
        quantidade_depois: 1,
        funcionario_id: funcionarioId,
        almoxarife_id: funcionarioId,
        created_at: new Date(2026, 0, 1),
      },
      {
        item_id: itemId,
        tipo: "SAIDA",
        quantidade_antes: 1,
        quantidade_depois: 0,
        funcionario_id: funcionarioId,
        almoxarife_id: funcionarioId,
        status: "SEM_RETORNO",
        created_at: new Date(2026, 0, 2),
      },
    ]);

    const { result, rerender } = renderHook(
      (filtros: { tipo: "ENTRADA" | "SAIDA" }) => useHistorico(filtros),
      { initialProps: { tipo: "ENTRADA" } },
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
      expect(result.current[0].tipo).toBe("ENTRADA");
    });

    rerender({ tipo: "SAIDA" });

    await waitFor(() => {
      expect(result.current).toHaveLength(1);
      expect(result.current[0].tipo).toBe("SAIDA");
    });
  });
});

describe("useQuantidadesPendentesPorProjeto / useRetornosPendentes / useContagemRetornosPendentes", () => {
  it("refletem uma saída com retorno pendente e zeram depois do retorno registrado", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    const itemId = await criarItemDeTeste(projetoId, { quantidade: 3 });
    const funcionarioId = await criarFuncionarioDeTeste({ nome: "Fulano" });
    const almoxarifeId = await criarFuncionarioDeTeste({ nome: "Chefe", eh_almoxarife: true });

    const mapa = renderHook(() => useQuantidadesPendentesPorProjeto(projetoId));
    const pendentes = renderHook(() => useRetornosPendentes());
    const contagem = renderHook(() => useContagemRetornosPendentes());

    await waitFor(() => expect(contagem.result.current).toBe(0));

    await act(async () => {
      await registrarSaida({
        nomeItem: "Item",
        projetoId,
        quantidade: 2,
        funcionarioId,
        almoxarifeId,
        comRetorno: true,
        organizador: "1",
        setor: "A",
        andar: "P1",
        prateleira: "1",
      });
    });

    await waitFor(() => {
      expect(mapa.result.current.get(itemId)).toBe(2);
      expect(pendentes.result.current).toHaveLength(1);
      expect(contagem.result.current).toBe(1);
    });
  });
});
