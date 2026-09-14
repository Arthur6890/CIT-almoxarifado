import { useState } from "react";
import { Alert, Snackbar, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Saida.module.scss";
import { CustomButton } from "../components/button";
import { ProjetoAutocomplete } from "../components/projeto-autocomplete";
import { ItemAutocomplete } from "../components/item-autocomplete";
import { CampoComTooltip } from "../components/campo-tooltip";
import { useItensPorProjeto, useNomesItensDoProjeto, useProjetos } from "../hooks/useItems";
import { registrarSaida, resolverIdProjeto } from "../lib/repository";
import type { SelecaoComOpcaoNova } from "../lib/types";

interface Feedback {
  tipo: "success" | "error";
  mensagem: string;
}

export function Saida() {
  const [matricula, setMatricula] = useState("");
  const [projetoSelecionado, setProjetoSelecionado] =
    useState<SelecaoComOpcaoNova | null>(null);
  const [itemSelecionado, setItemSelecionado] =
    useState<SelecaoComOpcaoNova | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const navigate = useNavigate();

  const projetos = useProjetos();
  const projetoExistente =
    projetoSelecionado && !projetoSelecionado.isNovo
      ? (projetos.find((p) => p.nome === projetoSelecionado.nome) ?? null)
      : null;
  const itensDoProjeto = useItensPorProjeto(projetoExistente?.id ?? "", "");
  const nomesItensDoProjeto = useNomesItensDoProjeto(
    projetoExistente?.id ?? null,
  );

  const buscouItem = !!itemSelecionado?.nome.trim();
  // Na tela de Saída o item precisa obrigatoriamente já existir no projeto selecionado
  // (a opção "Novo Item" fica desabilitada no Autocomplete, ver ItemAutocomplete permitirNovo).
  const itemExistente = itemSelecionado
    ? itensDoProjeto.find(
        (item) =>
          item.nome.trim().toLowerCase() ===
          itemSelecionado.nome.trim().toLowerCase(),
      )
    : undefined;

  // Campos de localização são sempre somente leitura na Saída: refletem os dados já
  // cadastrados do item (definidos na tela de Novo Item), nunca são digitados aqui.
  // Como nunca são editados pelo usuário, não precisam de estado próprio — apenas derivam
  // diretamente do item selecionado a cada renderização.
  const organizador = itemExistente?.organizador ?? "";
  const setor = itemExistente?.local_setor ?? "";
  const andar = itemExistente?.piso_andar ?? "";
  const prateleira = itemExistente?.prateleira ?? "";

  const quantidadeNumero = Number(quantidade);
  const quantidadeValida =
    Number.isInteger(quantidadeNumero) && quantidadeNumero >= 1;

  const quantidadeAtual = itemExistente?.quantidade ?? 0;
  const quantidadeNova = quantidadeAtual - (quantidadeValida ? quantidadeNumero : 0);
  const semEstoque = !!itemExistente && itemExistente.quantidade <= 0;
  const quantidadeInsuficiente =
    !!itemExistente &&
    quantidadeValida &&
    quantidadeNumero > itemExistente.quantidade;
  const itemInvalido = buscouItem && !itemExistente;

  const podeRegistrar =
    matricula.trim().length > 0 &&
    !!projetoSelecionado?.nome.trim() &&
    !!itemSelecionado?.nome.trim() &&
    !itemInvalido &&
    !semEstoque &&
    !quantidadeInsuficiente &&
    organizador.trim().length > 0 &&
    setor.trim().length > 0 &&
    andar.trim().length > 0 &&
    prateleira.trim().length > 0 &&
    quantidadeValida &&
    !enviando;

  function handleProjetoChange(valor: SelecaoComOpcaoNova | null) {
    setProjetoSelecionado(valor);
    setItemSelecionado(null);
  }

  async function handleRegistrar() {
    if (!projetoSelecionado || !itemSelecionado || !itemExistente) return;
    setEnviando(true);
    try {
      const projetoId = await resolverIdProjeto(projetoSelecionado);
      const novaQuantidade = await registrarSaida({
        nomeItem: itemSelecionado.nome,
        projetoId,
        quantidade: quantidadeNumero,
        organizador: organizador.trim(),
        setor: setor.trim(),
        andar: andar.trim(),
        prateleira: prateleira.trim(),
        matricula: matricula.trim(),
        observacao: observacao.trim() || undefined,
      });
      setFeedback({
        tipo: "success",
        mensagem: `Saída registrada! Nova quantidade: ${novaQuantidade}`,
      });
      setItemSelecionado(null);
      setQuantidade("1");
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
        <CampoComTooltip>
          <TextField
            label="Matrícula"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            required
            fullWidth
          />
        </CampoComTooltip>

        <ProjetoAutocomplete
          value={projetoSelecionado}
          onChange={handleProjetoChange}
          permitirNovo={false}
        />

        <ItemAutocomplete
          itensExistentes={nomesItensDoProjeto}
          value={itemSelecionado}
          onChange={setItemSelecionado}
          disabled={!projetoSelecionado?.nome.trim()}
          permitirNovo={false}
        />

        <CampoComTooltip>
          <TextField
            label="Organizador do item"
            value={organizador}
            required
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Setor do item"
            value={setor}
            required
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Andar do item"
            value={andar}
            required
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Prateleira do item"
            value={prateleira}
            required
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Quantidade"
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            required
            fullWidth
            error={!quantidadeValida}
            helperText={
              !quantidadeValida
                ? "Informe um número inteiro maior ou igual a 1"
                : undefined
            }
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
          />
        </CampoComTooltip>

        {buscouItem &&
          (itemExistente ? (
            semEstoque ? (
              <Typography className={styles.previaSemEstoque}>
                Item sem estoque disponível
              </Typography>
            ) : quantidadeInsuficiente ? (
              <Typography className={styles.previaSemEstoque}>
                Quantidade solicitada maior que o estoque disponível ({quantidadeAtual})
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
              Item não encontrado neste projeto
            </Typography>
          ))}

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
