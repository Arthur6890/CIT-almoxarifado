import { db } from "../lib/db";

// Limpa todas as tabelas entre testes. Os testes compartilham a mesma instância de `db`
// (singleton do módulo), então sem isso um teste vazaria dados para o próximo.
export async function limparBanco(): Promise<void> {
  await db.transaction("rw", db.projetos, db.itens, db.movimentacoes, async () => {
    await db.projetos.clear();
    await db.itens.clear();
    await db.movimentacoes.clear();
  });
}

export async function criarProjetoDeTeste(nome = "Projeto Teste"): Promise<number> {
  return db.projetos.add({ nome });
}
