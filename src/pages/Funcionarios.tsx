import { useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Pencil, Trash2, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Funcionarios.module.scss";
import { CustomButton } from "../components/button";
import { Spacer } from "../components/spacer";
import { useFuncionarios } from "../hooks/useItems";
import { atualizarFuncionario, criarFuncionario, removerFuncionario } from "../lib/repository";
import type { Funcionario } from "../lib/types";

interface Feedback {
  tipo: "success" | "error";
  mensagem: string;
}

export function Funcionarios() {
  const navigate = useNavigate();
  const funcionarios = useFuncionarios();

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [ehAlmoxarife, setEhAlmoxarife] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [paraRemover, setParaRemover] = useState<Funcionario | null>(null);

  const podeSalvar = nome.trim().length > 0 && !enviando;

  function limparFormulario() {
    setEditandoId(null);
    setNome("");
    setMatricula("");
    setEhAlmoxarife(false);
  }

  function iniciarEdicao(funcionario: Funcionario) {
    setEditandoId(funcionario.id ?? null);
    setNome(funcionario.nome);
    setMatricula(funcionario.matricula ?? "");
    setEhAlmoxarife(funcionario.eh_almoxarife);
  }

  async function handleSalvar() {
    setEnviando(true);
    try {
      const dados = {
        nome: nome.trim(),
        matricula: matricula.trim() || undefined,
        eh_almoxarife: ehAlmoxarife,
      };
      if (editandoId !== null) {
        await atualizarFuncionario(editandoId, dados);
        setFeedback({ tipo: "success", mensagem: "Funcionário atualizado!" });
      } else {
        await criarFuncionario(dados);
        setFeedback({ tipo: "success", mensagem: "Funcionário adicionado!" });
      }
      limparFormulario();
    } catch (erro) {
      setFeedback({
        tipo: "error",
        mensagem: erro instanceof Error ? erro.message : "Erro ao salvar funcionário",
      });
    } finally {
      setEnviando(false);
    }
  }

  async function handleConfirmarRemocao() {
    if (!paraRemover?.id) return;
    try {
      await removerFuncionario(paraRemover.id);
      setFeedback({ tipo: "success", mensagem: "Funcionário removido." });
      if (editandoId === paraRemover.id) limparFormulario();
    } catch (erro) {
      setFeedback({
        tipo: "error",
        mensagem: erro instanceof Error ? erro.message : "Erro ao remover funcionário",
      });
    } finally {
      setParaRemover(null);
    }
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Funcionários
      </Typography>

      <div className={styles.formulario}>
        <TextField
          className={styles.campoNome}
          label="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <TextField
          className={styles.campoMatricula}
          label="Matrícula (opcional)"
          placeholder="7 dígitos, ou vazio para bolsista"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value.replace(/\D/g, "").slice(0, 7))}
          slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } }}
        />
        <FormControlLabel
          className={styles.campoAlmoxarife}
          control={
            <Switch
              checked={ehAlmoxarife}
              onChange={(e) => setEhAlmoxarife(e.target.checked)}
            />
          }
          label="É almoxarife"
        />
        <div className={styles.acoesFormulario}>
          {editandoId !== null && (
            <CustomButton variant="secondary" icon={<X size={16} />} onClick={limparFormulario}>
              Cancelar edição
            </CustomButton>
          )}
          <CustomButton
            variant="success"
            icon={<UserPlus size={16} />}
            loading={enviando}
            disabled={!podeSalvar}
            onClick={handleSalvar}
          >
            {editandoId !== null ? "Salvar alterações" : "Adicionar funcionário"}
          </CustomButton>
        </div>
      </div>

      <TableContainer component={Paper} className={styles.tabelaContainer}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Matrícula</TableCell>
              <TableCell>Almoxarife</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {funcionarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className={styles.semRegistros}>
                  Nenhum funcionário cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              funcionarios.map((funcionario) => (
                <TableRow key={funcionario.id}>
                  <TableCell>{funcionario.nome}</TableCell>
                  <TableCell>
                    {funcionario.matricula ?? (
                      <Chip label="BOLSISTA" size="small" className={styles.chipBolsista} />
                    )}
                  </TableCell>
                  <TableCell>
                    {funcionario.eh_almoxarife && (
                      <Chip label="Almoxarife" size="small" className={styles.chipAlmoxarife} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <div className={styles.acoesLinha}>
                      <IconButton
                        aria-label="Editar"
                        size="small"
                        onClick={() => iniciarEdicao(funcionario)}
                      >
                        <Pencil size={18} />
                      </IconButton>
                      <IconButton
                        aria-label="Remover"
                        size="small"
                        onClick={() => setParaRemover(funcionario)}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Spacer height="40px" />
      <CustomButton onClick={() => navigate("/")}>voltar</CustomButton>

      <Dialog open={!!paraRemover} onClose={() => setParaRemover(null)}>
        <DialogTitle>Remover funcionário</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Deseja realmente remover "{paraRemover?.nome}"? O histórico de movimentações já
            registradas com esse funcionário não é apagado.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setParaRemover(null)}>Cancelar</Button>
          <Button onClick={handleConfirmarRemocao} color="error" variant="contained" autoFocus>
            Remover
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
