import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./theme";
import { Dashboard } from "./pages/Dashboard";
import { Consultar } from "./pages/Consultar";
import { Entrada } from "./pages/Entrada";
import { Saida } from "./pages/Saida";
import { Historico } from "./pages/Historico";
import { NovoItem } from "./pages/NovoItem";
import { Funcionarios } from "./pages/Funcionarios";
import { RetornosPendentes } from "./pages/RetornosPendentes";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/consultar" element={<Consultar />} />
          <Route path="/entrada" element={<Entrada />} />
          <Route path="/saida" element={<Saida />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/novo-item" element={<NovoItem />} />
          <Route path="/funcionarios" element={<Funcionarios />} />
          <Route path="/retornos-pendentes" element={<RetornosPendentes />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
