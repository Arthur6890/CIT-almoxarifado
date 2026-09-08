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
import { useItensPorSetor, useSetores } from "../hooks/useItems";
import styles from "../styles/Consultar.module.scss";
import { CustomButton } from "../components/button";
import { useNavigate } from "react-router-dom";
import { Spacer } from "../components/spacer";

export function Consultar() {
  const [setorId, setSetorId] = useState<number | "">("");
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  const setores = useSetores();
  const itens = useItensPorSetor(setorId, busca);

  function handleSetorChange(evento: SelectChangeEvent<number | "">) {
    const valor = evento.target.value;
    setSetorId(valor === "" ? "" : Number(valor));
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Consultar Itens
      </Typography>

      <div className={styles.filtros}>
        <FormControl className={styles.campoSelect}>
          <InputLabel id="setor-label">Setor</InputLabel>
          <Select
            labelId="setor-label"
            label="Setor"
            value={setorId}
            onChange={handleSetorChange}
          >
            {setores.map((setor) => (
              <MenuItem key={setor.id} value={setor.id}>
                {setor.nome}
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
          disabled={setorId === ""}
          slotProps={{
            input: {
              startAdornment: (
                <Search size={18} className={styles.iconeBusca} />
              ),
            },
          }}
        />
      </div>

      {setorId === "" ? (
        <Typography className={styles.mensagemVazia}>
          Selecione um setor para consultar
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
                  Setor: <strong>{item.local_setor}</strong>
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
