import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { criarFuncionarioDeTeste, limparBanco } from "../test/dbHelpers";
import {
  atualizarFuncionario,
  buscarItemPorNomeEProjeto,
  contarRetornosPendentes,
  criarFuncionario,
  criarItem,
  criarOuObterProjeto,
  formatarFuncionario,
  listarAlmoxarifes,
  listarFuncionarios,
  listarHistorico,
  listarRetornosPendentes,
  listarUltimasMovimentacoes,
  quantidadesPendentesPorProjeto,
  registrarEntrada,
  registrarRetorno,
  registrarSaida,
  removerFuncionario,
  resolverIdProjeto,
} from "./repository";

beforeEach(async () => {
  await limparBanco();
});

const localizacaoBase = {
  organizador: "12",
  setor: "A",
  andar: "P1",
  prateleira: "5",
};

async function criarContexto() {
  const projetoId = await db.projetos.add({ nome: "Projeto" });
  const funcionarioId = await criarFuncionarioDeTeste({
    nome: "Funcionário Um",
    matricula: "1111111",
  });
  const almoxarifeId = await criarFuncionarioDeTeste({
    nome: "Almoxarife Um",
    matricula: "2222222",
    eh_almoxarife: true,
  });
  return { projetoId, funcionarioId, almoxarifeId };
}

describe("criarOuObterProjeto", () => {
  it("cria um novo projeto quando não existe nenhum com esse nome", async () => {
    const projeto = await criarOuObterProjeto("Projeto Novo");
    expect(projeto.nome).toBe("Projeto Novo");
    expect(projeto.id).toBeDefined();

    const todos = await db.projetos.toArray();
    expect(todos).toHaveLength(1);
  });

  it("retorna o projeto existente ao invés de criar um duplicado (case insensitive)", async () => {
    const criado = await criarOuObterProjeto("Mada");
    const reobtido = await criarOuObterProjeto("MADA");

    expect(reobtido.id).toBe(criado.id);
    const todos = await db.projetos.toArray();
    expect(todos).toHaveLength(1);
  });

  it("remove espaços em branco do nome", async () => {
    const projeto = await criarOuObterProjeto("  Projeto Com Espaço  ");
    expect(projeto.nome).toBe("Projeto Com Espaço");
  });

  it("rejeita nome vazio ou só com espaços", async () => {
    await expect(criarOuObterProjeto("")).rejects.toThrow(
      "Nome do projeto é obrigatório",
    );
    await expect(criarOuObterProjeto("   ")).rejects.toThrow(
      "Nome do projeto é obrigatório",
    );
  });
});

describe("resolverIdProjeto", () => {
  it("cria o projeto e retorna o id quando isNovo é true", async () => {
    const id = await resolverIdProjeto({ nome: "Projeto X", isNovo: true });
    const projeto = await db.projetos.get(id);
    expect(projeto?.nome).toBe("Projeto X");
  });

  it("reaproveita um projeto existente quando isNovo é true mas o nome já existe", async () => {
    const idOriginal = await db.projetos.add({ nome: "Existente" });
    const id = await resolverIdProjeto({ nome: "existente", isNovo: true });
    expect(id).toBe(idOriginal);
  });

  it("retorna o id de um projeto existente quando isNovo é false", async () => {
    const idOriginal = await db.projetos.add({ nome: "Projeto Y" });
    const id = await resolverIdProjeto({ nome: "Projeto Y", isNovo: false });
    expect(id).toBe(idOriginal);
  });

  it("lança erro quando isNovo é false e o projeto não existe", async () => {
    await expect(
      resolverIdProjeto({ nome: "Não Existe", isNovo: false }),
    ).rejects.toThrow("Projeto inválido");
  });
});

