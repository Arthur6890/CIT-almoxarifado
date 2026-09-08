import { useNavigate } from "react-router-dom";
import { ArrowDownCircle, ArrowUpCircle, History, Minus, Package, Plus } from "lucide-react";
import { Chip, Paper, Typography } from "@mui/material";
import styles from "../styles/Dashboard.module.scss";
import { CustomButton } from "../components/button";
import { useUltimasMovimentacoes } from "../hooks/useItems";

function formatarData(data?: Date): string {
  if (!data) return "";
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Dashboard() {
  const navigate = useNavigate();
  const movimentacoes = useUltimasMovimentacoes(5);

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Almoxarifado
      </Typography>

      <section className={styles.acoes}>
        <CustomButton variant="primary" size="xl" fullWidth icon={<Package />} onClick={() => navigate("/consultar")}>
          Consultar Itens
        </CustomButton>
        <CustomButton variant="success" size="xl" fullWidth icon={<Plus />} onClick={() => navigate("/entrada")}>
          Registrar Entrada
        </CustomButton>
        <CustomButton variant="danger" size="xl" fullWidth icon={<Minus />} onClick={() => navigate("/saida")}>
          Registrar Saída
        </CustomButton>
        <CustomButton variant="secondary" size="xl" fullWidth icon={<History />} onClick={() => navigate("/historico")}>
          Histórico
        </CustomButton>
      </section>

      <section className={styles.recentes}>
        <Typography variant="h6" className={styles.subtitulo}>
          Últimas Movimentações
        </Typography>

        {movimentacoes.length === 0 ? (
          <Typography className={styles.vazio}>Nenhuma movimentação registrada ainda.</Typography>
        ) : (
          <div className={styles.lista}>
            {movimentacoes.map((mov) => (
              <Paper key={mov.id} className={styles.item} elevation={0}>
                <div className={styles.itemInfo}>
                  {mov.tipo === "ENTRADA" ? (
                    <ArrowDownCircle className={styles.iconeEntrada} />
                  ) : (
                    <ArrowUpCircle className={styles.iconeSaida} />
                  )}
                  <div>
                    <Typography className={styles.itemNome}>{mov.itemNome}</Typography>
                    <Typography variant="body2" className={styles.itemDetalhe}>
                      Mat: {mov.matricula_usuario} · {mov.quantidade_antes} → {mov.quantidade_depois} ·{" "}
                      {formatarData(mov.created_at)}
                    </Typography>
                  </div>
                </div>
                <Chip
                  label={mov.tipo}
                  size="small"
                  className={mov.tipo === "ENTRADA" ? styles.chipEntrada : styles.chipSaida}
                />
              </Paper>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
