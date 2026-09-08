import { useState } from "react";
import { Alert, Snackbar, TextField, Typography } from "@mui/material";
import { useLiveQuery } from "dexie-react-hooks";
import styles from "../styles/Saida.module.scss";
import { CustomButton } from "../components/button";
import { buscarItemPorNome, registrarSaida } from "../lib/repository";
import { useNavigate } from "react-router-dom";

interface Feedback {
  tipo: "success" | "error";
  mensagem: string;
}

export function Saida() {
  const [matricula, setMatricula] = useState("");
  const [nomeItem, setNomeItem] = useState("");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const navigate = useNavigate();

  const item = useLiveQuery(() => buscarItemPorNome(nomeItem), [nomeItem]);

  const buscou = nomeItem.trim().length > 0;
  const quantidadeAtual = item?.quantidade ?? 0;
  const quantidadeNova = quantidadeAtual - 1;
  const semEstoque = !!item && item.quantidade <= 0;
  const podeRegistrar =
    matricula.trim().length > 0 && !!item && !semEstoque && !enviando;

  async function handleRegistrar() {
    if (!item) return;
    setEnviando(true);
    try {
      const novaQuantidade = await registrarSaida(
        nomeItem,
        matricula.trim(),
        observacao.trim() || undefined,
      );
      setFeedback({
        tipo: "success",
        mensagem: `Saída registrada! Nova quantidade: ${novaQuantidade}`,
      });
      setNomeItem("");
      setObservacao("");
    } catch (erro) {
      setFeedback({
        tipo: "error",
        mensagem:
          erro instanceof Error ? erro.message : "Erro ao registrar saída",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Registrar Saída
      </Typography>

      <div className={styles.formulario}>
        <TextField
          label="Matrícula"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          required
          fullWidth
        />

        <TextField
          label="Nome do item"
          value={nomeItem}
          onChange={(e) => setNomeItem(e.target.value)}
          required
          fullWidth
        />

        {buscou &&
          (item ? (
            semEstoque ? (
              <Typography className={styles.previaSemEstoque}>
                Item sem estoque disponível
              </Typography>
            ) : (
              <div className={styles.previaEncontrado}>
                <Typography>
                  Quantidade atual: <strong>{quantidadeAtual}</strong>
                </Typography>
                <Typography>
                  Nova quantidade: <strong>{quantidadeNova}</strong>
                </Typography>
              </div>
            )
          ) : (
            <Typography className={styles.previaNaoEncontrado}>
              Item não encontrado
            </Typography>
          ))}

        <TextField
          label="Observação (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />

        <CustomButton
          variant="danger"
          size="large"
          fullWidth
          loading={enviando}
          disabled={!podeRegistrar}
          onClick={handleRegistrar}
        >
          Registrar Saída
        </CustomButton>
        <CustomButton onClick={() => navigate("/")}>voltar</CustomButton>
      </div>

      <Snackbar
        open={!!feedback}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {feedback ? (
          <Alert
            severity={feedback.tipo}
            onClose={() => setFeedback(null)}
            variant="filled"
          >
            {feedback.mensagem}
          </Alert>
        ) : undefined}
      </Snackbar>
    </main>
  );
}
