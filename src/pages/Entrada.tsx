import { useState } from "react";
import { Alert, Snackbar, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Entrada.module.scss";
import { CustomButton } from "../components/button";
import { ProjetoAutocomplete } from "../components/projeto-autocomplete";
import { ItemAutocomplete } from "../components/item-autocomplete";
import { FuncionarioAutocomplete } from "../components/funcionario-autocomplete";
import { CampoComTooltip } from "../components/campo-tooltip";
import { useItensPorProjeto, useNomesItensDoProjeto, useProjetos } from "../hooks/useItems";
import { registrarEntrada, resolverIdProjeto } from "../lib/repository";
import type { SelecaoComOpcaoNova } from "../lib/types";

interface Feedback {
  tipo: "success" | "error";
  mensagem: string;
}

export function Entrada() {
  const [funcionarioId, setFuncionarioId] = useState<number | "">("");
  const [almoxarifeId, setAlmoxarifeId] = useState<number | "">("");
  const [projetoSelecionado, setProjetoSelecionado] =
    useState<SelecaoComOpcaoNova | null>(null);
  const [itemSelecionado, setItemSelecionado] =
    useState<SelecaoComOpcaoNova | null>(null);
  const [organizador, setOrganizador] = useState("");
  const [setor, setSetor] = useState("");
  const [andar, setAndar] = useState("");
  const [prateleira, setPrateleira] = useState("");
  // Guarda o id do último item existente sincronizado com os campos de localização acima,
  // para o padrão de "ajustar estado durante a renderização" abaixo (evita usar useEffect).
  const [ultimoItemIdSincronizado, setUltimoItemIdSincronizado] =
    useState<number | undefined>(undefined);
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

  const quantidadeNumero = Number(quantidade);
  const quantidadeValida =
    Number.isInteger(quantidadeNumero) && quantidadeNumero >= 1;

  const buscouItem = !!itemSelecionado?.nome.trim();
  const itemExistente =
    itemSelecionado && !itemSelecionado.isNovo
      ? itensDoProjeto.find(
          (item) =>
            item.nome.trim().toLowerCase() ===
            itemSelecionado.nome.trim().toLowerCase(),
        )
      : undefined;
  const itemJaExiste = !!itemExistente;
  const quantidadeAtual = itemExistente?.quantidade ?? 0;
  const quantidadeNova = quantidadeAtual + (quantidadeValida ? quantidadeNumero : 0);

  // Quando um item já cadastrado é selecionado, os campos de localização são preenchidos
  // automaticamente com os dados do item e ficam somente leitura (ver `camposLocalizacaoEditaveis`).
  // Ao criar um item novo pela tela de Entrada, esses campos continuam editáveis, pois é
  // aqui que os dados são definidos pela primeira vez para esse item.
  // Ajusta o estado durante a própria renderização (em vez de um useEffect) sempre que o item
  // existente selecionado mudar — padrão recomendado pelo React para sincronizar estado com uma
  // "chave" que muda, evitando o re-render extra de um efeito.
  if (itemExistente?.id !== ultimoItemIdSincronizado) {
    setUltimoItemIdSincronizado(itemExistente?.id);
    if (itemExistente) {
      setOrganizador(itemExistente.organizador);
      setSetor(itemExistente.local_setor);
      setAndar(itemExistente.piso_andar);
      setPrateleira(itemExistente.prateleira);
    } else {
      setOrganizador("");
      setSetor("");
      setAndar("");
      setPrateleira("");
    }
  }

  const camposLocalizacaoEditaveis = !itemExistente;

  const podeRegistrar =
    funcionarioId !== "" &&
    almoxarifeId !== "" &&
    !!projetoSelecionado?.nome.trim() &&
    !!itemSelecionado?.nome.trim() &&
    organizador.trim().length > 0 &&
    setor.trim().length > 0 &&
    andar.trim().length > 0 &&
    prateleira.trim().length > 0 &&
    quantidadeValida &&
    !enviando;

  function handleProjetoChange(valor: SelecaoComOpcaoNova | null) {
    setProjetoSelecionado(valor);
    // Ao trocar de projeto, o item selecionado deixa de fazer sentido (itens são por projeto)
    setItemSelecionado(null);
    setOrganizador("");
    setSetor("");
    setAndar("");
    setPrateleira("");
  }

  function handleItemChange(valor: SelecaoComOpcaoNova | null) {
    setItemSelecionado(valor);
    if (!valor) {
      setOrganizador("");
      setSetor("");
      setAndar("");
      setPrateleira("");
    }
  }

  async function handleRegistrar() {
    if (!projetoSelecionado || !itemSelecionado || funcionarioId === "" || almoxarifeId === "")
      return;
    setEnviando(true);
    try {
      const projetoId = await resolverIdProjeto(projetoSelecionado);
      const resultado = await registrarEntrada({
        nomeItem: itemSelecionado.nome,
        projetoId,
        quantidade: quantidadeNumero,
        organizador: organizador.trim(),
        setor: setor.trim(),
        andar: andar.trim(),
        prateleira: prateleira.trim(),
        funcionarioId,
        almoxarifeId,
        observacao: observacao.trim() || undefined,
      });
      setFeedback({
        tipo: "success",
        mensagem: resultado.itemCriado
          ? `Item criado e entrada registrada! Quantidade: ${resultado.quantidade}`
          : `Entrada registrada! Nova quantidade: ${resultado.quantidade}`,
      });
      setItemSelecionado(null);
      setOrganizador("");
      setSetor("");
      setAndar("");
      setPrateleira("");
      setQuantidade("1");
      setObservacao("");
    } catch (erro) {
      setFeedback({
        tipo: "error",
        mensagem:
          erro instanceof Error ? erro.message : "Erro ao registrar entrada",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Registrar Entrada
      </Typography>

      <div className={styles.formulario}>
        <FuncionarioAutocomplete
          label="Matrícula"
          value={funcionarioId}
          onChange={setFuncionarioId}
        />

        <FuncionarioAutocomplete
          label="Almoxarife responsável"
          value={almoxarifeId}
          onChange={setAlmoxarifeId}
          apenasAlmoxarifes
        />

        <ProjetoAutocomplete
          value={projetoSelecionado}
          onChange={handleProjetoChange}
        />

        <ItemAutocomplete
          itensExistentes={nomesItensDoProjeto}
          value={itemSelecionado}
          onChange={handleItemChange}
          disabled={!projetoSelecionado?.nome.trim()}
        />

        <CampoComTooltip>
          <TextField
            label="Organizador do item"
            value={organizador}
            onChange={(e) => setOrganizador(e.target.value.replace(/\D/g, ""))}
            required
            fullWidth
            slotProps={{
              input: { readOnly: !camposLocalizacaoEditaveis },
              htmlInput: { inputMode: "numeric", pattern: "[0-9]*" },
            }}
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Setor do item"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            required
            fullWidth
            slotProps={{ input: { readOnly: !camposLocalizacaoEditaveis } }}
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Andar do item"
            value={andar}
            onChange={(e) => setAndar(e.target.value)}
            required
            fullWidth
            slotProps={{ input: { readOnly: !camposLocalizacaoEditaveis } }}
          />
        </CampoComTooltip>
        <CampoComTooltip>
          <TextField
            label="Prateleira do item"
            value={prateleira}
            onChange={(e) => setPrateleira(e.target.value.replace(/\D/g, ""))}
            required
            fullWidth
            slotProps={{
              input: { readOnly: !camposLocalizacaoEditaveis },
              htmlInput: { inputMode: "numeric", pattern: "[0-9]*" },
            }}
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

        {buscouItem && !itemSelecionado?.isNovo && (
          <Typography
            className={
              itemJaExiste ? styles.previaEncontrado : styles.previaNaoEncontrado
            }
          >
            {itemJaExiste
              ? `Item existente: quantidade atual ${quantidadeAtual}, nova quantidade ${quantidadeNova}.`
              : "Item não encontrado neste projeto: escolha \"+ Novo Item\" para cadastrá-lo."}
          </Typography>
        )}
        {itemSelecionado?.isNovo && (
          <Typography className={styles.previaEncontrado}>
            Novo item será criado com quantidade inicial {quantidadeValida ? quantidadeNumero : "—"}.
          </Typography>
        )}

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
          onClick={handleRegistrar}
        >
          Registrar Entrada
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
