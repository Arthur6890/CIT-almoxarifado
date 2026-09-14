import { Autocomplete, IconButton, TextField } from "@mui/material";
import { X } from "lucide-react";
import type { SelecaoComOpcaoNova } from "../../lib/types";
import styles from "./ItemAutocomplete.module.scss";

const OPCAO_NOVO_ITEM = "__novo_item__";

interface ItemAutocompleteProps {
  itensExistentes: string[];
  value: SelecaoComOpcaoNova | null;
  onChange: (valor: SelecaoComOpcaoNova | null) => void;
  disabled?: boolean;
  helperText?: string;
}

// Autocomplete de "Nome do item" com a mesma lógica do Autocomplete de Projeto:
// sugere os itens já cadastrados para o projeto selecionado e oferece "Novo Item" ao final.
// Deve ficar desabilitado até que um projeto seja escolhido, pois a busca é sempre filtrada por projeto.
export function ItemAutocomplete({
  itensExistentes,
  value,
  onChange,
  disabled,
  helperText,
}: ItemAutocompleteProps) {
  const options = [...itensExistentes, OPCAO_NOVO_ITEM];

  if (value?.isNovo) {
    return (
      <div className={styles.campoNovo}>
        <TextField
          label="Nome do novo item"
          value={value.nome}
          onChange={(evento) => onChange({ nome: evento.target.value, isNovo: true })}
          required
          fullWidth
          autoFocus
        />
        <IconButton
          className={styles.botaoCancelar}
          aria-label="Cancelar novo item"
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
        if (novoValor === OPCAO_NOVO_ITEM) {
          onChange({ nome: "", isNovo: true });
        } else if (novoValor) {
          onChange({ nome: novoValor, isNovo: false });
        } else {
          onChange(null);
        }
      }}
      getOptionLabel={(opcao) => (opcao === OPCAO_NOVO_ITEM ? "+ Novo Item" : opcao)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Nome do item"
          required
          helperText={disabled ? "Selecione um projeto primeiro" : helperText}
        />
      )}
    />
  );
}
