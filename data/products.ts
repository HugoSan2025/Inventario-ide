import { Product } from '../types';
import { inmunoquimicaProducts } from './inmunoquimica';
import { hematologiaProducts } from './hematologia';
import { inmunologiaEspecialProducts } from './inmunologiaEspecial';

// --- INSTRUCCIONES PARA CONFIGURAR EL ALMACÉN ---
// 1. Elija el almacén que desea utilizar.
// 2. Modifique las dos líneas siguientes (`warehouseName` y `productList`) según corresponda.

// Opción 1: INMUNOQUIMICA
// export const warehouseName = 'INMUNOQUIMICA';
// export const productList: Product[] = inmunoquimicaProducts;

// Opción 2: HEMATOLOGIA
// export const warehouseName = 'HEMATOLOGIA';
// export const productList: Product[] = hematologiaProducts;

// Opción 3: INMUNOLOGIA ESPECIAL
export const warehouseName = 'INMUNOLOGIA ESPECIAL';
export const productList: Product[] = inmunologiaEspecialProducts;