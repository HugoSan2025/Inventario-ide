export interface Product {
  id: string; // Item code
  name: string;
  subwarehouse: string;
}

export interface ProductWithStock extends Product {
  stock: number;
}

export enum TransactionType {
  ENTRY = 'Entrada',
  EXIT = 'Salida',
}

export interface Transaction {
  id: string;
  productId: string;
  type: TransactionType;
  quantity: number;
  date: string;
  batch?: string;
  subwarehouse?: string;
  notes?: string;
}

export type ActiveTab = 'stock' | 'entries' | 'exits' | 'catalog';