describe("Funcionários", () => {
  it("cria um funcionário com matrícula", async () => {
    const id = await criarFuncionario({
      nome: "Fulano",
      matricula: "9999999",
      eh_almoxarife: false,
    });
    const funcionario = await db.funcionarios.get(id);
    expect(funcionario?.nome).toBe("Fulano");
    expect(funcionario?.matricula).toBe("9999999");
  });

  it("cria um bolsista sem matrícula", async () => {
    const id = await criarFuncionario({ nome: "Bolsista", eh_almoxarife: false });
    const funcionario = await db.funcionarios.get(id);
    expect(funcionario?.matricula).toBeUndefined();
  });

  it("rejeita nome vazio", async () => {
    await expect(
      criarFuncionario({ nome: "  ", eh_almoxarife: false }),
    ).rejects.toThrow("Nome do funcionário é obrigatório");
  });

  it("rejeita matrícula que não tenha exatamente 7 dígitos", async () => {
    await expect(
      criarFuncionario({ nome: "Fulano", matricula: "123", eh_almoxarife: false }),
    ).rejects.toThrow("Matrícula deve ter exatamente 7 dígitos numéricos");
  });

  it("rejeita matrícula duplicada", async () => {
    await criarFuncionario({ nome: "Fulano", matricula: "9999999", eh_almoxarife: false });
    await expect(
      criarFuncionario({ nome: "Ciclano", matricula: "9999999", eh_almoxarife: false }),
    ).rejects.toThrow("Já existe um funcionário com essa matrícula");
  });

  it("atualiza um funcionário existente, inclusive removendo a matrícula", async () => {
    const id = await criarFuncionario({ nome: "Fulano", matricula: "9999999", eh_almoxarife: false });
    await atualizarFuncionario(id, { nome: "Fulano da Silva", eh_almoxarife: true });

    const funcionario = await db.funcionarios.get(id);
    expect(funcionario?.nome).toBe("Fulano da Silva");
    expect(funcionario?.matricula).toBeUndefined();
    expect(funcionario?.eh_almoxarife).toBe(true);
  });

  it("permite manter a própria matrícula ao atualizar (não conta como duplicada)", async () => {
    const id = await criarFuncionario({ nome: "Fulano", matricula: "9999999", eh_almoxarife: false });
    await expect(
      atualizarFuncionario(id, { nome: "Fulano", matricula: "9999999", eh_almoxarife: false }),
    ).resolves.toBeUndefined();
  });

  it("rejeita atualizar para uma matrícula que já pertence a outro funcionário", async () => {
    await criarFuncionario({ nome: "Fulano", matricula: "9999999", eh_almoxarife: false });
    const idCiclano = await criarFuncionario({
      nome: "Ciclano",
      matricula: "8888888",
      eh_almoxarife: false,
    });

    await expect(
      atualizarFuncionario(idCiclano, {
        nome: "Ciclano",
        matricula: "9999999",
        eh_almoxarife: false,
      }),
    ).rejects.toThrow("Já existe um funcionário com essa matrícula");

    const ciclano = await db.funcionarios.get(idCiclano);
    expect(ciclano?.matricula).toBe("8888888");
  });

  it("remove um funcionário", async () => {
    const id = await criarFuncionario({ nome: "Fulano", eh_almoxarife: false });
    await removerFuncionario(id);
    expect(await db.funcionarios.get(id)).toBeUndefined();
  });

  it("listarFuncionarios retorna todos ordenados por nome", async () => {
    await criarFuncionario({ nome: "Zeca", eh_almoxarife: false });
    await criarFuncionario({ nome: "Ana", eh_almoxarife: false });
    const funcionarios = await listarFuncionarios();
    expect(funcionarios.map((f) => f.nome)).toEqual(["Ana", "Zeca"]);
  });

  it("listarAlmoxarifes retorna só os marcados como almoxarife", async () => {
    await criarFuncionario({ nome: "Comum", eh_almoxarife: false });
    await criarFuncionario({ nome: "Chefe", eh_almoxarife: true });
    const almoxarifes = await listarAlmoxarifes();
    expect(almoxarifes.map((f) => f.nome)).toEqual(["Chefe"]);
  });

  it("formatarFuncionario usa MATRICULA - NOME quando há matrícula", () => {
    expect(formatarFuncionario({ nome: "Arthur Ramos", matricula: "9118339" })).toBe(
      "9118339 - Arthur Ramos",
    );
  });

  it("formatarFuncionario usa BOLSISTA - NOME quando não há matrícula", () => {
    expect(formatarFuncionario({ nome: "Fulano" })).toBe("BOLSISTA - Fulano");
  });
});

