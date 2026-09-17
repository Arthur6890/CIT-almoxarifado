// Polyfill do IndexedDB para os testes: o Dexie precisa de um indexedDB global,
// que não existe em ambiente Node. Cada teste que usa `db` deve limpar as tabelas
// (ver src/test/dbHelpers.ts) para não vazar estado entre casos de teste.
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// O auto-cleanup do Testing Library depende de um `afterEach` global, que não existe aqui
// porque vitest.config.ts não liga `globals: true`. Sem isso, cada teste de tela deixaria o
// render anterior no DOM, causando elementos duplicados nos testes seguintes do mesmo arquivo.
// Chamar cleanup() é inofensivo nos testes que rodam em ambiente "node" (não usam render()).
afterEach(() => {
  cleanup();
});

// Polyfills que o jsdom não implementa, mas os componentes do MUI usam internamente
// (Autocomplete/Select/Dialog fazem medições de layout e consultam media queries).
// Só se aplica nos testes de tela que rodam com `// @vitest-environment jsdom`.
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  if (!("ResizeObserver" in window)) {
    class ResizeObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error -- polyfill mínimo só para os testes
    window.ResizeObserver = ResizeObserverPolyfill;
  }
}
