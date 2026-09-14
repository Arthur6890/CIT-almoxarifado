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
import { Package, Search } from "lucide-react";
import { useItensPorProjeto, useProjetos } from "../hooks/useItems";
import styles from "../styles/Consultar.module.scss";
import { CustomButton } from "../components/button";
import { useNavigate } from "react-router-dom";
import { Spacer } from "../components/spacer";

export function Consultar() {
  const [projetoId, setProjetoId] = useState<number | "">("");
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  const projetos = useProjetos();
  const itens = useItensPorProjeto(projetoId, busca);

  function handleProjetoChange(evento: SelectChangeEvent<number | "">) {
    const valor = evento.target.value;
    setProjetoId(valor === "" ? "" : Number(valor));
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Consultar Itens
      </Typography>

      <div className={styles.filtros}>
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

      {projetoId === "" ? (
        <Typography className={styles.mensagemVazia}>
          Selecione um projeto para consultar
        </Typography>
      ) : itens.length === 0 ? (
        <Typography className={styles.mensagemVazia}>
          Nenhum item encontrado.
        </Typography>
      ) : (
        <div className={styles.grid}>
          {itens.map((item) => (
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
                  Prateleira: <strong>{item.prateleira}</strong>
                </span>
                <span>
                  Piso/Andar: <strong>{item.piso_andar}</strong>
                </span>
                <span>
                  Projeto: <strong>{item.local_projeto}</strong>
                </span>
                <span>
                  Organizador: <strong>{item.organizador}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <Spacer height="40px" />
      <CustomButton onClick={() => navigate("/")}>voltar</CustomButton>
    </main>
  );
}
