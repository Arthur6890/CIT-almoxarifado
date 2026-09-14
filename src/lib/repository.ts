// src/lib/repository.ts
import { db, type Item, type Movimentacao, type Projeto } from "./db";
import type {
  HistoricoFiltros,
  LocalizacaoItem,
  MovimentacaoComItem,
} from "./types";

// ----------------- Projetos -----------------

export async function listarProjetos(): Promise<Projeto[]> {
  return db.projetos.orderBy("nome").toArray();
}

// Busca um projeto existente pelo nome (case insensitive) ou cria um novo.
// Usado quando o usuário escolhe "Novo Projeto" no Autocomplete e confirma o formulário.
export async function criarOuObterProjeto(nome: string): Promise<Projeto> {
  const nomeNormalizado = nome.trim();
  if (!nomeNormalizado) {
    throw new Error("Nome do projeto é obrigatório");
  }

  const projetos = await db.projetos.toArray();
  const existente = projetos.find(
    (projeto) => projeto.nome.trim().toLowerCase() === nomeNormalizado.toLowerCase(),
  );
  if (existente) return existente;

  const id = await db.projetos.add({ nome: nomeNormalizado });
  return { id, nome: nomeNormalizado };
}

// Resolve o id do projeto a partir da seleção feita no ProjetoAutocomplete: cria o projeto
// se for novo, ou busca o id do projeto existente pelo nome escolhido.
export async function resolverIdProjeto(selecao: {
  nome: string;
  isNovo: boolean;
}): Promise<number> {
  if (selecao.isNovo) {
    const projeto = await criarOuObterProjeto(selecao.nome);
    if (projeto.id === undefined) {
      throw new Error("Não foi possível criar o projeto");
    }
    return projeto.id;
  }

  const projeto = await db.projetos.where("nome").equals(selecao.nome).first();
  if (!projeto || projeto.id === undefined) {
    throw new Error("Projeto inválido");
  }
  return projeto.id;
}

// ----------------- Itens -----------------

export async function listarItensPorProjeto(
  projetoId: number,
): Promise<Item[]> {
  return db.itens.where("projeto_id").equals(projetoId).toArray();
}

export async function buscarItensPorTermo(
  projetoId: number,
  termo: string,
): Promise<Item[]> {
  const itens = await listarItensPorProjeto(projetoId);
  const termoNormalizado = termo.trim().toLowerCase();
  if (!termoNormalizado) return itens;
  return itens.filter((item) =>
    item.nome.toLowerCase().includes(termoNormalizado),
  );
}

// Regra de negócio: a chave de um item é a combinação nome + projeto_id,
// pois o mesmo nome de item pode existir em projetos diferentes.
export async function buscarItemPorNomeEProjeto(
  nome: string,
  projetoId: number,
): Promise<Item | undefined> {
  const nomeNormalizado = nome.trim().toLowerCase();
  if (!nomeNormalizado || !projetoId) return undefined;
  const itensDoProjeto = await listarItensPorProjeto(projetoId);
  return itensDoProjeto.find(
    (item) => item.nome.trim().toLowerCase() === nomeNormalizado,
  );
}

export interface NovoItemDados extends LocalizacaoItem {
  nome: string;
  projetoId: number;
  quantidadeInicial: number;
  matricula: string;
  observacao?: string;
}

