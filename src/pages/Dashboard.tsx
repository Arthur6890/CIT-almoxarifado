import React, { useState } from "react";
import { Button } from "@mui/material";
import type { Movimentacao } from "../lib/db";
import { Package, Plus, Minus, History, LogIn, LogOut } from "lucide-react";
import style from "./Dashboard.module.scss";

export function Dashboard() {
  const [ultimasMovimentacoes, setUltimasMovimentacoes] = useState<
    Movimentacao[]
  >([]);

  const formatarData = (data?: Date) => {
    if (!data) return "";
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main>
      <h1>Dashboard</h1>
      <section className={style.dashboard}>
        <Button variant="contained">
          <Package /> Consultar Itens
        </Button>
        <Button variant="contained">
          <Plus /> Entrada de Itens
        </Button>
        <Button variant="contained">
          <Minus /> Saída de Itens
        </Button>
        <Button variant="contained">
          <History /> Histórico (Logs)
        </Button>
      </section>
      <section>
        {ultimasMovimentacoes.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            Nenhuma movimentação registrada ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {ultimasMovimentacoes.map((mov: any) => (
              <div
                key={mov.id}
                className="flex items-center justify-between p-3 bg-[#e9e4ea] rounded-lg hover:bg-[#d5d0d6] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {mov.tipo === "ENTRADA" ? (
                    <span className="bg-green-100 text-green-700 p-2 rounded-full">
                      <Plus size={16} />
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-700 p-2 rounded-full">
                      <Minus size={16} />
                    </span>
                  )}
                  <div>
                    <p className="font-medium text-[#2b0675]">{mov.itemNome}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <LogIn size={12} /> {mov.tipo}
                      </span>
                      <span>Mat: {mov.matricula_usuario}</span>
                      <span>
                        {mov.quantidade_antes} → {mov.quantidade_depois}
                      </span>
                      <span>{formatarData(mov.created_at)}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    mov.tipo === "ENTRADA"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {mov.tipo === "ENTRADA" ? "+1" : "-1"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
