import { beforeEach, describe, expect, it } from "vitest";
import { limparBanco } from "../test/dbHelpers";
import {
  agregarItensImportados,
  db,
  nomeCanonicoItem,
  seedDatabase,
} from "./db";
import { items as itensReais } from "./items";
import type { ItemImportado } from "./items";

beforeEach(async () => {
  await limparBanco();
});

function item(sobrescreve: Partial<ItemImportado>): ItemImportado {
  return {
    nome: "Item",
    projeto_id: "Projeto",
    quantidade: 1,
    prateleira: "",
    piso_andar: "",
    local_setor: "",
    organizador: "",
    ...sobrescreve,
  };
}

describe("nomeCanonicoItem", () => {
  it("corrige o erro de digitação conhecido (falta o 'mm')", () => {
    expect(nomeCanonicoItem("Disco de corte 115x1x22,23")).toBe(
      "Disco de corte 115x1x22,23mm",
    );
  });

  it("é insensível a maiúsculas/minúsculas e espaços ao detectar o apelido", () => {
    expect(nomeCanonicoItem("  DISCO DE CORTE 115X1X22,23  ")).toBe(
      "Disco de corte 115x1x22,23mm",
    );
  });

  it("mantém o nome (apenas trim) quando não há apelido cadastrado", () => {
    expect(nomeCanonicoItem("  Parafuso M8  ")).toBe("Parafuso M8");
  });
});

describe("agregarItensImportados", () => {
  it("ignora itens sem projeto associado", () => {
    const resultado = agregarItensImportados([
      item({ nome: "Sem projeto", projeto_id: "" }),
      item({ nome: "Com projeto", projeto_id: "Projeto A" }),
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe("Com projeto");
  });

  it("soma a quantidade de linhas repetidas com o mesmo nome + projeto", () => {
    const resultado = agregarItensImportados([
      item({ nome: "Disco", projeto_id: "Projeto A", quantidade: 3 }),
      item({ nome: "Disco", projeto_id: "Projeto A", quantidade: 5 }),
      item({ nome: "Disco", projeto_id: "Projeto A", quantidade: 2 }),
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidade).toBe(10);
  });

  it("agrupa nome ignorando maiúsculas/minúsculas e espaços extras", () => {
    const resultado = agregarItensImportados([
      item({ nome: "Disco", projeto_id: "Projeto A", quantidade: 3 }),
      item({ nome: "  DISCO  ", projeto_id: "projeto a", quantidade: 5 }),
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidade).toBe(8);
  });

  it("mantém itens de mesmo nome em projetos diferentes como itens separados", () => {
    const resultado = agregarItensImportados([
      item({ nome: "Disco", projeto_id: "Projeto A", quantidade: 3 }),
      item({ nome: "Disco", projeto_id: "Projeto B", quantidade: 5 }),
    ]);

    expect(resultado).toHaveLength(2);
    const total = resultado.reduce((soma, i) => soma + i.quantidade, 0);
    expect(total).toBe(8);
  });

  it("usa a localização da última ocorrência do grupo (mais recente)", () => {
    const resultado = agregarItensImportados([
      item({
        nome: "Disco",
        projeto_id: "Projeto A",
        quantidade: 1,
        prateleira: "antiga",
        piso_andar: "P1",
        local_setor: "A",
        organizador: "1",
      }),
      item({
        nome: "Disco",
        projeto_id: "Projeto A",
        quantidade: 1,
        prateleira: "nova",
        piso_andar: "P9",
        local_setor: "Z",
        organizador: "99",
      }),
    ]);

    expect(resultado[0].prateleira).toBe("nova");
    expect(resultado[0].piso_andar).toBe("P9");
    expect(resultado[0].local_setor).toBe("Z");
    expect(resultado[0].organizador).toBe("99");
  });

  it("aplica a correção de apelido de nome antes de agrupar", () => {
    const resultado = agregarItensImportados([
      item({
        nome: "Disco de corte 115x1x22,23",
        projeto_id: "Itens consumiveis",
        quantidade: 3,
      }),
      item({
        nome: "Disco de corte 115x1x22,23mm",
        projeto_id: "Itens consumiveis",
        quantidade: 5,
      }),
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe("Disco de corte 115x1x22,23mm");
    expect(resultado[0].quantidade).toBe(8);
  });

  it("usa items.ts (dados reais) por padrão quando nenhuma lista é passada", () => {
    const resultado = agregarItensImportados();
    expect(resultado.length).toBeGreaterThan(0);
    expect(resultado.length).toBeLessThanOrEqual(itensReais.length);
  });
});

// Testes de integridade contra os dados reais de items.ts: não fixam números mágicos (o
// arquivo muda com o tempo), só garantem invariantes que sempre precisam valer.
describe("agregarItensImportados com dados reais de items.ts", () => {
  it("não produz nenhum par nome+projeto duplicado", () => {
    const resultado = agregarItensImportados();
    const chaves = new Set<string>();
    for (const item of resultado) {
      const chave = `${item.nome.toLowerCase()}||${item.projetoNome.toLowerCase()}`;
      expect(chaves.has(chave)).toBe(false);
      chaves.add(chave);
    }
  });

  it("preserva a soma total de quantidades dos itens com projeto", () => {
    const resultado = agregarItensImportados();
    const somaAgregada = resultado.reduce((soma, i) => soma + i.quantidade, 0);
    const somaBruta = itensReais
      .filter((i) => i.projeto_id !== "")
      .reduce((soma, i) => soma + i.quantidade, 0);
    expect(somaAgregada).toBe(somaBruta);
  });

  it("nunca produz quantidade negativa", () => {
    const resultado = agregarItensImportados();
    for (const item of resultado) {
      expect(item.quantidade).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("seedDatabase", () => {
  it("popula projetos e itens a partir de items.ts", async () => {
    await seedDatabase();

    const projetos = await db.projetos.toArray();
    const itens = await db.itens.toArray();

    expect(projetos.length).toBeGreaterThan(0);
    expect(itens.length).toBeGreaterThan(0);

    const nomesProjetosEsperados = new Set(
      itensReais.filter((i) => i.projeto_id !== "").map((i) => i.projeto_id),
    );
    expect(projetos.length).toBe(nomesProjetosEsperados.size);
  });

  it("não popula de novo se o banco já tiver projetos (evita duplicar no reload)", async () => {
    await seedDatabase();
    const totalItensAntes = await db.itens.count();

    await seedDatabase();
    const totalItensDepois = await db.itens.count();

    expect(totalItensDepois).toBe(totalItensAntes);
  });

  it("todo item semeado referencia um projeto que existe de fato", async () => {
    await seedDatabase();
    const projetos = await db.projetos.toArray();
    const idsProjetos = new Set(projetos.map((p) => p.id));

    const itens = await db.itens.toArray();
    for (const item of itens) {
      expect(idsProjetos.has(item.projeto_id)).toBe(true);
    }
  });

  it("não cria dois itens com o mesmo nome+projeto", async () => {
    await seedDatabase();
    const itens = await db.itens.toArray();
    const chaves = new Set<string>();
    for (const item of itens) {
      const chave = `${item.nome.toLowerCase()}||${item.projeto_id}`;
      expect(chaves.has(chave)).toBe(false);
      chaves.add(chave);
    }
  });
});
