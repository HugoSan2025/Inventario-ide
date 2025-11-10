

import React, { useState, useRef, useMemo } from 'react';
import { Product, Transaction, TransactionType, ActiveTab } from '../types';
import { SearchIcon, UploadIcon, PlusIcon, MinusIcon, BoltIcon, FilterIcon, XCircleIcon } from './icons';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ActionPanelProps {
    products: Product[];
    onNewTransaction: (newTx: Omit<Transaction, 'id' | 'date'>) => void;
    onFileUpload: (data: any[]) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeTab: ActiveTab;
    uniqueSubwarehouses: string[];
    exitSubwarehouseFilter: string;
    onExitSubwarehouseChange: (filter: string) => void;
    exitStartDate: string;
    onExitStartDateChange: (date: string) => void;
    exitEndDate: string;
    onExitEndDateChange: (date: string) => void;
    entryStartDate: string;
    onEntryStartDateChange: (date: string) => void;
    entryEndDate: string;
    onEntryEndDateChange: (date: string) => void;
    onApplyEntryFilters: () => void;
    onClearEntryFilters: () => void;
    onApplyExitFilters: () => void;
    onClearExitFilters: () => void;
    stockLevelFilters: Set<number>;
    onStockLevelChange: (filters: Set<number>) => void;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
    products,
    onNewTransaction,
    onFileUpload,
    searchQuery,
    onSearchChange,
    activeTab,
    uniqueSubwarehouses,
    exitSubwarehouseFilter,
    onExitSubwarehouseChange,
    exitStartDate,
    onExitStartDateChange,
    exitEndDate,
    onExitEndDateChange,
    entryStartDate,
    onEntryStartDateChange,
    entryEndDate,
    onEntryEndDateChange,
    onApplyEntryFilters,
    onClearEntryFilters,
    onApplyExitFilters,
    onClearExitFilters,
    stockLevelFilters,
    onStockLevelChange,
}) => {
    // Form state
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [batch, setBatch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

    const filteredProducts = useMemo(() => {
        if (!productSearch) {
            return [];
        }
        const lowercasedQuery = productSearch.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowercasedQuery) ||
            p.id.toLowerCase().includes(lowercasedQuery)
        ).slice(0, 100);
    }, [products, productSearch]);
    
    const handleProductSelect = (productId: string) => {
        setSelectedProductId(productId);
        const product = products.find(p => p.id === productId);
        setProductSearch(product ? `(${product.id}) ${product.name}` : '');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId || quantity <= 0) {
            alert('Por favor, seleccione un producto y especifique una cantidad válida.');
            return;
        }

        const product = products.find(p => p.id === selectedProductId);
        if (!product) {
            alert('Producto no encontrado.');
            return;
        }

        const transactionType = activeTab === 'entries' ? TransactionType.ENTRY : TransactionType.EXIT;

        if (transactionType === TransactionType.EXIT && !batch.trim()) {
            alert('Por favor, ingrese el lote para la salida.');
            return;
        }
        
        onNewTransaction({
            productId: selectedProductId,
            quantity,
            type: transactionType,
            batch: transactionType === TransactionType.EXIT ? batch : undefined,
            subwarehouse: product.subwarehouse,
        });

        // Reset form
        setSelectedProductId('');
        setQuantity(1);
        setBatch('');
        setProductSearch('');
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileHandler: (data: any[]) => void) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        const processData = (parsedData: any[]) => {
            fileHandler(parsedData);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };

        if (fileExtension === 'csv') {
            reader.onload = (e) => {
                const text = e.target?.result as string;
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => processData(results.data),
                });
            };
            reader.readAsText(file);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
             reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                processData(json);
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('Formato de archivo no soportado. Por favor, suba un archivo CSV o XLSX.');
        }
    };

    const handleStockLevelChange = (level: number, checked: boolean) => {
        const newFilters = new Set(stockLevelFilters);
        if (checked) {
            newFilters.add(level);
        } else {
            newFilters.delete(level);
        }
        onStockLevelChange(newFilters);
    };
    
    const renderTransactionPanel = () => (
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-200">
                <BoltIcon className="h-6 w-6 text-indigo-400"/>
                {activeTab === 'entries' ? 'Registrar Entrada' : 'Registrar Salida'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <label htmlFor="product-search" className="block text-sm font-medium text-slate-300 mb-1">Buscar Producto</label>
                    <div className="relative">
                        <input
                            id="product-search"
                            type="text"
                            value={productSearch}
                            onChange={(e) => {
                                setProductSearch(e.target.value);
                                setSelectedProductId(''); // Clear selection when user types
                            }}
                            placeholder="Buscar por nombre o código..."
                            autoComplete="off"
                            className="block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 pr-10 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        />
                         {productSearch && (
                            <button
                                type="button"
                                onClick={() => {
                                    setProductSearch('');
                                    setSelectedProductId('');
                                }}
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                                title="Limpiar búsqueda"
                            >
                                <XCircleIcon className="h-5 w-5 text-slate-400 hover:text-slate-200" />
                            </button>
                        )}
                    </div>
                    {productSearch && filteredProducts.length > 0 && selectedProductId === '' && (
                         <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                            {filteredProducts.map(p => (
                                <li
                                    key={p.id}
                                    onClick={() => handleProductSelect(p.id)}
                                    className="relative cursor-pointer select-none py-2 px-3 text-slate-300 hover:bg-indigo-600 hover:text-white"
                                >
                                    {`(${p.id}) ${p.name}`}
                                </li>
                            ))}
                        </ul>
                    )}
                     {selectedProduct && <p className="mt-1 text-xs text-slate-400">Subalmacén: {selectedProduct.subwarehouse}</p>}
                </div>
                 {activeTab === 'exits' && (
                    <div>
                        <label htmlFor="batch" className="block text-sm font-medium text-slate-300 mb-1">Lote</label>
                        <input
                            id="batch"
                            type="text"
                            value={batch}
                            onChange={(e) => setBatch(e.target.value)}
                            required
                            className="block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="Ej: LOTE12345"
                        />
                    </div>
                )}
                <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-slate-300 mb-1">Cantidad</label>
                    <input
                        id="quantity"
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                        required
                        className="block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!selectedProductId || quantity <= 0}
                    className={`w-full flex justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed ${
                        activeTab === 'entries' ? 'bg-green-500 hover:bg-green-400 disabled:opacity-50' : 'bg-red-500 hover:bg-red-400 disabled:opacity-50'
                    }`}
                >
                    {activeTab === 'entries' ? <><PlusIcon className="h-5 w-5 mr-2"/>Registrar Entrada</> : <><MinusIcon className="h-5 w-5 mr-2"/>Registrar Salida</>}
                </button>
            </form>
        </div>
    );

     const renderEntryFiltersPanel = () => (
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-md">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-200">
                <FilterIcon className="h-6 w-6 text-indigo-400"/>
                Filtros de Entrada
            </h2>
            <div className="space-y-4">
                 <div>
                    <label htmlFor="entry-start-date" className="block text-sm font-medium text-slate-300 mb-1">Fecha de Inicio</label>
                    <input
                        type="date"
                        id="entry-start-date"
                        value={entryStartDate}
                        onChange={(e) => onEntryStartDateChange(e.target.value)}
                        className="block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="entry-end-date" className="block text-sm font-medium text-slate-300 mb-1">Fecha de Fin</label>
                    <input
                        type="date"
                        id="entry-end-date"
                        value={entryEndDate}
                        onChange={(e) => onEntryEndDateChange(e.target.value)}
                        className="block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={onApplyEntryFilters}
                        className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        Filtrar
                    </button>
                    <button
                        onClick={onClearEntryFilters}
                        className="flex-1 rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-500"
                    >
                        Limpiar
                    </button>
                </div>
            </div>
        </div>
    );
    
    const renderExitFiltersPanel = () => (
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-md">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-200">
                <FilterIcon className="h-6 w-6 text-indigo-400"/>
                Filtros de Salida
            </h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="exit-subwarehouse-filter" className="block text-sm font-medium text-slate-300 mb-1">Subalmacén</label>
                    <select
                        id="exit-subwarehouse-filter"
                        value={exitSubwarehouseFilter}
                        onChange={(e) => onExitSubwarehouseChange(e.target.value)}
                        className="block w-full rounded-md border-slate-600 bg-slate-700 py-2 pl-3 pr-10 text-sm font-medium text-slate-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    >
                        {uniqueSubwarehouses.map(wh => (
                            <option key={wh} value={wh}>{wh === 'all' ? 'Todos los Subalmacenes' : wh}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="exit-start-date" className="block text-sm font-medium text-slate-300 mb-1">Fecha de Inicio</label>
                    <input
                        type="date"
                        id="exit-start-date"
                        value={exitStartDate}
                        onChange={(e) => onExitStartDateChange(e.target.value)}
                        className="block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="exit-end-date" className="block text-sm font-medium text-slate-300 mb-1">Fecha de Fin</label>
                    <input
                        type="date"
                        id="exit-end-date"
                        value={exitEndDate}
                        onChange={(e) => onExitEndDateChange(e.target.value)}
                        className="block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={onApplyExitFilters}
                        className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        Filtrar
                    </button>
                    <button
                        onClick={onClearExitFilters}
                        className="flex-1 rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-500"
                    >
                        Limpiar
                    </button>
                </div>
            </div>
        </div>
    );

    const STOCK_LEVEL_OPTIONS = [
        { value: 0, label: '0' },
        { value: 1, label: '1' },
        { value: 2, label: '2' },
        { value: 3, label: '3' },
        { value: 4, label: '4' },
        { value: 5, label: '5 o más' },
    ];

    const renderStockFiltersPanel = () => (
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-md">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-200">
                <FilterIcon className="h-6 w-6 text-indigo-400"/>
                Filtrar por Stock
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {STOCK_LEVEL_OPTIONS.map(({ value, label }) => (
                    <div key={value} className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input
                                id={`stock-filter-${value}`}
                                name={`stock-filter-${value}`}
                                type="checkbox"
                                checked={stockLevelFilters.has(value)}
                                onChange={(e) => handleStockLevelChange(value, e.target.checked)}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-indigo-600 focus:ring-indigo-600"
                            />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor={`stock-filter-${value}`} className="cursor-pointer font-medium text-slate-300">
                                {label}
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFileUploadPanel = () => (
         <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-md">
             <h2 className="mb-4 text-lg font-bold text-slate-200">Importar Entradas</h2>
             <p className="text-sm text-slate-400 mb-4">
                 Sube un archivo CSV o XLSX con las columnas "CÓDIGO DE ITEM" y "CANTIDAD".
             </p>
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e, onFileUpload)}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
            />
             <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex justify-center items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
                <UploadIcon className="h-5 w-5" /> Cargar Entradas desde Archivo
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-md">
                <h2 className="mb-4 text-lg font-bold text-slate-200">Búsqueda y Filtros</h2>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={`Buscar en tabla principal...`}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full rounded-md border-slate-600 bg-slate-700 py-2 pl-10 pr-10 font-bold text-slate-200 placeholder-slate-400/80 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            title="Limpiar búsqueda"
                        >
                            <XCircleIcon className="h-5 w-5 text-slate-400 hover:text-slate-200" />
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'stock' && renderStockFiltersPanel()}
            
            {activeTab === 'entries' && (
                <>
                    {renderEntryFiltersPanel()}
                    {renderTransactionPanel()}
                    {renderFileUploadPanel()}
                </>
            )}

            {activeTab === 'exits' && (
                <>
                    {renderExitFiltersPanel()}
                    {renderTransactionPanel()}
                </>
            )}
        </div>
    );
};

export default ActionPanel;