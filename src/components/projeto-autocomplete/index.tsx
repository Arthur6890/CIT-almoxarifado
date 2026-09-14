import { Autocomplete, IconButton, TextField } from "@mui/material";
import { X } from "lucide-react";
import { useProjetos } from "../../hooks/useItems";
import type { SelecaoComOpcaoNova } from "../../lib/types";
import { CampoComTooltip } from "../campo-tooltip";
import styles from "./ProjetoAutocomplete.module.scss";

const OPCAO_NOVO_PROJETO = "__novo_projeto__";

interface ProjetoAutocompleteProps {
  value: SelecaoComOpcaoNova | null;
  onChange: (valor: SelecaoComOpcaoNova | null) => void;
  disabled?: boolean;
  // Controla se a opção "+ Novo Projeto" aparece na lista. Na tela de Saída o usuário só
  // pode escolher projetos já cadastrados, então esta opção fica desabilitada lá.
  permitirNovo?: boolean;
}

// Autocomplete de Projeto com opção "Novo Projeto" ao final da lista de sugestões.
// Ao escolher "Novo Projeto" o usuário digita o nome livremente; a criação do projeto
// no banco só acontece quando o formulário que usa este campo é confirmado.
export function ProjetoAutocomplete({
  value,
  onChange,
  disabled,
  permitirNovo = true,
}: ProjetoAutocompleteProps) {
  const projetos = useProjetos();
  const nomesProjetos = projetos.map((projeto) => projeto.nome);
  const options = permitirNovo
    ? [...nomesProjetos, OPCAO_NOVO_PROJETO]
    : nomesProjetos;

  if (value?.isNovo) {
    return (
      <div className={styles.campoNovo}>
        <CampoComTooltip>
          <TextField
            label="Nome do novo projeto"
            value={value.nome}
            onChange={(evento) => onChange({ nome: evento.target.value, isNovo: true })}
            required
            fullWidth
            autoFocus
          />
        </CampoComTooltip>
        <IconButton
          className={styles.botaoCancelar}
          aria-label="Cancelar novo projeto"
          onClick={() => onChange(null)}
        >
          <X size={18} />
        </IconButton>
      </div>
    );
  }

  return (
    <CampoComTooltip>
      <Autocomplete
        disabled={disabled}
        options={options}
        value={value?.nome ?? null}
        onChange={(_evento, novoValor) => {
          if (novoValor === OPCAO_NOVO_PROJETO) {
            onChange({ nome: "", isNovo: true });
          } else if (novoValor) {
            onChange({ nome: novoValor, isNovo: false });
          } else {
            onChange(null);
          }
        }}
        getOptionLabel={(opcao) =>
          opcao === OPCAO_NOVO_PROJETO ? "+ Novo Projeto" : opcao
        }
        renderInput={(params) => (
          <TextField {...params} label="Projeto" required />
        )}
      />
    </CampoComTooltip>
  );
}
