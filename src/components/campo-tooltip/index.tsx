import type { ReactNode } from "react";
import { Tooltip } from "@mui/material";
import { HelpCircle } from "lucide-react";
import styles from "./CampoComTooltip.module.scss";

interface CampoComTooltipProps {
  tooltip?: string;
  children: ReactNode;
}

// Envolve um campo de formulário e posiciona o ícone de ajuda + Tooltip ao lado do campo
// (não dentro do label), usado nos formulários de Entrada, Saída e Novo Item.
export function CampoComTooltip({
  tooltip = "Ajustar mensagem aqui",
  children,
}: CampoComTooltipProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.campo}>{children}</div>
      <Tooltip title={tooltip} arrow>
        <HelpCircle size={18} className={styles.icone} />
      </Tooltip>
    </div>
  );
}
