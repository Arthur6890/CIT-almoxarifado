import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import styles from "../styles/NovoItem.module.scss";
import { CustomButton } from "../components/button";
import { ProjetoAutocomplete } from "../components/projeto-autocomplete";
import { ItemAutocomplete } from "../components/item-autocomplete";
import { useNomesItensDoProjeto, useProjetos } from "../hooks/useItems";
import { criarItem, resolverIdProjeto } from "../lib/repository";
import type { SelecaoComOpcaoNova } from "../lib/types";

interface Feedback {
  tipo: "success" | "error";
  mensagem: string;
}

export function NovoItem() {
  const [projetoSelecionado, setProjetoSelecionado] =
    useState<SelecaoComOpcaoNova | null>(null);
  const [itemSelecionado, setItemSelecionado] =
    useState<SelecaoComOpcaoNova | null>(null);
  const [organizador, setOrganizador] = useState("");
  const [setor, setSetor] = useState("");
  const [andar, setAndar] = useState("");
  const [prateleira, setPrateleira] = useState("");
  const [quantidadeInicial, setQuantidadeInicial] = useState("1");
  const [matricula, setMatricula] = useState("");
  const [observacao, setObservacao] = useState("");
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const navigate = useNavigate();

  const projetos = useProjetos();
  const projetoExistente =
    projetoSelecionado && !projetoSelecionado.isNovo
      ? (projetos.find((p) => p.nome === projetoSelecionado.nome) ?? null)
      : null;
  const nomesItensDoProjeto = useNomesItensDoProjeto(
    projetoExistente?.id ?? null,
  );

  const quantidadeNumero = Number(quantidadeInicial);
  const quantidadeValida =
    Number.isInteger(quantidadeNumero) && quantidadeNumero >= 1;

  const itemJaExiste =
    !!itemSelecionado &&
    !itemSelecionado.isNovo &&
    nomesItensDoProjeto.some(
      (nome) => nome.toLowerCase() === itemSelecionado.nome.trim().toLowerCase(),
    );

  const podeRegistrar =
    !!itemSelecionado?.nome.trim() &&
    !itemJaExiste &&
    !!projetoSelecionado?.nome.trim() &&
    organizador.trim().length > 0 &&
    setor.trim().length > 0 &&
    andar.trim().length > 0 &&
    prateleira.trim().length > 0 &&
    quantidadeValida &&
    matricula.trim().length > 0 &&
    !enviando;

  function handleProjetoChange(valor: SelecaoComOpcaoNova | null) {
    setProjetoSelecionado(valor);
    setItemSelecionado(null);
  }

  async function handleConfirmarRegistro() {
    if (!projetoSelecionado || !itemSelecionado) return;
    setConfirmacaoAberta(false);
    setEnviando(true);
    try {
      const projetoId = await resolverIdProjeto(projetoSelecionado);
      await criarItem({
        nome: itemSelecionado.nome,
        projetoId,
        organizador: organizador.trim(),
        setor: setor.trim(),
        andar: andar.trim(),
        prateleira: prateleira.trim(),
        quantidadeInicial: quantidadeNumero,
        matricula: matricula.trim(),
        observacao: observacao.trim() || undefined,
      });
      setFeedback({ tipo: "success", mensagem: "Item adicionado ao estoque!" });
      setTimeout(() => navigate("/consultar"), 1200);
    } catch (erro) {
      setFeedback({
        tipo: "error",
        mensagem: erro instanceof Error ? erro.message : "Erro ao criar item",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Adicionar Novo Item
      </Typography>

      <div className={styles.formulario}>
        {/* Projeto vem antes do item porque a lista de sugestões do item depende do projeto escolhido */}
        <ProjetoAutocomplete
          value={projetoSelecionado}
          onChange={handleProjetoChange}
        />

        <ItemAutocomplete
          itensExistentes={nomesItensDoProjeto}
          value={itemSelecionado}
          onChange={setItemSelecionado}
          disabled={!projetoSelecionado?.nome.trim()}
        />

        {itemJaExiste && (
          <Typography className={styles.aviso}>
            Já existe um item com esse nome neste projeto. Use a tela de Entrada
            para adicionar quantidade a ele.
          </Typography>
        )}

        <TextField
          label="Organizador do item"
          value={organizador}
          onChange={(e) => setOrganizador(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Setor do item"
          value={setor}
          onChange={(e) => setSetor(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Andar do item"
          value={andar}
          onChange={(e) => setAndar(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Prateleira do item"
          value={prateleira}
          onChange={(e) => setPrateleira(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Quantidade inicial"
          type="number"
          value={quantidadeInicial}
          onChange={(e) => setQuantidadeInicial(e.target.value)}
          required
          fullWidth
          error={!quantidadeValida}
          helperText={!quantidadeValida ? "Informe um número inteiro maior ou igual a 1" : undefined}
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
        />
        <TextField
          label="Matrícula do usuário"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Observação (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />

        <CustomButton
          variant="success"
          size="large"
          fullWidth
          loading={enviando}
          disabled={!podeRegistrar}
          onClick={() => setConfirmacaoAberta(true)}
        >
          Adicionar Item
        </CustomButton>
        <CustomButton onClick={() => navigate("/")}>voltar</CustomButton>
      </div>

      <Dialog open={confirmacaoAberta} onClose={() => setConfirmacaoAberta(false)}>
        <DialogTitle>Confirmar novo item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Deseja realmente adicionar o item "{itemSelecionado?.nome}" ao
            projeto "{projetoSelecionado?.nome}" com quantidade inicial{" "}
            {quantidadeInicial}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmacaoAberta(false)}>Cancelar</Button>
          <Button onClick={handleConfirmarRegistro} variant="contained" autoFocus>
            Confirmar
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
