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
import { FileDown } from "lucide-react";
import styles from "../styles/Historico.module.scss";
import { useHistorico, useProjetos } from "../hooks/useItems";
import type {
  MovimentacaoComItem,
  StatusSaidaFiltro,
  TipoMovimentacaoFiltro,
} from "../lib/types";
import { useLocation, useNavigate } from "react-router-dom";
import { CustomButton } from "../components/button";
import { Spacer } from "../components/spacer";

// Estado de navegação opcional (ex: vindo do indicador "pendente de retorno" em Consultar
// ou do indicador de Retornos Pendentes na Dashboard), usado para abrir o Histórico já com
// alguns filtros pré-aplicados.
interface FiltrosIniciais {
  projetoId?: number;
  status?: StatusSaidaFiltro;
}

const ITENS_POR_PAGINA = 10;

const ROTULO_STATUS: Record<string, string> = {
  PENDENTE_RETORNO: "Pendente Retorno",
  SEM_RETORNO: "Sem Retorno",
  RETORNADO: "Retornado",
};

const CLASSE_STATUS: Record<string, string> = {
  PENDENTE_RETORNO: styles.statusPendente,
  SEM_RETORNO: styles.statusSemRetorno,
  RETORNADO: styles.statusRetornado,
};

const CLASSE_TIPO: Record<string, string> = {
  ENTRADA: styles.chipEntrada,
  SAIDA: styles.chipSaida,
  RETORNO: styles.chipRetorno,
};

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

