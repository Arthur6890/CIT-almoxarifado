// src/test/renderPage.tsx
// Helper compartilhado pelos testes de tela: envolve o componente com os mesmos provedores
// que o App.tsx real usa (tema do MUI + roteador), para que hooks como useNavigate,
// useLocation e o estilo do MUI funcionem como em produção.
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import { theme } from "../theme";

interface RenderPageOptions {
  // Caminho inicial do roteador (útil para telas que leem `useLocation().state`).
  rota?: string;
  estadoRota?: unknown;
  // Rotas extras (além de "/") a registrar, para telas que navegam para outra tela do app
  // (ex: "voltar" navega para "/"; um teste pode querer confirmar que renderizou o Dashboard).
  rotasExtras?: Record<string, ReactElement>;
}

export function renderPage(elemento: ReactElement, opcoes: RenderPageOptions = {}) {
  const rota = opcoes.rota ?? "/pagina-teste";
  const entradaInicial = opcoes.estadoRota
    ? { pathname: rota, state: opcoes.estadoRota }
    : rota;

  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[entradaInicial]}>
        <Routes>
          <Route path={rota} element={elemento} />
          {Object.entries(opcoes.rotasExtras ?? {}).map(([caminho, el]) => (
            <Route key={caminho} path={caminho} element={el} />
          ))}
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}
