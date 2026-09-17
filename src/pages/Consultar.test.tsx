// @vitest-environment jsdom
import { useLocation } from "react-router-dom";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../lib/db";
import { criarFuncionarioDeTeste, limparBanco } from "../test/dbHelpers";
import { renderPage } from "../test/renderPage";
import { registrarSaida, resolverIdProjeto } from "../lib/repository";
import { Consultar } from "./Consultar";

beforeEach(async () => {
  await limparBanco();
});

const localizacaoBase = { organizador: "1", setor: "A", andar: "P1", prateleira: "1" };

async function selecionarProjeto(usuario: ReturnType<typeof userEvent.setup>, nome: string) {
  await usuario.click(screen.getByLabelText(/Projeto/));
  await usuario.click(await screen.findByRole("option", { name: nome }));
}

// Componente auxiliar para inspecionar o `state` de navegação recebido pela rota "/historico"
// (usado pelo teste do botão "pendente de retorno" navegando com filtros pré-aplicados).
function HistoricoFalso() {
  const location = useLocation();
  return <div>Histórico recebeu: {JSON.stringify(location.state)}</div>;
}

describe("Consultar", () => {
  it('mostra "Selecione um projeto para consultar" quando nenhum projeto está selecionado', async () => {
    renderPage(<Consultar />);
    expect(
      await screen.findByText("Selecione um projeto para consultar"),
    ).toBeInTheDocument();
  });

  it("lista os itens do projeto selecionado com todos os campos", async () => {
    const projetoId = await resolverIdProjeto({ nome: "CEMIG", isNovo: true });
    await db.itens.add({
      nome: "Furadeira",
      projeto_id: projetoId,
      quantidade: 7,
      prateleira: "3",
      piso_andar: "P2",
      local_setor: "B",
      organizador: "42",
    });

    const usuario = userEvent.setup();
    renderPage(<Consultar />);
    await selecionarProjeto(usuario, "CEMIG");

    const grid = within(await screen.findByTestId("grid-tela"));
    expect(grid.getByText("Furadeira")).toBeInTheDocument();
    expect(grid.getByText("7 unid.")).toBeInTheDocument();
    expect(grid.getByText("3")).toBeInTheDocument();
    expect(grid.getByText("P2")).toBeInTheDocument();
    expect(grid.getByText("B")).toBeInTheDocument();
    expect(grid.getByText("42")).toBeInTheDocument();
  });

  it('mostra "Nenhum item encontrado" quando a busca não bate com nada', async () => {
    const projetoId = await resolverIdProjeto({ nome: "CEMIG", isNovo: true });
    await db.itens.add({
      nome: "Furadeira",
      projeto_id: projetoId,
      quantidade: 7,
      prateleira: "3",
      piso_andar: "P2",
      local_setor: "B",
      organizador: "42",
    });

    const usuario = userEvent.setup();
    renderPage(<Consultar />);
    await selecionarProjeto(usuario, "CEMIG");
    await usuario.type(screen.getByLabelText(/Buscar item/), "não existe");

    expect(await screen.findByText("Nenhum item encontrado.")).toBeInTheDocument();
  });

  it("a busca filtra a grade da tela, mas o extrato de impressão sempre mostra todos os itens", async () => {
    const projetoId = await resolverIdProjeto({ nome: "CEMIG", isNovo: true });
    await db.itens.add({
      nome: "Furadeira",
      projeto_id: projetoId,
      quantidade: 1,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    await db.itens.add({
      nome: "Parafuso",
      projeto_id: projetoId,
      quantidade: 1,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    const usuario = userEvent.setup();
    renderPage(<Consultar />);
    await selecionarProjeto(usuario, "CEMIG");
    await usuario.type(screen.getByLabelText(/Buscar item/), "Furadeira");

    const grid = within(await screen.findByTestId("grid-tela"));
    expect(grid.getByText("Furadeira")).toBeInTheDocument();
    expect(grid.queryByText("Parafuso")).not.toBeInTheDocument();

    const impressao = within(screen.getByTestId("grid-impressao"));
    expect(impressao.getByText("Furadeira")).toBeInTheDocument();
    expect(impressao.getByText("Parafuso")).toBeInTheDocument();
  });

  it("mostra o indicador de pendente de retorno mesmo com estoque disponível", async () => {
    const projetoId = await resolverIdProjeto({ nome: "CEMIG", isNovo: true });
    const funcionarioId = await criarFuncionarioDeTeste({ nome: "Fulano", matricula: "1111111" });
    const almoxarifeId = await criarFuncionarioDeTeste({ nome: "Chefe", eh_almoxarife: true });
    await db.itens.add({
      nome: "Furadeira",
      projeto_id: projetoId,
      quantidade: 10,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    await registrarSaida({
      nomeItem: "Furadeira",
      projetoId,
      quantidade: 2,
      funcionarioId,
      almoxarifeId,
      comRetorno: true,
      ...localizacaoBase,
    });

    const usuario = userEvent.setup();
    renderPage(<Consultar />);
    await selecionarProjeto(usuario, "CEMIG");

    const grid = within(await screen.findByTestId("grid-tela"));
    expect(grid.getByText("8 unid.")).toBeInTheDocument();
    expect(grid.getByRole("button", { name: "2 pendente(s) de retorno" })).toBeInTheDocument();
  });

  it("clicar no indicador de pendente navega para /historico já filtrado por projeto e status", async () => {
    const projetoId = await resolverIdProjeto({ nome: "CEMIG", isNovo: true });
    const funcionarioId = await criarFuncionarioDeTeste({ nome: "Fulano", matricula: "1111111" });
    const almoxarifeId = await criarFuncionarioDeTeste({ nome: "Chefe", eh_almoxarife: true });
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
    renderPage(<Consultar />, {
      rotasExtras: { "/historico": <HistoricoFalso /> },
    });
    await selecionarProjeto(usuario, "CEMIG");

    const grid = within(await screen.findByTestId("grid-tela"));
    const botaoPendente = grid.getByRole("button", { name: "1 pendente(s) de retorno" });
    await usuario.click(botaoPendente);

    const textoEsperado = `Histórico recebeu: ${JSON.stringify({
      projetoId,
      status: "PENDENTE_RETORNO",
    })}`;
    expect(await screen.findByText(textoEsperado)).toBeInTheDocument();
  });

  it('o botão "Baixar Extrato (PDF)" fica desabilitado sem projeto e aciona window.print() quando habilitado', async () => {
    const projetoId = await resolverIdProjeto({ nome: "CEMIG", isNovo: true });
    void projetoId;
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    const usuario = userEvent.setup();
    renderPage(<Consultar />);

    expect(screen.getByRole("button", { name: /Baixar Extrato/ })).toBeDisabled();

    await selecionarProjeto(usuario, "CEMIG");
    const botaoPdf = screen.getByRole("button", { name: /Baixar Extrato/ });
    expect(botaoPdf).toBeEnabled();

    await usuario.click(botaoPdf);
    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });

  it('o botão "voltar" navega para a Dashboard', async () => {
    const usuario = userEvent.setup();
    renderPage(<Consultar />, {
      rotasExtras: { "/": <div>Tela da Dashboard</div> },
    });

    await usuario.click(screen.getByRole("button", { name: /voltar/i }));
    expect(await screen.findByText("Tela da Dashboard")).toBeInTheDocument();
  });
});
