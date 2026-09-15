// Polyfill do IndexedDB para os testes: o Dexie precisa de um indexedDB global,
// que não existe em ambiente Node. Cada teste que usa `db` deve limpar as tabelas
// (ver src/test/dbHelpers.ts) para não vazar estado entre casos de teste.
import "fake-indexeddb/auto";
