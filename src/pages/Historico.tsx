import { useState } from "react";
import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import styles from "../styles/Historico.module.scss";
import { useHistorico } from "../hooks/useItems";
import type { TipoMovimentacaoFiltro } from "../lib/types";
import { useNavigate } from "react-router-dom";
import { CustomButton } from "../components/button";
import { Spacer } from "../components/spacer";

const ITENS_POR_PAGINA = 10;

function formatarData(data?: Date): string {
  if (!data) return "";
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Historico() {
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [tipo, setTipo] = useState<TipoMovimentacaoFiltro>("TODOS");
  const [matricula, setMatricula] = useState("");
  const [pagina, setPagina] = useState(1);
  const navigate = useNavigate();

  const movimentacoes = useHistorico({
    dataInicial,
    dataFinal,
    tipo,
    matricula,
  });

  const totalPaginas = Math.max(
    1,
    Math.ceil(movimentacoes.length / ITENS_POR_PAGINA),
  );
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const itensDaPagina = movimentacoes.slice(inicio, inicio + ITENS_POR_PAGINA);

  function handleTipoChange(evento: SelectChangeEvent<TipoMovimentacaoFiltro>) {
    setTipo(evento.target.value as TipoMovimentacaoFiltro);
    setPagina(1);
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Histórico de Movimentações
      </Typography>

      <div className={styles.filtros}>
        <TextField
          label="Data inicial"
          type="date"
          value={dataInicial}
          onChange={(e) => {
            setDataInicial(e.target.value);
            setPagina(1);
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Data final"
          type="date"
          value={dataFinal}
          onChange={(e) => {
            setDataFinal(e.target.value);
            setPagina(1);
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormControl className={styles.campoTipo}>
          <InputLabel id="tipo-label">Tipo</InputLabel>
          <Select
            labelId="tipo-label"
            label="Tipo"
            value={tipo}
            onChange={handleTipoChange}
          >
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="ENTRADA">Entrada</MenuItem>
            <MenuItem value="SAIDA">Saída</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Matrícula"
          value={matricula}
          onChange={(e) => {
            setMatricula(e.target.value);
            setPagina(1);
          }}
        />
      </div>

      <TableContainer component={Paper} className={styles.tabelaContainer}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Matrícula</TableCell>
              <TableCell>Quantidade</TableCell>
              <TableCell>Observação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itensDaPagina.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className={styles.semRegistros}>
                  Nenhuma movimentação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              itensDaPagina.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>{formatarData(mov.created_at)}</TableCell>
                  <TableCell>
                    <Chip
                      label={mov.tipo}
                      size="small"
                      className={
                        mov.tipo === "ENTRADA"
                          ? styles.chipEntrada
                          : styles.chipSaida
                      }
                    />
                  </TableCell>
                  <TableCell>{mov.itemNome}</TableCell>
                  <TableCell>{mov.matricula_usuario}</TableCell>
                  <TableCell>
                    {mov.quantidade_antes} → {mov.quantidade_depois}
                  </TableCell>
                  <TableCell>{mov.observacao || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPaginas > 1 && (
        <Pagination
          className={styles.paginacao}
          count={totalPaginas}
          page={pagina}
          onChange={(_, valor) => setPagina(valor)}
          color="primary"
        />
      )}
      <Spacer height="40px" />
      <CustomButton onClick={() => navigate("/")}>voltar</CustomButton>
    </main>
  );
}
