import { useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { FileDown, Package, Search } from "lucide-react";
import {
  useItensPorProjeto,
  useProjetos,
  useQuantidadesPendentesPorProjeto,
} from "../hooks/useItems";
import styles from "../styles/Consultar.module.scss";
import { CustomButton } from "../components/button";
import { useNavigate } from "react-router-dom";
import { Spacer } from "../components/spacer";
import type { Item } from "../lib/types";

export function Consultar() {
  const [projetoId, setProjetoId] = useState<number | "">("");
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  const projetos = useProjetos();
  const itens = useItensPorProjeto(projetoId, busca);
  // O extrato em PDF sempre traz todos os itens do projeto, ignorando o texto de busca
  // digitado na tela (ver useItensPorProjeto(projetoId, "") abaixo).
  const todosItensDoProjeto = useItensPorProjeto(projetoId, "");
  const quantidadesPendentes = useQuantidadesPendentesPorProjeto(projetoId);
  const nomeProjetoSelecionado =
    projetos.find((projeto) => projeto.id === projetoId)?.nome ?? "";

  function handleProjetoChange(evento: SelectChangeEvent<number | "">) {
    const valor = evento.target.value;
    setProjetoId(valor === "" ? "" : Number(valor));
  }

  function handleBaixarPdf() {
    window.print();
  }

  function handleVerPendentes() {
    if (projetoId === "") return;
    navigate("/historico", { state: { projetoId, status: "PENDENTE_RETORNO" } });
  }

  function renderCard(item: Item) {
    const pendente = quantidadesPendentes.get(item.id!) ?? 0;
    return (
      <div key={item.id} className={styles.card}>
        <div className={styles.cardHeader}>
          <Package size={20} className={styles.cardIcone} />
          <Typography className={styles.cardNome}>{item.nome}</Typography>
        </div>
        <Typography className={styles.cardQuantidade}>
          {item.quantidade} unid.
        </Typography>
        <div className={styles.cardDetalhes}>
          <span>
            Projeto: <strong>{nomeProjetoSelecionado}</strong>
          </span>
          <span>
            Prateleira: <strong>{item.prateleira}</strong>
          </span>
          <span>
            Piso/Andar: <strong>{item.piso_andar}</strong>
          </span>
          <span>
            Setor: <strong>{item.local_setor}</strong>
          </span>
          <span>
            Organizador: <strong>{item.organizador}</strong>
          </span>
        </div>
        {pendente > 0 && (
          <>
            <button
              type="button"
              className={`${styles.pendente} ${styles.escondeImpressao}`}
              onClick={handleVerPendentes}
            >
              {pendente} pendente(s) de retorno
            </button>
            <Typography
              variant="body2"
              className={`${styles.pendente} ${styles.somenteImpressao}`}
            >
              {pendente} pendente(s) de retorno
            </Typography>
          </>
        )}
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Consultar Itens
      </Typography>

      <div className={`${styles.acoesTopo} ${styles.escondeImpressao}`}>
        <CustomButton
          variant="secondary"
          icon={<FileDown size={16} />}
          onClick={handleBaixarPdf}
          disabled={projetoId === ""}
        >
          Baixar Extrato (PDF)
        </CustomButton>
      </div>

      <div className={`${styles.filtros} ${styles.escondeImpressao}`}>
        <FormControl className={styles.campoSelect}>
          <InputLabel id="projeto-label">Projeto</InputLabel>
          <Select
            labelId="projeto-label"
            label="Projeto"
            value={projetoId}
            onChange={handleProjetoChange}
          >
            {projetos.map((projeto) => (
              <MenuItem key={projeto.id} value={projeto.id}>
                {projeto.nome}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          className={styles.campoBusca}
          label="Buscar item"
          placeholder="Digite o nome do item..."
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          disabled={projetoId === ""}
          slotProps={{
            input: {
              startAdornment: (
                <Search size={18} className={styles.iconeBusca} />
              ),
            },
          }}
        />
      </div>

      {/* Cabeçalho visível apenas na versão impressa/PDF do extrato. */}
      <div className={styles.somenteImpressao}>
        <Typography variant="h5" className={styles.tituloImpressao}>
          Extrato de itens — {nomeProjetoSelecionado}
        </Typography>
        <Typography variant="body2">
          {todosItensDoProjeto.length} item(ns) · Gerado em{" "}
          {new Date().toLocaleString("pt-BR")}
        </Typography>
        <Spacer height="16px" />
      </div>

      {projetoId === "" ? (
        <Typography className={`${styles.mensagemVazia} ${styles.escondeImpressao}`}>
          Selecione um projeto para consultar
        </Typography>
      ) : (
        <>
          {itens.length === 0 ? (
            <Typography className={`${styles.mensagemVazia} ${styles.escondeImpressao}`}>
              Nenhum item encontrado.
            </Typography>
          ) : (
            <div
              className={`${styles.grid} ${styles.escondeImpressao}`}
              data-testid="grid-tela"
            >
              {itens.map(renderCard)}
            </div>
          )}

          {/* Grade completa (ignora a busca da tela) usada só na versão impressa/PDF. */}
          <div
            className={`${styles.grid} ${styles.somenteImpressao}`}
            data-testid="grid-impressao"
          >
            {todosItensDoProjeto.map(renderCard)}
          </div>
        </>
      )}
      <div className={styles.escondeImpressao}>
        <Spacer height="40px" />
        <CustomButton onClick={() => navigate("/")}>voltar</CustomButton>
      </div>
    </main>
  );
}
