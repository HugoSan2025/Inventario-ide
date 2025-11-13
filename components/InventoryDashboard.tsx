import React from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Product, ProductWithStock, Transaction, ActiveTab } from '../types';
import { BoxIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, FilterIcon, TrashIcon, CheckCircleIcon, BookOpenIcon, PencilSquareIcon, PlusCircleIcon } from './icons';

interface InventoryDashboardProps {
    inventory: ProductWithStock[];
    entryTransactions: Transaction[];
    exitTransactions: Transaction[];
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    onDeleteTransaction: (transactionId: string) => void;
    uniqueSubwarehouses: string[];
    selectedSubwarehouse: string;
    onSubwarehouseChange: (subwarehouse: string) => void;
    products: ProductWithStock[];
    catalogProducts: Product[];
    markedTransactionIds: Set<string>;
    onToggleMarkTransaction: (transactionId: string) => void;
    onAddProduct: () => void;
    onEditProduct: (product: Product) => void;
    onDeleteProduct: (productId: string) => void;
}

const getStockLevel = (stock: number) => {
    if (stock <= 1) return { color: 'bg-red-500', textColor: 'text-red-400' };
    if (stock <= 4) return { color: 'bg-amber-500', textColor: 'text-amber-400' };
    return { color: 'bg-green-500', textColor: 'text-green-400' };
};