// Cria um item novo no estoque (tela /novo-item) e já registra a movimentação de ENTRADA
// correspondente à quantidade inicial informada.
export async function criarItem(dados: NovoItemDados): Promise<number> {
  const nomeNormalizado = dados.nome.trim();
  if (!nomeNormalizado) {
    throw new Error("Nome do item é obrigatório");
  }
  if (dados.quantidadeInicial < 1) {
    throw new Error("A quantidade inicial deve ser maior que zero");
  }

  const existente = await buscarItemPorNomeEProjeto(
    nomeNormalizado,
    dados.projetoId,
  );
  if (existente) {
    throw new Error("Já existe um item com esse nome para o projeto selecionado");
  }

  return db.transaction("rw", db.itens, db.movimentacoes, async () => {
    const agora = new Date();
    const itemId = await db.itens.add({
      nome: nomeNormalizado,
      projeto_id: dados.projetoId,
      quantidade: dados.quantidadeInicial,
      organizador: dados.organizador,
      local_setor: dados.setor,
      piso_andar: dados.andar,
      prateleira: dados.prateleira,
      created_at: agora,
      updated_at: agora,
    });

    await db.movimentacoes.add({
      item_id: itemId,
      tipo: "ENTRADA",
      quantidade_antes: 0,
      quantidade_depois: dados.quantidadeInicial,
      matricula_usuario: dados.matricula,
      observacao: dados.observacao,
      created_at: agora,
    });

    return itemId;
  });
}

// ----------------- Movimentações -----------------

export interface DadosMovimentacaoItem extends LocalizacaoItem {
  nomeItem: string;
  projetoId: number;
  quantidade: number;
  matricula: string;
  observacao?: string;
}

export interface ResultadoEntrada {
  quantidade: number;
  itemCriado: boolean;
}

// Registra uma entrada de N unidades (dados.quantidade). Se o item ainda não existir para o
// projeto selecionado, ele é criado automaticamente com os dados de localização informados no formulário.
export async function registrarEntrada(
  dados: DadosMovimentacaoItem,
): Promise<ResultadoEntrada> {
  const nomeNormalizado = dados.nomeItem.trim();
  if (!nomeNormalizado) {
    throw new Error("Nome do item é obrigatório");
  }
  if (!Number.isInteger(dados.quantidade) || dados.quantidade < 1) {
    throw new Error("A quantidade deve ser um número inteiro maior que zero");
  }

  const itemExistente = await buscarItemPorNomeEProjeto(
    nomeNormalizado,
    dados.projetoId,
  );

  return db.transaction("rw", db.itens, db.movimentacoes, async () => {
    const agora = new Date();
    let itemId: number;
    let quantidadeAntes: number;
    let quantidadeDepois: number;
    let itemCriado = false;

    if (itemExistente && itemExistente.id !== undefined) {
      itemId = itemExistente.id;
      quantidadeAntes = itemExistente.quantidade;
      quantidadeDepois = quantidadeAntes + dados.quantidade;
      await db.itens.update(itemId, {
        quantidade: quantidadeDepois,
        organizador: dados.organizador,
        local_setor: dados.setor,
        piso_andar: dados.andar,
        prateleira: dados.prateleira,
        updated_at: agora,
      });
    } else {
      quantidadeAntes = 0;
      quantidadeDepois = dados.quantidade;
      itemId = await db.itens.add({
        nome: nomeNormalizado,
        projeto_id: dados.projetoId,
        quantidade: quantidadeDepois,
        organizador: dados.organizador,
        local_setor: dados.setor,
        piso_andar: dados.andar,
        prateleira: dados.prateleira,
        created_at: agora,
        updated_at: agora,
      });
      itemCriado = true;
    }

    await db.movimentacoes.add({
      item_id: itemId,
      tipo: "ENTRADA",
      quantidade_antes: quantidadeAntes,
      quantidade_depois: quantidadeDepois,
      matricula_usuario: dados.matricula,
      observacao: dados.observacao,
      created_at: agora,
    });

    return { quantidade: quantidadeDepois, itemCriado };
  });
}

