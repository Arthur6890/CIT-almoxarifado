import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { limparBanco } from "../test/dbHelpers";
import {
  buscarItemPorNomeEProjeto,
  criarItem,
  criarOuObterProjeto,
  listarHistorico,
  listarUltimasMovimentacoes,
  registrarEntrada,
  registrarSaida,
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
    const projetoId = await db.projetos.add({ nome: "Projeto" });

    const itemId = await criarItem({
      nome: "Furadeira",
      projetoId,
      quantidadeInicial: 3,
      matricula: "111",
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
  });

  it("rejeita nome vazio", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    await expect(
      criarItem({
        nome: "  ",
        projetoId,
        quantidadeInicial: 1,
        matricula: "111",
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Nome do item é obrigatório");
  });

  it("rejeita quantidade inicial menor que 1", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    await expect(
      criarItem({
        nome: "Furadeira",
        projetoId,
        quantidadeInicial: 0,
        matricula: "111",
        ...localizacaoBase,
      }),
    ).rejects.toThrow("A quantidade inicial deve ser maior que zero");
  });

  it("rejeita item duplicado (mesmo nome + mesmo projeto)", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    await criarItem({
      nome: "Furadeira",
      projetoId,
      quantidadeInicial: 1,
      matricula: "111",
      ...localizacaoBase,
    });

    await expect(
      criarItem({
        nome: "furadeira",
        projetoId,
        quantidadeInicial: 5,
        matricula: "222",
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Já existe um item com esse nome para o projeto selecionado");
  });

  it("permite o mesmo nome de item em projetos diferentes", async () => {
    const projetoA = await db.projetos.add({ nome: "Projeto A" });
    const projetoB = await db.projetos.add({ nome: "Projeto B" });

    await criarItem({
      nome: "Furadeira",
      projetoId: projetoA,
      quantidadeInicial: 1,
      matricula: "111",
      ...localizacaoBase,
    });

    await expect(
      criarItem({
        nome: "Furadeira",
        projetoId: projetoB,
        quantidadeInicial: 1,
        matricula: "111",
        ...localizacaoBase,
      }),
    ).resolves.toBeTypeOf("number");

    const itens = await db.itens.toArray();
    expect(itens).toHaveLength(2);
  });
});

describe("registrarEntrada", () => {
  it("cria o item automaticamente quando ele ainda não existe no projeto", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });

    const resultado = await registrarEntrada({
      nomeItem: "Parafuso",
      projetoId,
      quantidade: 4,
      matricula: "111",
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
    const projetoId = await db.projetos.add({ nome: "Projeto" });
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
      matricula: "111",
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
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    await expect(
      registrarEntrada({
        nomeItem: "   ",
        projetoId,
        quantidade: 1,
        matricula: "111",
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Nome do item é obrigatório");
  });

  it.each([0, -1, 1.5])(
    "rejeita quantidade inválida: %s",
    async (quantidade) => {
      const projetoId = await db.projetos.add({ nome: "Projeto" });
      await expect(
        registrarEntrada({
          nomeItem: "Parafuso",
          projetoId,
          quantidade,
          matricula: "111",
          ...localizacaoBase,
        }),
      ).rejects.toThrow("A quantidade deve ser um número inteiro maior que zero");
    },
  );
});

describe("registrarSaida", () => {
  it("decrementa a quantidade do item e registra a movimentação de SAIDA", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
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
      matricula: "111",
      ...localizacaoBase,
    });

    expect(novaQuantidade).toBe(7);
    const item = await db.itens.get(itemId);
    expect(item?.quantidade).toBe(7);

    const movimentacoes = await db.movimentacoes.toArray();
    expect(movimentacoes[0].tipo).toBe("SAIDA");
    expect(movimentacoes[0].quantidade_antes).toBe(10);
    expect(movimentacoes[0].quantidade_depois).toBe(7);
  });

  it("lança erro quando o item não existe para o projeto", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
    await expect(
      registrarSaida({
        nomeItem: "Inexistente",
        projetoId,
        quantidade: 1,
        matricula: "111",
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Item não encontrado para o projeto selecionado");
  });

  it("lança erro quando o item está com estoque zerado", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
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
        matricula: "111",
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Item sem estoque disponível");
  });

  it("lança erro quando a quantidade solicitada é maior que o estoque disponível", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
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
        matricula: "111",
        ...localizacaoBase,
      }),
    ).rejects.toThrow("Quantidade solicitada maior que o estoque disponível");
  });

  it("permite retirar exatamente a quantidade total em estoque (zera o item)", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
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
      matricula: "111",
      ...localizacaoBase,
    });

    expect(novaQuantidade).toBe(0);
    const item = await db.itens.get(itemId);
    expect(item?.quantidade).toBe(0);
  });

  it.each([0, -1, 2.5])(
    "rejeita quantidade inválida: %s",
    async (quantidade) => {
      const projetoId = await db.projetos.add({ nome: "Projeto" });
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
          matricula: "111",
          ...localizacaoBase,
        }),
      ).rejects.toThrow("A quantidade deve ser um número inteiro maior que zero");
    },
  );
});

describe("listarHistorico", () => {
  async function semear() {
    const projetoA = await db.projetos.add({ nome: "Projeto A" });
    const projetoB = await db.projetos.add({ nome: "Projeto B" });
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
        matricula_usuario: "111",
        created_at: new Date("2026-01-05T10:00:00"),
      },
      {
        item_id: itemA,
        tipo: "SAIDA",
        quantidade_antes: 5,
        quantidade_depois: 3,
        matricula_usuario: "222",
        created_at: new Date("2026-01-10T10:00:00"),
      },
      {
        item_id: itemB,
        tipo: "ENTRADA",
        quantidade_antes: 0,
        quantidade_depois: 5,
        matricula_usuario: "111",
        created_at: new Date("2026-01-15T10:00:00"),
      },
    ]);

    return { projetoA, projetoB, itemA, itemB };
  }

  it("retorna tudo em ordem decrescente de data quando não há filtro", async () => {
    await semear();
    const resultado = await listarHistorico({});
    expect(resultado).toHaveLength(3);
    expect(resultado[0].matricula_usuario).toBe("111");
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

  it("filtra por matrícula (parcial, case-insensitive não aplicável a números mas trata substring)", async () => {
    await semear();
    const resultado = await listarHistorico({ matricula: "22" });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].matricula_usuario).toBe("222");
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
    const doItemA = resultado.find((mov) => mov.matricula_usuario === "222");
    expect(doItemA?.itemNome).toBe("Item A");
    expect(doItemA?.projetoNome).toBe("Projeto A");
  });

  it('usa "Item removido" quando o item referenciado não existe mais', async () => {
    const projeto = await db.projetos.add({ nome: "Projeto" });
    await db.movimentacoes.add({
      item_id: 99999,
      tipo: "ENTRADA",
      quantidade_antes: 0,
      quantidade_depois: 1,
      matricula_usuario: "111",
      created_at: new Date(),
    });
    void projeto;

    const resultado = await listarHistorico({});
    expect(resultado[0].itemNome).toBe("Item removido");
    expect(resultado[0].projetoNome).toBe("—");
  });
});

describe("listarUltimasMovimentacoes", () => {
  it("retorna as mais recentes primeiro, respeitando o limite", async () => {
    const projetoId = await db.projetos.add({ nome: "Projeto" });
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
        matricula_usuario: "111",
        created_at: new Date(2026, 0, indice + 1),
      })),
    );

    const resultado = await listarUltimasMovimentacoes(2);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].quantidade_depois).toBe(5);
    expect(resultado[1].quantidade_depois).toBe(4);
  });
});
