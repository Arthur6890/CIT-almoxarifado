import { Autocomplete, TextField } from "@mui/material";
import { useFuncionarios } from "../../hooks/useItems";
import { formatarFuncionario } from "../../lib/repository";
import type { Funcionario } from "../../lib/types";
import { CampoComTooltip } from "../campo-tooltip";

interface FuncionarioAutocompleteProps {
  label: string;
  value: number | "";
  onChange: (id: number | "") => void;
  // Quando true, só lista funcionários marcados como almoxarife (usado no campo
  // "Almoxarife responsável"); quando false, lista todos (campo "Matrícula").
  apenasAlmoxarifes?: boolean;
  disabled?: boolean;
}

// Dropdown com busca que consome o cadastro de funcionários, exibindo cada opção como
// "MATRICULA - NOME" (ou "BOLSISTA - NOME" para quem não tem matrícula). Só permite escolher
// entre os funcionários já cadastrados — sem opção de digitar/criar um novo aqui.
export function FuncionarioAutocomplete({
  label,
  value,
  onChange,
  apenasAlmoxarifes = false,
  disabled,
}: FuncionarioAutocompleteProps) {
  const funcionarios = useFuncionarios(apenasAlmoxarifes);
  const selecionado = funcionarios.find((funcionario) => funcionario.id === value) ?? null;

  return (
    <CampoComTooltip>
      <Autocomplete
        disabled={disabled}
        options={funcionarios}
        value={selecionado}
        onChange={(_evento, novoValor) => onChange(novoValor?.id ?? "")}
        getOptionLabel={(funcionario) => formatarFuncionario(funcionario)}
        isOptionEqualToValue={(opcao: Funcionario, valorAtual) => opcao.id === valorAtual.id}
        renderInput={(params) => <TextField {...params} label={label} required />}
      />
    </CampoComTooltip>
  );
}
