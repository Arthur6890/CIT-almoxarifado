import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./theme";
import { Dashboard } from "./pages/Dashboard";
import { Consultar } from "./pages/Consultar";
import { Entrada } from "./pages/Entrada";
import { Saida } from "./pages/Saida";
import { Historico } from "./pages/Historico";

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
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