const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
    inventory,
    entryTransactions,
    exitTransactions,
    activeTab,
    onTabChange,
    onDeleteTransaction,
    uniqueSubwarehouses,
    selectedSubwarehouse,
    onSubwarehouseChange,
    products,
    catalogProducts,
    markedTransactionIds,
    onToggleMarkTransaction,
    onAddProduct,
    onEditProduct,
    onDeleteProduct,
}) => {
    const productMap = new Map<string, ProductWithStock>(products.map(p => [p.id, p]));

    const handleExport = (format: 'xlsx' | 'csv', data: any[], headers: string[], sheetName: string) => {
        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            XLSX.writeFile(workbook, `${sheetName}.xlsx`);
        } else {
            const csv = Papa.unparse(data, {
                columns: headers,
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `${sheetName}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };
    
    const TabButton: React.FC<{
        tabName: ActiveTab;
        label: string;
        icon: React.ReactNode;
    }> = ({ tabName, label, icon }) => (
        <button
            onClick={() => onTabChange(tabName)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                activeTab === tabName
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    const renderStockTable = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800/80">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-300 sm:pl-6">ITEM</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-300">STOCK ACTUAL</th>
                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-300">NOMBRE DEL PRODUCTO</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-300">SUBALMACÉN</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {inventory.length > 0 ? inventory.map(product => {
                        const stockLevel = getStockLevel(product.stock);
                        return (
                            <tr key={product.id} className="hover:bg-slate-800/50">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono text-slate-400 sm:pl-6">{product.id}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-3 w-3 rounded-full ${stockLevel.color}`}></span>
                                        <span className={`font-bold tabular-nums ${stockLevel.textColor}`}>{product.stock}</span>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-xs font-bold text-slate-200">{product.name}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-slate-300">{product.subwarehouse}</td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">No hay productos que coincidan.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
    
    const renderTransactionsTable = (transactions: Transaction[], type: 'entry' | 'exit') => {
        const isExitTable = type === 'exit';
        return (
             <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-slate-700">
                    <thead className="bg-slate-800/80">
                        <tr>
                            {isExitTable && <th scope="col" className="w-16 py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-slate-300 sm:pl-6">MARCAR</th>}
                            <th scope="col" className={`py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-300 sm:pl-6 ${isExitTable ? 'w-24' : 'w-auto'}`}>FECHA</th>
                            <th scope="col" className={`px-3 py-3.5 text-left text-sm font-semibold text-slate-300 ${isExitTable ? 'w-28' : 'w-auto'}`}>ITEM</th>
                            <th scope="col" className={`px-3 py-3.5 text-center text-sm font-semibold text-slate-300 ${isExitTable ? '' : 'w-auto'}`}>NOMBRE DEL PRODUCTO</th>
                            {isExitTable && <th scope="col" className="w-48 px-3 py-3.5 text-left text-sm font-semibold text-slate-300">SUBALMACÉN</th>}
                            {isExitTable && <th scope="col" className="w-24 pl-5 pr-3 py-3.5 text-left text-sm font-semibold text-slate-300">LOTE</th>}
                            {isExitTable && <th scope="col" className="w-24 px-3 py-3.5 text-left text-sm font-semibold text-slate-300">NOTAS</th>}
                            <th scope="col" className={`px-3 py-3.5 text-right text-sm font-semibold text-slate-300 ${isExitTable ? 'w-12' : 'w-auto'}`}>CANTIDAD</th>
                            <th scope="col" className={`relative py-3.5 pl-3 pr-4 sm:pr-6 ${isExitTable ? 'w-16' : 'w-auto'}`}><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                        {transactions.length > 0 ? transactions.map(tx => {
                            const product = productMap.get(tx.productId);
                            const isMarked = isExitTable && markedTransactionIds.has(tx.id);
                            return (
                                <tr key={tx.id} className={`transition-colors duration-300 hover:bg-slate-800/50 ${isMarked ? 'bg-orange-600/30' : ''}`}>
                                     {isExitTable && (
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-center sm:pl-6">
                                            <button onClick={() => onToggleMarkTransaction(tx.id)} className="transition-colors" title="Marcar/Desmarcar">
                                                <CheckCircleIcon className={`h-6 w-6 ${isMarked ? 'text-green-400' : 'text-slate-600 hover:text-slate-400'}`} />
                                            </button>
                                        </td>
                                    )}
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-400 sm:pl-6">{new Date(tx.date).toLocaleDateString()}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-slate-400">{tx.productId}</td>
                                    <td 
                                        title={product?.name || 'Producto no encontrado'}
                                        className="truncate px-3 py-4 text-xs font-bold text-slate-200"
                                    >
                                        {product?.name || 'Producto no encontrado'}
                                    </td>
                                    {isExitTable && 
                                        <td title={tx.subwarehouse || ''} className="truncate px-3 py-4 text-sm font-bold text-slate-300">
                                            {tx.subwarehouse}
                                        </td>
                                    }
                                    {isExitTable && <td className="whitespace-nowrap pl-5 pr-3 py-4 text-sm text-slate-300">{tx.batch}</td>}
                                    {isExitTable && (
                                        <td title={tx.notes || ''} className="truncate px-3 py-4 text-sm text-slate-400">
                                          {tx.notes}
                                        </td>
                                    )}
                                    <td className={`whitespace-nowrap px-3 py-4 text-right text-sm font-bold ${type === 'entry' ? 'text-green-400' : 'text-red-400'}`}>
                                        {type === 'entry' ? '+' : '-'}{tx.quantity}
                                    </td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6">
                                        <button onClick={() => onDeleteTransaction(tx.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar transacción">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={isExitTable ? 9 : 5} className="py-8 text-center text-slate-400">No hay transacciones.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )
    };
    
    const renderCatalogTable = () => (
        <div className="p-4 sm:p-6">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-base font-semibold leading-6 text-white">Catálogo de Productos</h1>
                    <p className="mt-2 text-sm text-gray-400">
                        Una lista de todos los productos en el sistema. Desde aquí puedes agregar, editar o eliminar productos.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <button
                        type="button"
                        onClick={onAddProduct}
                        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <PlusCircleIcon className="h-5 w-5" />
                        Agregar Producto
                    </button>
                </div>
            </div>
            <div className="mt-8 flow-root overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-800/80">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-300 sm:pl-6">ITEM</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-300">NOMBRE DEL PRODUCTO</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-300">SUBALMACÉN</th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                        {catalogProducts.length > 0 ? catalogProducts.map(product => (
                            <tr key={product.id} className="hover:bg-slate-800/50">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono text-slate-400 sm:pl-6">{product.id}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-xs font-bold text-slate-200">{product.name}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-slate-300">{product.subwarehouse}</td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                                    <button onClick={() => onEditProduct(product)} className="text-indigo-400 hover:text-indigo-300" title="Editar Producto">
                                        <PencilSquareIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => onDeleteProduct(product.id)} className="text-slate-400 hover:text-red-500" title="Eliminar Producto">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400">No hay productos que coincidan con la búsqueda.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const exportButtons = (
        <div className="flex items-center gap-2">
            <button
                onClick={() => {
                    let data: any[], headers: string[], name: string;
                    let format: 'xlsx' | 'csv' = 'xlsx';

                    if (activeTab === 'stock') {
                        headers = ["ITEM", "NOMBRE DEL PRODUCTO", "SUBALMACÉN", "STOCK ACTUAL"];
                        data = inventory.map(p => ({ "ITEM": p.id, "NOMBRE DEL PRODUCTO": p.name, "SUBALMACÉN": p.subwarehouse, "STOCK ACTUAL": p.stock }));
                        name = "Reporte_Stock";
                    } else if (activeTab === 'entries') {
                        headers = ["FECHA", "ITEM", "NOMBRE DEL PRODUCTO", "CANTIDAD"];
                        data = entryTransactions.map(tx => ({ FECHA: new Date(tx.date).toLocaleDateString(), "ITEM": tx.productId, "NOMBRE DEL PRODUCTO": productMap.get(tx.productId)?.name || "", CANTIDAD: tx.quantity }));
                        name = "Reporte_Entradas";
                    } else if (activeTab === 'exits') {
                        headers = ["ITEM", "LOTE", "CANTIDAD"];
                        data = exitTransactions.map(tx => ({
                            "ITEM": `="${tx.productId}"`,
                            LOTE: tx.batch || "",
                            CANTIDAD: tx.quantity
                        }));
                        name = "Reporte_Salidas";
                        format = 'csv';
                    } else {
                        return; // Should not happen with current ActiveTab type
                    }
                    handleExport(format, data, headers, name);
                }}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
                {activeTab === 'exits' ? 'Exportar a CSV' : 'Exportar a XLSX'}
            </button>
        </div>
    );


    return (
        <div className="rounded-xl border border-white/10 bg-slate-800/60 shadow-2xl shadow-black/40 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 p-4 sm:p-6">
                <div className="flex items-center gap-2 rounded-lg bg-slate-900/50 p-1">
                    <TabButton tabName="stock" label="Stock" icon={<BoxIcon className="h-5 w-5" />} />
                    <TabButton tabName="entries" label="Entradas" icon={<ArrowDownTrayIcon className="h-5 w-5" />} />
                    <TabButton tabName="exits" label="Salidas" icon={<ArrowUpTrayIcon className="h-5 w-5" />} />
                    <TabButton tabName="catalog" label="Catálogo" icon={<BookOpenIcon className="h-5 w-5" />} />
                </div>
                 <div className="flex items-center gap-4">
                    {activeTab === 'stock' && (
                        <div className="relative">
                            <label htmlFor="subwarehouse-filter" className="sr-only">Filtrar por subalmacén</label>
                            <select
                                id="subwarehouse-filter"
                                value={selectedSubwarehouse}
                                onChange={(e) => onSubwarehouseChange(e.target.value)}
                                className="appearance-none block w-full rounded-md border border-slate-600 bg-slate-700 py-2 pl-3 pr-10 text-sm font-medium text-slate-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            >
                                {uniqueSubwarehouses.map(wh => (
                                    <option key={wh} value={wh}>{wh === 'all' ? 'Todos los Subalmacenes' : wh}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                <FilterIcon className="h-5 w-5" />
                            </div>
                        </div>
                    )}
                    {['stock', 'entries', 'exits'].includes(activeTab) && exportButtons}
                </div>
            </div>
            <div className={['entries', 'exits', 'catalog'].includes(activeTab) ? 'max-h-[60vh] overflow-y-auto' : ''}>
                {activeTab === 'stock' && renderStockTable()}
                {activeTab === 'entries' && renderTransactionsTable(entryTransactions, 'entry')}
                {activeTab === 'exits' && renderTransactionsTable(exitTransactions, 'exit')}
                {activeTab === 'catalog' && renderCatalogTable()}
            </div>
        </div>
    );
};

export default InventoryDashboard;