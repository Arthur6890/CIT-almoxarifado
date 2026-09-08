import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
      dark: "#0d47a1",
      light: "#1565c0",
    },
    secondary: {
      main: "#78909c",
    },
    success: {
      main: "#2e7d32",
    },
    error: {
      main: "#c62828",
    },
    warning: {
      main: "#ed6c02",
    },
    background: {
      default: "#f5f7fa",
      paper: "#ffffff",
    },
    text: {
      primary: "#37474f",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: ["Roboto", "Segoe UI", "Arial", "sans-serif"].join(","),
  },
});
