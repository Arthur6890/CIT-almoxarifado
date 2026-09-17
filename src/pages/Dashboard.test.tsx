// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../lib/db";
import { criarFuncionarioDeTeste, limparBanco } from "../test/dbHelpers";
import { renderPage } from "../test/renderPage";
import { registrarEntrada, registrarSaida, resolverIdProjeto } from "../lib/repository";
import { Dashboard } from "./Dashboard";

beforeEach(async () => {
  await limparBanco();
});

const localizacaoBase = { organizador: "1", setor: "A", andar: "P1", prateleira: "1" };

describe("Dashboard", () => {
  it("mostra a mensagem vazia quando não há movimentações", async () => {
    renderPage(<Dashboard />);
    expect(
      await screen.findByText("Nenhuma movimentação registrada ainda."),
    ).toBeInTheDocument();
  });

  it("não mostra o alerta de pendências quando não há retornos pendentes", async () => {
    renderPage(<Dashboard />);
    await screen.findByText("Almoxarifado");
    expect(screen.queryByText(/pendente de retorno/)).not.toBeInTheDocument();
  });

  it("lista a última movimentação com item, projeto, funcionário e quantidade", async () => {
    const projetoId = await resolverIdProjeto({ nome: "Projeto X", isNovo: true });
    const funcionarioId = await criarFuncionarioDeTeste({ nome: "Arthur Ramos", matricula: "9118339" });
    const almoxarifeId = await criarFuncionarioDeTeste({ nome: "Marlon", eh_almoxarife: true });

    await registrarEntrada({
      nomeItem: "Furadeira",
      projetoId,
      quantidade: 3,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });

    renderPage(<Dashboard />);

    expect(await screen.findByText("Furadeira")).toBeInTheDocument();
    expect(screen.getByText("(Projeto X)")).toBeInTheDocument();
    expect(screen.getByText(/9118339 - Arthur Ramos/)).toBeInTheDocument();
    expect(screen.getByText(/0 → 3/)).toBeInTheDocument();
    expect(screen.getByText("ENTRADA")).toBeInTheDocument();
  });

  it("mostra o alerta de retorno pendente (singular) e navega para /retornos-pendentes ao clicar", async () => {
    const projetoId = await resolverIdProjeto({ nome: "Projeto X", isNovo: true });
    const funcionarioId = await criarFuncionarioDeTeste({ nome: "Arthur Ramos", matricula: "9118339" });
    const almoxarifeId = await criarFuncionarioDeTeste({ nome: "Marlon", eh_almoxarife: true });
    await db.itens.add({
      nome: "Furadeira",
      projeto_id: projetoId,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    await registrarSaida({
      nomeItem: "Furadeira",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      comRetorno: true,
      ...localizacaoBase,
    });

    const usuario = userEvent.setup();
    renderPage(<Dashboard />, {
      rotasExtras: { "/retornos-pendentes": <div>Tela de Retornos Pendentes</div> },
    });

    const alerta = await screen.findByText("1 item pendente de retorno");
    await usuario.click(alerta);

    expect(await screen.findByText("Tela de Retornos Pendentes")).toBeInTheDocument();
  });

  it("mostra o alerta no plural quando há mais de um retorno pendente", async () => {
    const projetoId = await resolverIdProjeto({ nome: "Projeto X", isNovo: true });
    const funcionarioId = await criarFuncionarioDeTeste({ nome: "Arthur Ramos", matricula: "9118339" });
    const almoxarifeId = await criarFuncionarioDeTeste({ nome: "Marlon", eh_almoxarife: true });
    await db.itens.add({
      nome: "Item A",
      projeto_id: projetoId,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    await db.itens.add({
      nome: "Item B",
      projeto_id: projetoId,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    await registrarSaida({
      nomeItem: "Item A",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      comRetorno: true,
      ...localizacaoBase,
    });
    await registrarSaida({
      nomeItem: "Item B",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      comRetorno: true,
      ...localizacaoBase,
    });

    renderPage(<Dashboard />);
    expect(await screen.findByText("2 itens pendentes de retorno")).toBeInTheDocument();
  });

  it("navega para /consultar ao clicar em Consultar Itens", async () => {
    const usuario = userEvent.setup();
    renderPage(<Dashboard />, {
      rotasExtras: { "/consultar": <div>Tela de Consultar</div> },
    });

    await usuario.click(screen.getByRole("button", { name: /Consultar Itens/ }));
    expect(await screen.findByText("Tela de Consultar")).toBeInTheDocument();
  });

  it("navega para /funcionarios ao clicar em Funcionários", async () => {
    const usuario = userEvent.setup();
    renderPage(<Dashboard />, {
      rotasExtras: { "/funcionarios": <div>Tela de Funcionários</div> },
    });

    await usuario.click(screen.getByRole("button", { name: /Funcionários/ }));
    expect(await screen.findByText("Tela de Funcionários")).toBeInTheDocument();
  });
});
