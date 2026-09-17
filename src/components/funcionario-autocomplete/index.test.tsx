// @vitest-environment jsdom
import { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { criarFuncionarioDeTeste, limparBanco } from "../../test/dbHelpers";
import { renderPage } from "../../test/renderPage";
import { FuncionarioAutocomplete } from "./index";

beforeEach(async () => {
  await limparBanco();
});

// Wrapper simples para exercitar o componente controlado (value/onChange) como ele é usado
// de verdade nas telas de Entrada/Saída/Novo Item/Retornos Pendentes.
function Controlado({ apenasAlmoxarifes = false }: { apenasAlmoxarifes?: boolean }) {
  const [valor, setValor] = useState<number | "">("");
  return (
    <FuncionarioAutocomplete
      label="Matrícula"
      value={valor}
      onChange={setValor}
      apenasAlmoxarifes={apenasAlmoxarifes}
    />
  );
}

describe("FuncionarioAutocomplete", () => {
  it("lista os funcionários formatados como MATRICULA - NOME", async () => {
    await criarFuncionarioDeTeste({ nome: "Arthur Ramos", matricula: "9118339" });
    const usuario = userEvent.setup();

    renderPage(<Controlado />);
    await usuario.click(screen.getByLabelText(/Matrícula/));

    expect(await screen.findByRole("option", { name: "9118339 - Arthur Ramos" })).toBeInTheDocument();
  });

  it("mostra BOLSISTA - NOME quando o funcionário não tem matrícula", async () => {
    await criarFuncionarioDeTeste({ nome: "Ester Beatriz", matricula: undefined });
    const usuario = userEvent.setup();

    renderPage(<Controlado />);
    await usuario.click(screen.getByLabelText(/Matrícula/));

    expect(
      await screen.findByRole("option", { name: "BOLSISTA - Ester Beatriz" }),
    ).toBeInTheDocument();
  });

  it("seleciona uma opção e chama onChange com o id do funcionário", async () => {
    const id = await criarFuncionarioDeTeste({ nome: "Arthur Ramos", matricula: "9118339" });
    const usuario = userEvent.setup();

    renderPage(<Controlado />);
    await usuario.click(screen.getByLabelText(/Matrícula/));
    await usuario.click(await screen.findByRole("option", { name: "9118339 - Arthur Ramos" }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Matrícula/)).toHaveValue("9118339 - Arthur Ramos");
    });
    void id;
  });

  it("filtra só os almoxarifes quando apenasAlmoxarifes é true", async () => {
    await criarFuncionarioDeTeste({ nome: "Comum", matricula: "1111111", eh_almoxarife: false });
    await criarFuncionarioDeTeste({ nome: "Chefe", matricula: "2222222", eh_almoxarife: true });
    const usuario = userEvent.setup();

    renderPage(<Controlado apenasAlmoxarifes />);
    await usuario.click(screen.getByLabelText(/Matrícula/));

    expect(await screen.findByRole("option", { name: "2222222 - Chefe" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "1111111 - Comum" })).not.toBeInTheDocument();
  });

  it("atualiza a lista reativamente quando um funcionário é cadastrado depois (live query)", async () => {
    const usuario = userEvent.setup();
    renderPage(<Controlado />);

    await usuario.click(screen.getByLabelText(/Matrícula/));
    expect(screen.queryByRole("option", { name: /Novo Funcionário/ })).not.toBeInTheDocument();

    await criarFuncionarioDeTeste({ nome: "Novo Funcionário", matricula: "3333333" });

    expect(
      await screen.findByRole("option", { name: "3333333 - Novo Funcionário" }),
    ).toBeInTheDocument();
  });
});
