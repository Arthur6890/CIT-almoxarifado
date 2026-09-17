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
import { FuncionarioAutocomplete } from "../components/funcionario-autocomplete";
import { CampoComTooltip } from "../components/campo-tooltip";
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
  const [nomeItem, setNomeItem] = useState("");
  const [organizador, setOrganizador] = useState("");
  const [setor, setSetor] = useState("");
  const [andar, setAndar] = useState("");
  const [prateleira, setPrateleira] = useState("");
  const [quantidadeInicial, setQuantidadeInicial] = useState("1");
  const [funcionarioId, setFuncionarioId] = useState<number | "">("");
  const [almoxarifeId, setAlmoxarifeId] = useState<number | "">("");
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

  const nomeItemNormalizado = nomeItem.trim().toLowerCase();
  const itemJaExiste =
    nomeItemNormalizado.length > 0 &&
    nomesItensDoProjeto.some(
      (nome) => nome.toLowerCase() === nomeItemNormalizado,
    );

  const podeRegistrar =
    nomeItem.trim().length > 0 &&
    !itemJaExiste &&
    !!projetoSelecionado?.nome.trim() &&
    organizador.trim().length > 0 &&
    setor.trim().length > 0 &&
    andar.trim().length > 0 &&
    prateleira.trim().length > 0 &&
    quantidadeValida &&
    funcionarioId !== "" &&
    almoxarifeId !== "" &&
    !enviando;

  function handleProjetoChange(valor: SelecaoComOpcaoNova | null) {
    setProjetoSelecionado(valor);
  }

  async function handleConfirmarRegistro() {
    if (!projetoSelecionado || !nomeItem.trim() || funcionarioId === "" || almoxarifeId === "")
      return;
    setConfirmacaoAberta(false);
    setEnviando(true);
    try {
      const projetoId = await resolverIdProjeto(projetoSelecionado);
      await criarItem({
        nome: nomeItem.trim(),
        projetoId,
        organizador: organizador.trim(),
        setor: setor.trim(),
        andar: andar.trim(),
        prateleira: prateleira.trim(),
        quantidadeInicial: quantidadeNumero,
        funcionarioId,
        almoxarifeId,
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
        {/* Projeto vem antes do item para que a verificação de duplicidade já saiba qual projeto considerar */}
        <ProjetoAutocomplete
          value={projetoSelecionado}
          onChange={handleProjetoChange}
        />

        {/* Campo livre (sem Autocomplete/lista suspensa): aqui o usuário sempre digita o nome de um item novo */}
        <CampoComTooltip>
          <TextField
            label="Nome do novo item"
            value={nomeItem}
            onChange={(e) => setNomeItem(e.target.value)}
            required
            fullWidth
            disabled={!projetoSelecionado?.nome.trim()}
            error={itemJaExiste}
            helperText={
              !projetoSelecionado?.nome.trim()
                ? "Selecione um projeto primeiro"
                : itemJaExiste
                  ? "Este item já existe para este projeto. Use a tela de Entrada para adicionar mais unidades."
                  : undefined
            }
          />
        </CampoComTooltip>

        <CampoComTooltip>
          <TextField
            label="Organizador do item"
            value={organizador}
            onChange={(e) => setOrganizador(e.target.value.replace(/\D/g, ""))}
            required
            fullWidth
            slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } }}
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Setor do item"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            required
            fullWidth
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Andar do item"
            value={andar}
            onChange={(e) => setAndar(e.target.value)}
            required
            fullWidth
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Prateleira do item"
            value={prateleira}
            onChange={(e) => setPrateleira(e.target.value.replace(/\D/g, ""))}
            required
            fullWidth
            slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } }}
          />
        </CampoComTooltip>
        <CampoComTooltip>
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
        </CampoComTooltip>
        <FuncionarioAutocomplete
          label="Matrícula do usuário"
          value={funcionarioId}
          onChange={setFuncionarioId}
        />
        <FuncionarioAutocomplete
          label="Almoxarife responsável"
          value={almoxarifeId}
          onChange={setAlmoxarifeId}
          apenasAlmoxarifes
        />
        <CampoComTooltip>
          <TextField
            label="Observação (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </CampoComTooltip>

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
            Deseja realmente adicionar o item "{nomeItem}" ao projeto "
            {projetoSelecionado?.nome}" com quantidade inicial {quantidadeInicial}?
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