// yyyy-mm-dd (formato do <input type="date">) -> dd/mm/aaaa, para exibir no resumo impresso
function formatarDataFiltro(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function Historico() {
  const navigate = useNavigate();
  const location = useLocation();
  const filtrosIniciais = (location.state as FiltrosIniciais | null) ?? null;

  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [tipo, setTipo] = useState<TipoMovimentacaoFiltro>("TODOS");
  const [status, setStatus] = useState<StatusSaidaFiltro>(
    filtrosIniciais?.status ?? "TODOS",
  );
  const [funcionario, setFuncionario] = useState("");
  const [projetoId, setProjetoId] = useState<number | "">(
    filtrosIniciais?.projetoId ?? "",
  );
  const [pagina, setPagina] = useState(1);

  const projetos = useProjetos();
  const movimentacoes = useHistorico({
    dataInicial,
    dataFinal,
    tipo,
    status,
    funcionario,
    projetoId,
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

  function handleStatusChange(evento: SelectChangeEvent<StatusSaidaFiltro>) {
    setStatus(evento.target.value as StatusSaidaFiltro);
    setPagina(1);
  }

  function handleProjetoChange(evento: SelectChangeEvent<number | "">) {
    const valor = evento.target.value;
    setProjetoId(valor === "" ? "" : Number(valor));
    setPagina(1);
  }

  // Resumo dos filtros ativos, exibido apenas na versão impressa/PDF (a tela de filtros em si
  // não aparece na impressão, então o PDF precisa deixar claro o que foi filtrado).
  function resumoFiltros(): string {
    const partes: string[] = [];
    if (dataInicial) partes.push(`De ${formatarDataFiltro(dataInicial)}`);
    if (dataFinal) partes.push(`até ${formatarDataFiltro(dataFinal)}`);
    if (tipo !== "TODOS") {
      partes.push(`Tipo: ${tipo === "ENTRADA" ? "Entrada" : tipo === "SAIDA" ? "Saída" : "Retorno"}`);
    }
    if (status !== "TODOS") partes.push(`Status: ${ROTULO_STATUS[status]}`);
    if (funcionario) partes.push(`Funcionário: ${funcionario}`);
    if (projetoId !== "") {
      const projeto = projetos.find((p) => p.id === projetoId);
      if (projeto) partes.push(`Projeto: ${projeto.nome}`);
    }
    return partes.length > 0 ? partes.join(" · ") : "Sem filtros aplicados";
  }

  // Gera o PDF usando o recurso nativo de impressão do navegador (window.print) com um
  // layout específico para impressão (ver @media print em Historico.module.scss), que troca
  // a tabela paginada da tela pela tabela completa com todos os resultados filtrados.
  function handleBaixarPdf() {
    window.print();
  }

  function renderLinha(mov: MovimentacaoComItem) {
    return (
      <TableRow key={mov.id}>
        <TableCell>{formatarData(mov.created_at)}</TableCell>
        <TableCell>
          <Chip label={mov.tipo} size="small" className={CLASSE_TIPO[mov.tipo]} />
        </TableCell>
        <TableCell>
          {mov.status ? (
            <Chip
              label={ROTULO_STATUS[mov.status]}
              size="small"
              className={CLASSE_STATUS[mov.status]}
            />
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell>{mov.itemNome}</TableCell>
        <TableCell>{mov.projetoNome}</TableCell>
        <TableCell>{mov.funcionarioNome}</TableCell>
        <TableCell>{mov.almoxarifeNome}</TableCell>
        <TableCell>
          {mov.quantidade_antes} → {mov.quantidade_depois}
        </TableCell>
        <TableCell>{mov.observacao || "—"}</TableCell>
      </TableRow>
    );
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Histórico de Movimentações
      </Typography>

      <div className={`${styles.acoesTopo} ${styles.escondeImpressao}`}>
        <CustomButton
          variant="secondary"
          icon={<FileDown size={16} />}
          onClick={handleBaixarPdf}
        >
          Baixar PDF
        </CustomButton>
      </div>

      {/* Cabeçalho visível apenas na versão impressa/PDF: a tela de filtros não é impressa,
          então aqui fica registrado o que foi filtrado e quando o PDF foi gerado. */}
      <div className={styles.somenteImpressao}>
        <Typography variant="body2">Filtros: {resumoFiltros()}</Typography>
        <Typography variant="body2">
          {movimentacoes.length} movimentação(ões) · Gerado em{" "}
          {new Date().toLocaleString("pt-BR")}
        </Typography>
      </div>

      <div className={`${styles.filtros} ${styles.escondeImpressao}`}>
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
            <MenuItem value="RETORNO">Retorno</MenuItem>
          </Select>
        </FormControl>
        <FormControl className={styles.campoTipo}>
          <InputLabel id="status-label">Status</InputLabel>
          <Select
            labelId="status-label"
            label="Status"
            value={status}
            onChange={handleStatusChange}
          >
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="PENDENTE_RETORNO">Pendente Retorno</MenuItem>
            <MenuItem value="SEM_RETORNO">Sem Retorno</MenuItem>
            <MenuItem value="RETORNADO">Retornado</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Funcionário"
          placeholder="Nome ou matrícula"
          value={funcionario}
          onChange={(e) => {
            setFuncionario(e.target.value);
            setPagina(1);
          }}
        />
        <FormControl className={styles.campoTipo}>
          <InputLabel id="projeto-label">Projeto</InputLabel>
          <Select
            labelId="projeto-label"
            label="Projeto"
            value={projetoId}
            onChange={handleProjetoChange}
          >
            <MenuItem value="">Todos</MenuItem>
            {projetos.map((projeto) => (
              <MenuItem key={projeto.id} value={projeto.id}>
                {projeto.nome}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      <TableContainer
        component={Paper}
        className={`${styles.tabelaContainer} ${styles.escondeImpressao}`}
        data-testid="tabela-tela"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Projeto</TableCell>
              <TableCell>Funcionário</TableCell>
              <TableCell>Almoxarife</TableCell>
              <TableCell>Quantidade</TableCell>
              <TableCell>Observação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itensDaPagina.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className={styles.semRegistros}>
                  Nenhuma movimentação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              itensDaPagina.map(renderLinha)
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPaginas > 1 && (
        <Pagination
          className={`${styles.paginacao} ${styles.escondeImpressao}`}
          count={totalPaginas}
          page={pagina}
          onChange={(_, valor) => setPagina(valor)}
          color="primary"
        />
      )}

      {/* Tabela completa (sem paginação) usada apenas na versão impressa/PDF, para que o
          download inclua todos os resultados filtrados, não só a página atual na tela. */}
      <TableContainer
        component={Paper}
        className={styles.somenteImpressao}
        data-testid="tabela-impressao"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Projeto</TableCell>
              <TableCell>Funcionário</TableCell>
              <TableCell>Almoxarife</TableCell>
              <TableCell>Quantidade</TableCell>
              <TableCell>Observação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movimentacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className={styles.semRegistros}>
                  Nenhuma movimentação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              movimentacoes.map(renderLinha)
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <div className={styles.escondeImpressao}>
        <Spacer height="40px" />
        <CustomButton onClick={() => navigate("/")}>voltar</CustomButton>
      </div>
    </main>
  );
}