describe("buscarItemPorNomeEProjeto", () => {
  it("retorna undefined quando não há itens", async () => {
    const resultado = await buscarItemPorNomeEProjeto("Parafuso", 1);
    expect(resultado).toBeUndefined();
  });

  it("encontra o item ignorando maiúsculas/minúsculas e espaços", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    await db.itens.add({
      nome: "Parafuso M8",
      projeto_id: projetoId,
      quantidade: 10,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    const encontrado = await buscarItemPorNomeEProjeto("  parafuso m8  ", projetoId);
    expect(encontrado?.nome).toBe("Parafuso M8");
  });

  it("não encontra o item se ele pertence a outro projeto (nome+projeto é a chave)", async () => {
    const projetoA = await db.projetos.add({ nome: "Projeto A" });
    const projetoB = await db.projetos.add({ nome: "Projeto B" });
    await db.itens.add({
      nome: "Parafuso M8",
      projeto_id: projetoA,
      quantidade: 10,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    const resultado = await buscarItemPorNomeEProjeto("Parafuso M8", projetoB);
    expect(resultado).toBeUndefined();
  });

  it("retorna undefined para nome vazio", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    const resultado = await buscarItemPorNomeEProjeto("   ", projetoId);
    expect(resultado).toBeUndefined();
  });
});

describe("criarItem", () => {
  it("cria o item e registra a movimentação de ENTRADA inicial", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();

    const itemId = await criarItem({
      nome: "Furadeira",
      projetoId,
      quantidadeInicial: 3,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });

    const item = await db.itens.get(itemId);
    expect(item?.quantidade).toBe(3);
    expect(item?.nome).toBe("Furadeira");
    expect(item?.organizador).toBe("12");

    const movimentacoes = await db.movimentacoes.where("item_id").equals(itemId).toArray();
    expect(movimentacoes).toHaveLength(1);
    expect(movimentacoes[0].tipo).toBe("ENTRADA");
    expect(movimentacoes[0].quantidade_antes).toBe(0);
    expect(movimentacoes[0].quantidade_depois).toBe(3);
    expect(movimentacoes[0].funcionario_id).toBe(funcionarioId);
    expect(movimentacoes[0].almoxarife_id).toBe(almoxarifeId);
  });

  it("rejeita nome vazio", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await expect(
      criarItem({
        nome: "  ",
        projetoId,
        quantidadeInicial: 1,
        funcionarioId,
        almoxarifeId,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Nome do item é obrigatório");
  });

  it("rejeita quantidade inicial menor que 1", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await expect(
      criarItem({
        nome: "Furadeira",
        projetoId,
        quantidadeInicial: 0,
        funcionarioId,
        almoxarifeId,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("A quantidade inicial deve ser maior que zero");
  });

  it("rejeita item duplicado (mesmo nome + mesmo projeto)", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await criarItem({
      nome: "Furadeira",
      projetoId,
      quantidadeInicial: 1,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });

    await expect(
      criarItem({
        nome: "furadeira",
        projetoId,
        quantidadeInicial: 5,
        funcionarioId,
        almoxarifeId,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Já existe um item com esse nome para o projeto selecionado");
  });

  it("rejeita funcionário inexistente", async () => {
    const { projetoId, almoxarifeId } = await criarContexto();
    await expect(
      criarItem({
        nome: "Furadeira",
        projetoId,
        quantidadeInicial: 1,
        funcionarioId: 999999,
        almoxarifeId,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Funcionário não encontrado");
  });

  it("rejeita almoxarife que existe mas não está marcado como almoxarife", async () => {
    const { projetoId, funcionarioId } = await criarContexto();
    const idComum = await criarFuncionarioDeTeste({ nome: "Não Almoxarife", eh_almoxarife: false });
    await expect(
      criarItem({
        nome: "Furadeira",
        projetoId,
        quantidadeInicial: 1,
        funcionarioId,
        almoxarifeId: idComum,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Funcionário informado não é um almoxarife");
  });

  it("permite o mesmo nome de item em projetos diferentes", async () => {
    const { funcionarioId, almoxarifeId } = await criarContexto();
    const projetoA = await db.projetos.add({ nome: "Projeto A" });
    const projetoB = await db.projetos.add({ nome: "Projeto B" });

    await criarItem({
      nome: "Furadeira",
      projetoId: projetoA,
      quantidadeInicial: 1,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });

    await expect(
      criarItem({
        nome: "Furadeira",
        projetoId: projetoB,
        quantidadeInicial: 1,
        funcionarioId,
        almoxarifeId,
        ...localizacaoBase,
      }),
    ).resolves.toBeTypeOf("number");

    const itens = await db.itens.toArray();
    expect(itens).toHaveLength(2);
  });
});

describe("registrarEntrada", () => {
  it("cria o item automaticamente quando ele ainda não existe no projeto", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();

    const resultado = await registrarEntrada({
      nomeItem: "Parafuso",
      projetoId,
      quantidade: 4,
      funcionarioId,
      almoxarifeId,
      ...localizacaoBase,
    });

    expect(resultado).toEqual({ quantidade: 4, itemCriado: true });

    const itens = await db.itens.toArray();
    expect(itens).toHaveLength(1);
    expect(itens[0].quantidade).toBe(4);

    const movimentacoes = await db.movimentacoes.toArray();
    expect(movimentacoes).toHaveLength(1);
    expect(movimentacoes[0].quantidade_antes).toBe(0);
    expect(movimentacoes[0].quantidade_depois).toBe(4);
  });

  it("incrementa a quantidade de um item existente e atualiza a localização", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    const itemId = await db.itens.add({
      nome: "Parafuso",
      projeto_id: projetoId,
      quantidade: 10,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    const resultado = await registrarEntrada({
      nomeItem: "Parafuso",
      projetoId,
      quantidade: 5,
      funcionarioId,
      almoxarifeId,
      organizador: "99",
      setor: "Z",
      andar: "P9",
      prateleira: "9",
    });

    expect(resultado).toEqual({ quantidade: 15, itemCriado: false });

    const item = await db.itens.get(itemId);
    expect(item?.quantidade).toBe(15);
    expect(item?.organizador).toBe("99");
    expect(item?.local_setor).toBe("Z");

    const itens = await db.itens.toArray();
    expect(itens).toHaveLength(1); // não criou um segundo item

    const movimentacoes = await db.movimentacoes.toArray();
    expect(movimentacoes[0].quantidade_antes).toBe(10);
    expect(movimentacoes[0].quantidade_depois).toBe(15);
  });

  it("rejeita nome de item vazio", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await expect(
      registrarEntrada({
        nomeItem: "   ",
        projetoId,
        quantidade: 1,
        funcionarioId,
        almoxarifeId,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Nome do item é obrigatório");
  });

  it("rejeita funcionário inexistente", async () => {
    const { projetoId, almoxarifeId } = await criarContexto();
    await expect(
      registrarEntrada({
        nomeItem: "Parafuso",
        projetoId,
        quantidade: 1,
        funcionarioId: 999999,
        almoxarifeId,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Funcionário não encontrado");
  });

  it.each([0, -1, 1.5])(
    "rejeita quantidade inválida: %s",
    async (quantidade) => {
      const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
      await expect(
        registrarEntrada({
          nomeItem: "Parafuso",
          projetoId,
          quantidade,
          funcionarioId,
          almoxarifeId,
          ...localizacaoBase,
        }),
      ).rejects.toThrow("A quantidade deve ser um número inteiro maior que zero");
    },
  );
});

describe("registrarSaida", () => {
  it("decrementa a quantidade do item e registra a movimentação de SAIDA com status SEM_RETORNO", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    const itemId = await db.itens.add({
      nome: "Parafuso",
      projeto_id: projetoId,
      quantidade: 10,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    const novaQuantidade = await registrarSaida({
      nomeItem: "Parafuso",
      projetoId,
      quantidade: 3,
      funcionarioId,
      almoxarifeId,
      comRetorno: false,
      ...localizacaoBase,
    });

    expect(novaQuantidade).toBe(7);
    const item = await db.itens.get(itemId);
    expect(item?.quantidade).toBe(7);

    const movimentacoes = await db.movimentacoes.toArray();
    expect(movimentacoes[0].tipo).toBe("SAIDA");
    expect(movimentacoes[0].status).toBe("SEM_RETORNO");
    expect(movimentacoes[0].quantidade_antes).toBe(10);
    expect(movimentacoes[0].quantidade_depois).toBe(7);
  });

  it("marca status PENDENTE_RETORNO quando comRetorno é true", async () => {
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

    const movimentacoes = await db.movimentacoes.toArray();
    expect(movimentacoes[0].status).toBe("PENDENTE_RETORNO");
  });

  it("rejeita almoxarife inexistente", async () => {
    const { projetoId, funcionarioId } = await criarContexto();
    await db.itens.add({
      nome: "Parafuso",
      projeto_id: projetoId,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    await expect(
      registrarSaida({
        nomeItem: "Parafuso",
        projetoId,
        quantidade: 1,
        funcionarioId,
        almoxarifeId: 999999,
        comRetorno: false,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Almoxarife não encontrado");
  });

  it("lança erro quando o item não existe para o projeto", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await expect(
      registrarSaida({
        nomeItem: "Inexistente",
        projetoId,
        quantidade: 1,
        funcionarioId,
        almoxarifeId,
        comRetorno: false,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Item não encontrado para o projeto selecionado");
  });

  it("lança erro quando o item está com estoque zerado", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await db.itens.add({
      nome: "Parafuso",
      projeto_id: projetoId,
      quantidade: 0,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    await expect(
      registrarSaida({
        nomeItem: "Parafuso",
        projetoId,
        quantidade: 1,
        funcionarioId,
        almoxarifeId,
        comRetorno: false,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Item sem estoque disponível");
  });

  it("lança erro quando a quantidade solicitada é maior que o estoque disponível", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await db.itens.add({
      nome: "Parafuso",
      projeto_id: projetoId,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    await expect(
      registrarSaida({
        nomeItem: "Parafuso",
        projetoId,
        quantidade: 6,
        funcionarioId,
        almoxarifeId,
        comRetorno: false,
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Quantidade solicitada maior que o estoque disponível");
  });

  it.each([0, -1, 2.5])(
    "rejeita quantidade inválida: %s",
    async (quantidade) => {
      const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
      await db.itens.add({
        nome: "Parafuso",
        projeto_id: projetoId,
        quantidade: 10,
        prateleira: "1",
        piso_andar: "P1",
        local_setor: "A",
        organizador: "1",
      });

      await expect(
        registrarSaida({
          nomeItem: "Parafuso",
          projetoId,
          quantidade,
          funcionarioId,
          almoxarifeId,
          comRetorno: false,
          ...localizacaoBase,
        }),
      ).rejects.toThrow("A quantidade deve ser um número inteiro maior que zero");
    },
  );

  describe("regra de exclusão automática ao zerar o estoque", () => {
    it("exclui o item quando zera e a saída é SEM_RETORNO", async () => {
      const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
      const itemId = await db.itens.add({
        nome: "Parafuso",
        projeto_id: projetoId,
        quantidade: 5,
        prateleira: "1",
        piso_andar: "P1",
        local_setor: "A",
        organizador: "1",
      });

      const novaQuantidade = await registrarSaida({
        nomeItem: "Parafuso",
        projetoId,
        quantidade: 5,
        funcionarioId,
        almoxarifeId,
        comRetorno: false,
        ...localizacaoBase,
      });

      expect(novaQuantidade).toBe(0);
      expect(await db.itens.get(itemId)).toBeUndefined();
    });

    it("NÃO exclui o item quando zera mas a própria saída é PENDENTE_RETORNO", async () => {
      const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
      const itemId = await db.itens.add({
        nome: "Furadeira",
        projeto_id: projetoId,
        quantidade: 1,
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

      const item = await db.itens.get(itemId);
      expect(item).toBeDefined();
      expect(item?.quantidade).toBe(0);
    });

    it("NÃO exclui o item quando zera por uma saída SEM_RETORNO mas existe outra saída PENDENTE_RETORNO em aberto", async () => {
      const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
      const itemId = await db.itens.add({
        nome: "Multímetro",
        projeto_id: projetoId,
        quantidade: 3,
        prateleira: "1",
        piso_andar: "P1",
        local_setor: "A",
        organizador: "1",
      });

      // Uma unidade sai pendente de retorno (fica faltando registrar o retorno dela)
      await registrarSaida({
        nomeItem: "Multímetro",
        projetoId,
        quantidade: 1,
        funcionarioId,
        almoxarifeId,
        comRetorno: true,
        ...localizacaoBase,
      });

      // As outras duas saem em definitivo, zerando o estoque
      await registrarSaida({
        nomeItem: "Multímetro",
        projetoId,
        quantidade: 2,
        funcionarioId,
        almoxarifeId,
        comRetorno: false,
        ...localizacaoBase,
      });

      const item = await db.itens.get(itemId);
      expect(item).toBeDefined();
      expect(item?.quantidade).toBe(0);
    });

    it("não exclui o item quando a quantidade não chega a zero", async () => {
      const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
      const itemId = await db.itens.add({
        nome: "Parafuso",
        projeto_id: projetoId,
        quantidade: 5,
        prateleira: "1",
        piso_andar: "P1",
        local_setor: "A",
        organizador: "1",
      });

      await registrarSaida({
        nomeItem: "Parafuso",
        projetoId,
        quantidade: 2,
        funcionarioId,
        almoxarifeId,
        comRetorno: false,
        ...localizacaoBase,
      });

      expect(await db.itens.get(itemId)).toBeDefined();
    });
  });
});

describe("registrarRetorno", () => {
  it("soma a quantidade de volta ao estoque e cria um registro RETORNO ligado à saída original", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    const itemId = await db.itens.add({
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
      quantidade: 2,
      funcionarioId,
      almoxarifeId,
      comRetorno: true,
      ...localizacaoBase,
    });

    const saidaOriginal = await db.movimentacoes.where("item_id").equals(itemId).first();
    expect(saidaOriginal?.status).toBe("PENDENTE_RETORNO");

    await registrarRetorno({
      movimentacaoOrigemId: saidaOriginal!.id!,
      funcionarioId,
      almoxarifeId,
      observacao: "Devolvido em bom estado",
    });

    const item = await db.itens.get(itemId);
    expect(item?.quantidade).toBe(5);

    const original = await db.movimentacoes.get(saidaOriginal!.id!);
    expect(original?.status).toBe("RETORNADO");

    const todas = await db.movimentacoes.toArray();
    const retorno = todas.find((mov) => mov.tipo === "RETORNO");
    expect(retorno).toBeDefined();
    expect(retorno?.quantidade_antes).toBe(3);
    expect(retorno?.quantidade_depois).toBe(5);
    expect(retorno?.movimentacao_origem_id).toBe(saidaOriginal!.id);
  });

  it("recompõe o estoque de um item que zerou aguardando o retorno", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    const itemId = await db.itens.add({
      nome: "Furadeira",
      projeto_id: projetoId,
      quantidade: 1,
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

    expect((await db.itens.get(itemId))?.quantidade).toBe(0);

    const saidaOriginal = await db.movimentacoes.where("item_id").equals(itemId).first();
    await registrarRetorno({
      movimentacaoOrigemId: saidaOriginal!.id!,
      funcionarioId,
      almoxarifeId,
    });

    expect((await db.itens.get(itemId))?.quantidade).toBe(1);
  });

  it("lança erro quando a movimentação não está pendente de retorno", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    await db.itens.add({
      nome: "Parafuso",
      projeto_id: projetoId,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    await registrarSaida({
      nomeItem: "Parafuso",
      projetoId,
      quantidade: 1,
      funcionarioId,
      almoxarifeId,
      comRetorno: false,
      ...localizacaoBase,
    });

    const saida = await db.movimentacoes.toArray().then((lista) => lista[0]);

    await expect(
      registrarRetorno({ movimentacaoOrigemId: saida.id!, funcionarioId, almoxarifeId }),
    ).rejects.toThrow("Essa movimentação não está pendente de retorno");
  });

  it("rejeita funcionário inexistente", async () => {
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

    const saida = await db.movimentacoes.toArray().then((lista) => lista[0]);

    await expect(
      registrarRetorno({
        movimentacaoOrigemId: saida.id!,
        funcionarioId: 999999,
        almoxarifeId,
      }),
    ).rejects.toThrow("Funcionário não encontrado");
  });

  it("lança erro (defensivo) quando o item referenciado pela saída pendente já não existe mais", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    const itemId = await db.itens.add({
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

    const saida = await db.movimentacoes.toArray().then((lista) => lista[0]);

    // Estado hipotético/inconsistente: pelo desenho do app o item nunca deveria ser excluído
    // enquanto existir uma saída PENDENTE_RETORNO em aberto (ver regra em registrarSaida).
    // Este teste garante que, se isso ocorrer por qualquer motivo, o retorno falha com uma
    // mensagem clara em vez de quebrar silenciosamente.
    await db.itens.delete(itemId);

    await expect(
      registrarRetorno({ movimentacaoOrigemId: saida.id!, funcionarioId, almoxarifeId }),
    ).rejects.toThrow("Item não encontrado para registrar o retorno");
  });
});

describe("listarRetornosPendentes / contarRetornosPendentes", () => {
  it("lista só as saídas com status PENDENTE_RETORNO", async () => {
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
      comRetorno: false,
      ...localizacaoBase,
    });

    const pendentes = await listarRetornosPendentes();
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].itemNome).toBe("Item A");

    expect(await contarRetornosPendentes()).toBe(1);
  });

  it("deixa de listar depois que o retorno é registrado", async () => {
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

    const [pendente] = await listarRetornosPendentes();
    await registrarRetorno({
      movimentacaoOrigemId: pendente.id!,
      funcionarioId,
      almoxarifeId,
    });

    expect(await listarRetornosPendentes()).toHaveLength(0);
    expect(await contarRetornosPendentes()).toBe(0);
  });
});

describe("quantidadesPendentesPorProjeto", () => {
  it("soma a quantidade pendente por item, ignorando itens de outros projetos", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    const outroProjetoId = await db.projetos.add({ nome: "Outro Projeto" });

    const itemId = await db.itens.add({
      nome: "Item A",
      projeto_id: projetoId,
      quantidade: 10,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    await db.itens.add({
      nome: "Item de Outro Projeto",
      projeto_id: outroProjetoId,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    await registrarSaida({
      nomeItem: "Item A",
      projetoId,
      quantidade: 2,
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
      comRetorno: true,
      ...localizacaoBase,
    });

    const mapa = await quantidadesPendentesPorProjeto(projetoId);
    expect(mapa.get(itemId)).toBe(3);

    const mapaOutro = await quantidadesPendentesPorProjeto(outroProjetoId);
    expect(mapaOutro.size).toBe(0);
  });
});

describe("listarHistorico", () => {
  async function semear() {
    const projetoA = await db.projetos.add({ nome: "Projeto A" });
    const projetoB = await db.projetos.add({ nome: "Projeto B" });
    const funcionario1 = await criarFuncionarioDeTeste({ nome: "Ana", matricula: "1111111" });
    const funcionario2 = await criarFuncionarioDeTeste({ nome: "Beto", matricula: "2222222" });
    const almoxarife = await criarFuncionarioDeTeste({
      nome: "Chefe",
      matricula: "3333333",
      eh_almoxarife: true,
    });
    const itemA = await db.itens.add({
      nome: "Item A",
      projeto_id: projetoA,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    const itemB = await db.itens.add({
      nome: "Item B",
      projeto_id: projetoB,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    await db.movimentacoes.bulkAdd([
      {
        item_id: itemA,
        tipo: "ENTRADA",
        quantidade_antes: 0,
        quantidade_depois: 5,
        funcionario_id: funcionario1,
        almoxarife_id: almoxarife,
        created_at: new Date("2026-01-05T10:00:00"),
      },
      {
        item_id: itemA,
        tipo: "SAIDA",
        quantidade_antes: 5,
        quantidade_depois: 3,
        funcionario_id: funcionario2,
        almoxarife_id: almoxarife,
        status: "SEM_RETORNO",
        created_at: new Date("2026-01-10T10:00:00"),
      },
      {
        item_id: itemB,
        tipo: "ENTRADA",
        quantidade_antes: 0,
        quantidade_depois: 5,
        funcionario_id: funcionario1,
        almoxarife_id: almoxarife,
        created_at: new Date("2026-01-15T10:00:00"),
      },
    ]);

    return { projetoA, projetoB, itemA, itemB, funcionario1, funcionario2 };
  }

  it("retorna tudo em ordem decrescente de data quando não há filtro", async () => {
    await semear();
    const resultado = await listarHistorico({});
    expect(resultado).toHaveLength(3);
    expect(resultado[0].funcionarioNome).toBe("1111111 - Ana");
    expect(resultado[0].created_at?.toISOString()).toBe(
      new Date("2026-01-15T10:00:00").toISOString(),
    );
    expect(resultado[2].created_at?.toISOString()).toBe(
      new Date("2026-01-05T10:00:00").toISOString(),
    );
  });

  it("filtra por intervalo de datas", async () => {
    await semear();
    const resultado = await listarHistorico({
      dataInicial: "2026-01-06",
      dataFinal: "2026-01-12",
    });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe("SAIDA");
  });

  it("filtra por tipo", async () => {
    await semear();
    const resultado = await listarHistorico({ tipo: "SAIDA" });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe("SAIDA");
  });

  it("filtra por status", async () => {
    await semear();
    const resultado = await listarHistorico({ status: "SEM_RETORNO" });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe("SAIDA");
  });

  it("filtra por funcionário (nome ou matrícula, parcial)", async () => {
    await semear();
    const porNome = await listarHistorico({ funcionario: "beto" });
    expect(porNome).toHaveLength(1);
    expect(porNome[0].funcionarioNome).toContain("Beto");

    const porMatricula = await listarHistorico({ funcionario: "2222222" });
    expect(porMatricula).toHaveLength(1);
    expect(porMatricula[0].funcionarioNome).toContain("Beto");
  });

  it("filtra por projeto", async () => {
    const { projetoB } = await semear();
    const resultado = await listarHistorico({ projetoId: projetoB });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].itemNome).toBe("Item B");
  });

  it("combina múltiplos filtros", async () => {
    const { projetoA } = await semear();
    const resultado = await listarHistorico({
      projetoId: projetoA,
      tipo: "ENTRADA",
    });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].itemNome).toBe("Item A");
    expect(resultado[0].tipo).toBe("ENTRADA");
  });

  it("anexa o nome do item e do projeto corretamente", async () => {
    await semear();
    const resultado = await listarHistorico({});
    const doItemA = resultado.find((mov) => mov.tipo === "SAIDA");
    expect(doItemA?.itemNome).toBe("Item A");
    expect(doItemA?.projetoNome).toBe("Projeto A");
  });

  it('usa "Item removido" quando o item referenciado não existe mais', async () => {
    const funcionario = await criarFuncionarioDeTeste();
    await db.movimentacoes.add({
      item_id: 99999,
      tipo: "ENTRADA",
      quantidade_antes: 0,
      quantidade_depois: 1,
      funcionario_id: funcionario,
      almoxarife_id: funcionario,
      created_at: new Date(),
    });

    const resultado = await listarHistorico({});
    expect(resultado[0].itemNome).toBe("Item removido");
    expect(resultado[0].projetoNome).toBe("—");
  });

  it('usa o texto legado de matrícula quando funcionario_id não resolve (registro antigo)', async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    const itemId = await db.itens.add({
      nome: "Item Legado",
      projeto_id: projetoId,
      quantidade: 1,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });
    await db.movimentacoes.add({
      item_id: itemId,
      tipo: "ENTRADA",
      quantidade_antes: 0,
      quantidade_depois: 1,
      // Registro antigo: sem funcionario_id/almoxarife_id, só o campo legado.
      funcionario_id: 0,
      almoxarife_id: 0,
      matricula_usuario: "555",
      created_at: new Date(),
    });

    const resultado = await listarHistorico({});
    expect(resultado[0].funcionarioNome).toBe("555");
    expect(resultado[0].almoxarifeNome).toBe("—");
  });
});

describe("listarUltimasMovimentacoes", () => {
  it("retorna as mais recentes primeiro, respeitando o limite", async () => {
    const { projetoId, funcionarioId, almoxarifeId } = await criarContexto();
    const itemId = await db.itens.add({
      nome: "Item",
      projeto_id: projetoId,
      quantidade: 5,
      prateleira: "1",
      piso_andar: "P1",
      local_setor: "A",
      organizador: "1",
    });

    await db.movimentacoes.bulkAdd(
      Array.from({ length: 5 }, (_, indice) => ({
        item_id: itemId,
        tipo: "ENTRADA" as const,
        quantidade_antes: indice,
        quantidade_depois: indice + 1,
        funcionario_id: funcionarioId,
        almoxarife_id: almoxarifeId,
        created_at: new Date(2026, 0, indice + 1),
      })),
    );

    const resultado = await listarUltimasMovimentacoes(2);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].quantidade_depois).toBe(5);
    expect(resultado[1].quantidade_depois).toBe(4);
  });
});
