// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../lib/db";
import { criarFuncionarioDeTeste, limparBanco } from "../test/dbHelpers";
import { renderPage } from "../test/renderPage";
import { registrarEntrada, registrarSaida, resolverIdProjeto } from "../lib/repository";
import { Historico } from "./Historico";

beforeEach(async () => {
  await limparBanco();
});

const localizacaoBase = { organizador: "1", setor: "A", andar: "P1", prateleira: "1" };

async function criarContexto() {
  const projetoId = await resolverIdProjeto({ nome: "Projeto A", isNovo: true });
  const funcionarioId = await criarFuncionarioDeTeste({ nome: "Ana", matricula: "1111111" });
  const almoxarifeId = await criarFuncionarioDeTeste({
    nome: "Chefe",
    matricula: "9999999",
    eh_almoxarife: true,
  });
  return { projetoId, funcionarioId, almoxarifeId };
}

async function abrirSelectEEscolher(
  usuario: ReturnType<typeof userEvent.setup>,
  rotuloCampo: RegExp,
  rotuloOpcao: string,
) {
  await usuario.click(screen.getByLabelText(rotuloCampo));
  await usuario.click(await screen.findByRole("option", { name: rotuloOpcao }));
}

describe("Historico", () => {
  it("mostra a mensagem vazia quando não há movimentações", async () => {
    renderPage(<Historico />);
    const tabela = within(await screen.findByTestId("tabela-tela"));
    expect(await tabela.findByText("Nenhuma movimentação encontrada.")).toBeInTheDocument();
  });

  it("lista uma movimentação com todas as colunas preenchidas corretamente", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await registrarEntrada({
      nomeItem: "Furadeira",
      projetoId,
      quantidade: 3,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });

    renderPage(<Historico />);
    const tabela = within(await screen.findByTestId("tabela-tela"));

    expect(await tabela.findByText("ENTRADA")).toBeInTheDocument();
    expect(tabela.getByText("Furadeira")).toBeInTheDocument();
    expect(tabela.getByText("Projeto A")).toBeInTheDocument();
    expect(tabela.getByText(/1111111 - Ana/)).toBeInTheDocument();
    expect(tabela.getAllByText(/Chefe/).length).toBeGreaterThan(0);
    expect(tabela.getByText(/0 → 3/)).toBeInTheDocument();
  });

  it("mostra o chip de status Pendente Retorno para uma saída com retorno pendente", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
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

    renderPage(<Historico />);
    const tabela = within(await screen.findByTestId("tabela-tela"));
    expect(await tabela.findByText("Pendente Retorno")).toBeInTheDocument();
  });

  it("filtra por tipo", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await registrarEntrada({
      nomeItem: "Item A",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });
    await registrarEntrada({
      nomeItem: "Item B",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });
    await registrarSaida({
      nomeItem: "Item A",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      comRetorno: false,
      ...localizacaoBase,
    });

    const usuario = userEvent.setup();
    renderPage(<Historico />);
    await within(screen.getByTestId("tabela-tela")).findByText("Item B");

    await abrirSelectEEscolher(usuario, /^Tipo/, "Saída");

    const tabela = within(screen.getByTestId("tabela-tela"));
    await waitFor(() => expect(tabela.getAllByRole("row")).toHaveLength(2)); // cabeçalho + 1 linha
    expect(tabela.getByText("SAIDA")).toBeInTheDocument();
  });

  it("filtra por status", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await db.itens.add({
      nome: "Item A",
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
      nomeItem: "Item A",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      comRetorno: false,
      ...localizacaoBase,
    });

    const usuario = userEvent.setup();
    renderPage(<Historico />);
    await waitFor(() =>
      expect(within(screen.getByTestId("tabela-tela")).getAllByText("Item A")).toHaveLength(2),
    );

    await abrirSelectEEscolher(usuario, /^Status/, "Sem Retorno");

    const tabela = within(screen.getByTestId("tabela-tela"));
    await waitFor(() => expect(tabela.getAllByRole("row")).toHaveLength(2));
    expect(tabela.getByText("Sem Retorno")).toBeInTheDocument();
  });

  it("filtra por funcionário (nome ou matrícula)", async () => {
    const projetoId = await resolverIdProjeto({ nome: "Projeto A", isNovo: true });
    const ana = await criarFuncionarioDeTeste({ nome: "Ana", matricula: "1111111" });
    const beto = await criarFuncionarioDeTeste({ nome: "Beto", matricula: "2222222" });
    const almoxarifeId = await criarFuncionarioDeTeste({ nome: "Chefe", eh_almoxarife: true });

    await registrarEntrada({
      nomeItem: "Item A",
      projetoId,
      quantidade: 1,
      funcionarioId: ana,
      almoxarifeId,
      ...localizacaoBase,
    });
    await registrarEntrada({
      nomeItem: "Item B",
      projetoId,
      quantidade: 1,
      funcionarioId: beto,
      almoxarifeId,
      ...localizacaoBase,
    });

    const usuario = userEvent.setup();
    renderPage(<Historico />);
    await within(screen.getByTestId("tabela-tela")).findByText("Item B");

    await usuario.type(screen.getByLabelText(/Funcionário/), "2222222");

    const tabela = within(screen.getByTestId("tabela-tela"));
    await waitFor(() => expect(tabela.queryByText("Item A")).not.toBeInTheDocument());
    expect(tabela.getByText("Item B")).toBeInTheDocument();
  });

  it("filtra por projeto", async () => {
    const { funcionarioId, almoxarifeId } = await criarContexto();
    const projetoB = await resolverIdProjeto({ nome: "Projeto B", isNovo: true });
    await registrarEntrada({
      nomeItem: "Item de A",
      projetoId: await resolverIdProjeto({ nome: "Projeto A", isNovo: false }),
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });
    await registrarEntrada({
      nomeItem: "Item de B",
      projetoId: projetoB,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });

    const usuario = userEvent.setup();
    renderPage(<Historico />);
    await within(screen.getByTestId("tabela-tela")).findByText("Item de B");

    await abrirSelectEEscolher(usuario, /^Projeto/, "Projeto B");

    const tabela = within(screen.getByTestId("tabela-tela"));
    await waitFor(() => expect(tabela.queryByText("Item de A")).not.toBeInTheDocument());
    expect(tabela.getByText("Item de B")).toBeInTheDocument();
  });

  it("filtra por intervalo de datas", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    const itemAntigoId = await db.itens.add({
      nome: "Item Antigo",
      projeto_id: projetoId,
      quantidade: 1,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    await db.movimentacoes.add({
      item_id: itemAntigoId,
      tipo: "ENTRADA",
      quantidade_antes: 0,
      quantidade_depois: 1,
      funcionario_id: funcionarioId,
      almoxarife_id: almoxarifeId,
      created_at: new Date("2025-01-01T10:00:00"),
    });
    await registrarEntrada({
      nomeItem: "Item Recente",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });

    renderPage(<Historico />);
    await within(screen.getByTestId("tabela-tela")).findByText("Item Recente");
    await within(screen.getByTestId("tabela-tela")).findByText("Item Antigo");

    fireEvent.change(screen.getByLabelText(/Data inicial/), { target: { value: "2025-06-01" } });

    const tabela = within(screen.getByTestId("tabela-tela"));
    await waitFor(() => expect(tabela.queryByText("Item Antigo")).not.toBeInTheDocument());
    expect(tabela.getByText("Item Recente")).toBeInTheDocument();
  });

  it("pagina os resultados (10 por página)", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    for (let indice = 0; indice < 12; indice += 1) {
      await registrarEntrada({
        nomeItem: `Item ${indice}`,
        projetoId,
        quantidade: 1,
        funcionarioId,
        almoxarifeId,
        ...localizacaoBase,
      });
    }

    const usuario = userEvent.setup();
    renderPage(<Historico />);

    const tabela = within(screen.getByTestId("tabela-tela"));
    await waitFor(() => expect(tabela.getAllByRole("row")).toHaveLength(11)); // cabeçalho + 10

    await usuario.click(screen.getByRole("button", { name: /Go to page 2/i }));
    await waitFor(() => expect(tabela.getAllByRole("row")).toHaveLength(3)); // cabeçalho + 2
  });

  it("abre já filtrado quando recebe projetoId/status pelo estado de navegação", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    const outroProjetoId = await resolverIdProjeto({ nome: "Projeto B", isNovo: true });
    await db.itens.add({
      nome: "Item Pendente",
      projeto_id: projetoId,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    await registrarSaida({
      nomeItem: "Item Pendente",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      comRetorno: true,
      ...localizacaoBase,
    });
    await registrarEntrada({
      nomeItem: "Item de Outro Projeto",
      projetoId: outroProjetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });

    renderPage(<Historico />, { estadoRota: { projetoId, status: "PENDENTE_RETORNO" } });

    const tabela = within(await screen.findByTestId("tabela-tela"));
    expect(await tabela.findByText("Item Pendente")).toBeInTheDocument();
    expect(tabela.queryByText("Item de Outro Projeto")).not.toBeInTheDocument();
  });

  it('o botão "Baixar PDF" aciona window.print()', async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    const usuario = userEvent.setup();
    renderPage(<Historico />);

    await usuario.click(screen.getByRole("button", { name: /Baixar PDF/ }));
    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });

  it('o botão "voltar" navega para a Dashboard', async () => {
    const usuario = userEvent.setup();
    renderPage(<Historico />, {
      rotasExtras: { "/": <div>Tela da Dashboard</div> },
    });

    await usuario.click(screen.getByRole("button", { name: /voltar/i }));
    expect(await screen.findByText("Tela da Dashboard")).toBeInTheDocument();
  });
});
