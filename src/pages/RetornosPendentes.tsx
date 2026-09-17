import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import styles from "../styles/RetornosPendentes.module.scss";
import { CustomButton } from "../components/button";
import { Spacer } from "../components/spacer";
import { FuncionarioAutocomplete } from "../components/funcionario-autocomplete";
import { useRetornosPendentes } from "../hooks/useItems";
import { registrarRetorno } from "../lib/repository";
import type { MovimentacaoComItem } from "../lib/types";

interface Feedback {
  tipo: "success" | "error";
  mensagem: string;
}

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

export function RetornosPendentes() {
  const navigate = useNavigate();
  const pendentes = useRetornosPendentes();

  const [selecionada, setSelecionada] = useState<MovimentacaoComItem | null>(null);
  const [funcionarioId, setFuncionarioId] = useState<number | "">("");
  const [almoxarifeId, setAlmoxarifeId] = useState<number | "">("");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function abrirDialogo(mov: MovimentacaoComItem) {
    setSelecionada(mov);
    setFuncionarioId("");
    setAlmoxarifeId("");
    setObservacao("");
  }

  function fecharDialogo() {
    setSelecionada(null);
  }

  async function handleConfirmar() {
    if (!selecionada?.id || funcionarioId === "" || almoxarifeId === "") return;
    setEnviando(true);
    try {
      await registrarRetorno({
        movimentacaoOrigemId: selecionada.id,
        funcionarioId,
        almoxarifeId,
        observacao: observacao.trim() || undefined,
      });
      setFeedback({ tipo: "success", mensagem: "Retorno registrado! Estoque atualizado." });
      fecharDialogo();
    } catch (erro) {
      setFeedback({
        tipo: "error",
        mensagem: erro instanceof Error ? erro.message : "Erro ao registrar retorno",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Retornos Pendentes
      </Typography>

      {pendentes.length === 0 ? (
        <Typography className={styles.mensagemVazia}>
          Nenhum retorno pendente no momento.
        </Typography>
      ) : (
        <div className={styles.lista}>
          {pendentes.map((mov) => {
            const quantidadePendente = mov.quantidade_antes - mov.quantidade_depois;
            return (
              <div key={mov.id} className={styles.card}>
                <div>
                  <Typography className={styles.cardNome}>
                    {mov.itemNome} ({mov.projetoNome})
                  </Typography>
                  <Typography variant="body2" className={styles.cardDetalhes}>
                    {quantidadePendente} unidade(s) · retirado por {mov.funcionarioNome} · almoxarife{" "}
                    {mov.almoxarifeNome} · {formatarData(mov.created_at)}
                  </Typography>
                </div>
                <CustomButton
                  variant="primary"
                  icon={<RotateCcw size={16} />}
                  onClick={() => abrirDialogo(mov)}
                >
                  Registrar Retorno
                </CustomButton>
              </div>
            );
          })}
        </div>
      )}

      <Spacer height="40px" />
      <CustomButton onClick={() => navigate("/")}>voltar</CustomButton>

      <Dialog open={!!selecionada} onClose={fecharDialogo}>
        <DialogTitle>Registrar retorno</DialogTitle>
        <DialogContent className={styles.dialogFormulario}>
          <Typography variant="body2">
            {selecionada?.itemNome} — {selecionada ? selecionada.quantidade_antes - selecionada.quantidade_depois : 0}{" "}
            unidade(s) voltando ao estoque.
          </Typography>
          <FuncionarioAutocomplete
            label="Quem está devolvendo"
            value={funcionarioId}
            onChange={setFuncionarioId}
          />
          <FuncionarioAutocomplete
            label="Almoxarife responsável"
            value={almoxarifeId}
            onChange={setAlmoxarifeId}
            apenasAlmoxarifes
          />
          <TextField
            label="Observação (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialogo}>Cancelar</Button>
          <Button
            onClick={handleConfirmar}
            variant="contained"
            disabled={funcionarioId === "" || almoxarifeId === "" || enviando}
          >
            Confirmar retorno
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!feedback}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {feedback ? (
          <Alert severity={feedback.tipo} onClose={() => setFeedback(null)} variant="filled">
            {feedback.mensagem}
          </Alert>
        ) : undefined}
      </Snackbar>
    </main>
  );
}