// Registra uma saída de N unidades (dados.quantidade). O item precisa existir para o projeto
// selecionado e ter quantidade suficiente em estoque.
export async function registrarSaida(
  dados: DadosMovimentacaoItem,
): Promise<number> {
  const nomeNormalizado = dados.nomeItem.trim();
  if (!nomeNormalizado) {
    throw new Error("Nome do item é obrigatório");
  }
  if (!Number.isInteger(dados.quantidade) || dados.quantidade < 1) {
    throw new Error("A quantidade deve ser um número inteiro maior que zero");
  }

  const item = await buscarItemPorNomeEProjeto(nomeNormalizado, dados.projetoId);
  if (!item || item.id === undefined) {
    throw new Error("Item não encontrado para o projeto selecionado");
  }
  if (item.quantidade <= 0) {
    throw new Error("Item sem estoque disponível");
  }
  if (dados.quantidade > item.quantidade) {
    throw new Error("Quantidade solicitada maior que o estoque disponível");
  }

  const quantidadeAntes = item.quantidade;
  const quantidadeDepois = quantidadeAntes - dados.quantidade;

  await db.transaction("rw", db.itens, db.movimentacoes, async () => {
    await db.itens.update(item.id!, {
      quantidade: quantidadeDepois,
      organizador: dados.organizador,
      local_setor: dados.setor,
      piso_andar: dados.andar,
      prateleira: dados.prateleira,
      updated_at: new Date(),
    });
    await db.movimentacoes.add({
      item_id: item.id!,
      tipo: "SAIDA",
      quantidade_antes: quantidadeAntes,
      quantidade_depois: quantidadeDepois,
      matricula_usuario: dados.matricula,
      observacao: dados.observacao,
      created_at: new Date(),
    });
  });

  return quantidadeDepois;
}

export async function listarUltimasMovimentacoes(
  limite = 5,
): Promise<MovimentacaoComItem[]> {
  const movimentacoes = await db.movimentacoes
    .orderBy("created_at")
    .reverse()
    .limit(limite)
    .toArray();
  return anexarNomeItem(movimentacoes);
}

export async function listarHistorico(
  filtros: HistoricoFiltros,
): Promise<MovimentacaoComItem[]> {
  let movimentacoes = await db.movimentacoes
    .orderBy("created_at")
    .reverse()
    .toArray();

  if (filtros.dataInicial) {
    const inicio = new Date(`${filtros.dataInicial}T00:00:00`);
    movimentacoes = movimentacoes.filter(
      (mov) => mov.created_at !== undefined && mov.created_at >= inicio,
    );
  }
  if (filtros.dataFinal) {
    const fim = new Date(`${filtros.dataFinal}T23:59:59`);
    movimentacoes = movimentacoes.filter(
      (mov) => mov.created_at !== undefined && mov.created_at <= fim,
    );
  }
  if (filtros.tipo && filtros.tipo !== "TODOS") {
    movimentacoes = movimentacoes.filter((mov) => mov.tipo === filtros.tipo);
  }
  if (filtros.matricula) {
    const termo = filtros.matricula.trim().toLowerCase();
    movimentacoes = movimentacoes.filter((mov) =>
      mov.matricula_usuario.toLowerCase().includes(termo),
    );
  }

  let movimentacoesComItem = await anexarNomeItem(movimentacoes);

  if (filtros.projetoId) {
    movimentacoesComItem = movimentacoesComItem.filter(
      (mov) => mov.projetoId === filtros.projetoId,
    );
  }

  return movimentacoesComItem;
}

async function anexarNomeItem(
  movimentacoes: Movimentacao[],
): Promise<MovimentacaoComItem[]> {
  const idsItens = [...new Set(movimentacoes.map((mov) => mov.item_id))];
  const itens = await db.itens.where("id").anyOf(idsItens).toArray();
  const itensPorId = new Map(itens.map((item) => [item.id, item]));

  const idsProjetos = [...new Set(itens.map((item) => item.projeto_id))];
  const projetos = await db.projetos.where("id").anyOf(idsProjetos).toArray();
  const projetosPorId = new Map(projetos.map((projeto) => [projeto.id, projeto]));

  return movimentacoes.map((mov) => {
    const item = itensPorId.get(mov.item_id);
    const projeto = item ? projetosPorId.get(item.projeto_id) : undefined;
    return {
      ...mov,
      itemNome: item?.nome ?? "Item removido",
      projetoId: item?.projeto_id,
      projetoNome: projeto?.nome ?? "—",
    };
  });
}
