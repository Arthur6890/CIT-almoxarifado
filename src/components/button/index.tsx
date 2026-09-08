import React from "react";
import { Button as MuiButton, CircularProgress } from "@mui/material";
import type { ButtonProps as MuiButtonProps } from "@mui/material";
import clsx from "clsx";
import styles from "./Button.module.scss";

export type CustomButtonVariant = "primary" | "secondary" | "success" | "danger" | "warning";
export type CustomButtonSize = "small" | "medium" | "large" | "xl";

export interface CustomButtonProps extends Omit<MuiButtonProps, "variant" | "size" | "color"> {
  variant?: CustomButtonVariant;
  size?: CustomButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const TAMANHO_SPINNER: Record<CustomButtonSize, number> = {
  small: 14,
  medium: 18,
  large: 20,
  xl: 24,
};

export const CustomButton: React.FC<CustomButtonProps> = ({
  variant = "primary",
  size = "medium",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}) => {
  return (
    <MuiButton
      variant="contained"
      disableElevation
      fullWidth={fullWidth}
      disabled={disabled || loading}
      className={clsx(styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth, className)}
      {...rest}
    >
      {loading ? (
        <CircularProgress size={TAMANHO_SPINNER[size]} className={styles.spinner} />
      ) : (
        <>
          {icon && iconPosition === "left" && <span className={styles.iconLeft}>{icon}</span>}
          {children}
          {icon && iconPosition === "right" && <span className={styles.iconRight}>{icon}</span>}
        </>
      )}
    </MuiButton>
  );
};
