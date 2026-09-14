import { Autocomplete, IconButton, TextField } from "@mui/material";
import { X } from "lucide-react";
import { useProjetos } from "../../hooks/useItems";
import type { SelecaoComOpcaoNova } from "../../lib/types";
import styles from "./ProjetoAutocomplete.module.scss";

const OPCAO_NOVO_PROJETO = "__novo_projeto__";

interface ProjetoAutocompleteProps {
  value: SelecaoComOpcaoNova | null;
  onChange: (valor: SelecaoComOpcaoNova | null) => void;
  disabled?: boolean;
}

// Autocomplete de Projeto com opção "Novo Projeto" ao final da lista de sugestões.
// Ao escolher "Novo Projeto" o usuário digita o nome livremente; a criação do projeto
// no banco só acontece quando o formulário que usa este campo é confirmado.
export function ProjetoAutocomplete({
  value,
  onChange,
  disabled,
}: ProjetoAutocompleteProps) {
  const projetos = useProjetos();
  const options = [...projetos.map((projeto) => projeto.nome), OPCAO_NOVO_PROJETO];

  if (value?.isNovo) {
    return (
      <div className={styles.campoNovo}>
        <TextField
          label="Nome do novo projeto"
          value={value.nome}
          onChange={(evento) => onChange({ nome: evento.target.value, isNovo: true })}
          required
          fullWidth
          autoFocus
        />
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
  );
}
