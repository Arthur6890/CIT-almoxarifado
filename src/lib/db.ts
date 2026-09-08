// src/lib/db.ts
import Dexie, { type Table } from 'dexie';

export interface Setor {
  id?: number;
  nome: string;
}

export interface Item {
  id?: number;
  nome: string;
  setor_id: number;
  quantidade: number;
  prateleira: string;
  piso_andar: string;
  local_setor: string;
  organizador: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Movimentacao {
  id?: number;
  item_id: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade_antes: number;
  quantidade_depois: number;
  matricula_usuario: string;
  observacao?: string;
  created_at?: Date;
}

export class Database extends Dexie {
  setores!: Table<Setor, number>;
  itens!: Table<Item, number>;
  movimentacoes!: Table<Movimentacao, number>;

  constructor() {
    super('ForgeAlmoxarifadoDB');

    this.version(1).stores({
      setores: '++id, nome',
      itens: '++id, nome, setor_id, quantidade, prateleira, piso_andar, local_setor, organizador',
      movimentacoes: '++id, item_id, tipo, created_at, matricula_usuario'
    });
  }
}

export const db = new Database();

// Função para popular dados iniciais (opcional)
export async function seedDatabase() {
  const setoresCount = await db.setores.count();
  if (setoresCount > 0) return;

  // Adicionar setores iniciais
  const setores = await db.setores.bulkAdd([
    { nome: 'MADA' },
    { nome: 'CEMIG' },
    { nome: 'JMMTECH' }
  ]);

  // Adicionar itens iniciais
  const cemigId = await db.setores.where('nome').equals('CEMIG').first().then(s => s?.id);
  if (cemigId) {
    await db.itens.bulkAdd([
      {
        nome: 'Óxido de grafeno - NANO VIEW',
        setor_id: cemigId,
        quantidade: 5,
        prateleira: '2',
        piso_andar: 'P1',
        local_setor: 'A',
        organizador: '73'
      },
      {
        nome: 'Parafuso M8 - Aço Inox',
        setor_id: cemigId,
        quantidade: 150,
        prateleira: '5',
        piso_andar: 'P2',
        local_setor: 'B',
        organizador: '12'
      }
    ]);
  }
}