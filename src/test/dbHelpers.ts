import { db } from "../lib/db";

// Limpa todas as tabelas entre testes. Os testes compartilham a mesma instância de `db`
// (singleton do módulo), então sem isso um teste vazaria dados para o próximo.
export async function limparBanco(): Promise<void> {
  await db.transaction(
    "rw",
    db.projetos,
    db.itens,
    db.movimentacoes,
    db.funcionarios,
    async () => {
      await db.projetos.clear();
      await db.itens.clear();
      await db.movimentacoes.clear();
      await db.funcionarios.clear();
    },
  );
}

export async function criarProjetoDeTeste(nome = "Projeto Teste"): Promise<number> {
  return db.projetos.add({ nome });
}

export async function criarFuncionarioDeTeste(
  sobrescreve: Partial<{ nome: string; matricula?: string; eh_almoxarife: boolean }> = {},
): Promise<number> {
  // Usa "in" (não "??") para a matrícula: precisa diferenciar "a chave foi passada
  // explicitamente como undefined" (bolsista, sem matrícula mesmo) de "a chave nem foi
  // informada" (usa o padrão "1111111"). Com "??" os dois casos ficavam indistinguíveis.
  const matricula = "matricula" in sobrescreve ? sobrescreve.matricula : "1111111";
  return db.funcionarios.add({
    nome: sobrescreve.nome ?? "Funcionário Teste",
    matricula,
    eh_almoxarife: sobrescreve.eh_almoxarife ?? false,
  });
}
