import { useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Minus,
  Package,
  PackagePlus,
  Plus,
  RotateCcw,
  Undo2,
  Users,
} from "lucide-react";
import { Chip, Paper, Typography } from "@mui/material";
import styles from "../styles/Dashboard.module.scss";
import { CustomButton } from "../components/button";
import { useContagemRetornosPendentes, useUltimasMovimentacoes } from "../hooks/useItems";
import type { TipoMovimentacao } from "../lib/types";

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

const ICONE_TIPO: Record<TipoMovimentacao, typeof ArrowDownCircle> = {
  ENTRADA: ArrowDownCircle,
  SAIDA: ArrowUpCircle,
  RETORNO: Undo2,
};

const CLASSE_ICONE_TIPO: Record<TipoMovimentacao, string> = {
  ENTRADA: styles.iconeEntrada,
  SAIDA: styles.iconeSaida,
  RETORNO: styles.iconeRetorno,
};

const CLASSE_CHIP_TIPO: Record<TipoMovimentacao, string> = {
  ENTRADA: styles.chipEntrada,
  SAIDA: styles.chipSaida,
  RETORNO: styles.chipRetorno,
};

export function Dashboard() {
  const navigate = useNavigate();
  const movimentacoes = useUltimasMovimentacoes(5);
  const contagemPendentes = useContagemRetornosPendentes();

  return (
    <main className={styles.container}>
      <Typography variant="h4" component="h1" className={styles.titulo}>
        Almoxarifado
      </Typography>

      {contagemPendentes > 0 && (
        <button
          type="button"
          className={styles.alertaPendentes}
          onClick={() => navigate("/retornos-pendentes")}
        >
          <span>
            {contagemPendentes} {contagemPendentes === 1 ? "item pendente" : "itens pendentes"} de retorno
          </span>
          <RotateCcw size={20} />
        </button>
      )}

      <section className={styles.acoes}>
        <CustomButton
          variant="primary"
          size="xl"
          fullWidth
          icon={<Package />}
          onClick={() => navigate("/consultar")}
        >
          Consultar Itens
        </CustomButton>
        <CustomButton
          variant="success"
          size="xl"
          fullWidth
          icon={<Plus />}
          onClick={() => navigate("/entrada")}
        >
          Registrar Entrada
        </CustomButton>
        <CustomButton
          variant="danger"
          size="xl"
          fullWidth
          icon={<Minus />}
          onClick={() => navigate("/saida")}
        >
          Registrar Saída
        </CustomButton>
        <CustomButton
          variant="warning"
          size="xl"
          fullWidth
          icon={<PackagePlus />}
          onClick={() => navigate("/novo-item")}
        >
          Adicionar Novo Item
        </CustomButton>
        <CustomButton
          variant="secondary"
          size="xl"
          fullWidth
          icon={<History />}
          onClick={() => navigate("/historico")}
        >
          Histórico
        </CustomButton>
        <CustomButton
          variant="primary"
          size="xl"
          fullWidth
          icon={<Users />}
          onClick={() => navigate("/funcionarios")}
        >
          Funcionários
        </CustomButton>
      </section>

      <section className={styles.recentes}>
        <Typography variant="h6" className={styles.subtitulo}>
          Últimas Movimentações
        </Typography>

        {movimentacoes.length === 0 ? (
          <Typography className={styles.vazio}>
            Nenhuma movimentação registrada ainda.
          </Typography>
        ) : (
          <div className={styles.lista}>
            {movimentacoes.map((mov) => {
              const Icone = ICONE_TIPO[mov.tipo];
              return (
                <Paper key={mov.id} className={styles.item} elevation={0}>
                  <div className={styles.itemInfo}>
                    <Icone className={CLASSE_ICONE_TIPO[mov.tipo]} />
                    <div>
                      <Typography className={styles.itemNome}>
                        {mov.itemNome}{" "}
                        <span className={styles.itemProjeto}>
                          ({mov.projetoNome})
                        </span>
                      </Typography>
                      <Typography variant="body2" className={styles.itemDetalhe}>
                        {mov.funcionarioNome} · {mov.quantidade_antes} →{" "}
                        {mov.quantidade_depois} · {formatarData(mov.created_at)}
                      </Typography>
                    </div>
                  </div>
                  <Chip
                    label={mov.tipo}
                    size="small"
                    className={CLASSE_CHIP_TIPO[mov.tipo]}
                  />
                </Paper>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
