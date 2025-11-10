import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Header from './components/Header';
import InventoryDashboard from './components/InventoryDashboard';
import ActionPanel from './components/ActionPanel';
import { Product, Transaction, TransactionType, ProductWithStock, ActiveTab } from './types';
import { productList, warehouseName } from './data/products';
import ConfirmModal from './components/ConfirmModal';

const App: React.FC = () => {
    // Local storage keys are now specific to the warehouse
    const productsStorageKey = `inventory_products_${warehouseName}`;
    const transactionsStorageKey = `inventory_transactions_${warehouseName}`;
    const markedRowsStorageKey = `inventory_marked_rows_${warehouseName}`;

    const [products, setProducts] = useState<Product[]>(() => {
        try {
            const saved = localStorage.getItem(productsStorageKey);
            // If there's a saved list, use it. Otherwise, use the default from the file.
            return saved ? JSON.parse(saved) : productList;
        } catch (error) {
            console.error("Error parsing products from localStorage", error);
            return productList;
        }
    });

    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        try {
            const saved = localStorage.getItem(transactionsStorageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Error parsing transactions from localStorage", error);
            return [];
        }
    });

    const [markedTransactionIds, setMarkedTransactionIds] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem(markedRowsStorageKey);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch (error) {
            console.error("Error parsing marked rows from localStorage", error);
            return new Set();
        }
    });

    useEffect(() => {
        localStorage.setItem(productsStorageKey, JSON.stringify(products));
    }, [products, productsStorageKey]);

    useEffect(() => {
        localStorage.setItem(transactionsStorageKey, JSON.stringify(transactions));
    }, [transactions, transactionsStorageKey]);

    useEffect(() => {
        localStorage.setItem(markedRowsStorageKey, JSON.stringify(Array.from(markedTransactionIds)));
    }, [markedTransactionIds, markedRowsStorageKey]);

    const [activeTab, setActiveTab] = useState<ActiveTab>('stock');
    const [searchQuery, setSearchQuery] = useState('');
    const [stockSubwarehouseFilter, setStockSubwarehouseFilter] = useState('all');
    const [stockLevelFilters, setStockLevelFilters] = useState<Set<number>>(new Set());
    
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        confirmText?: string;
        showCancelButton?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

    // Filters state
    const [entryStartDate, setEntryStartDate] = useState('');
    const [entryEndDate, setEntryEndDate] = useState('');
    const [appliedEntryStartDate, setAppliedEntryStartDate] = useState('');
    const [appliedEntryEndDate, setAppliedEntryEndDate] = useState('');
    
    const [exitSubwarehouseFilter, setExitSubwarehouseFilter] = useState('all');
    const [exitStartDate, setExitStartDate] = useState('');
    const [exitEndDate, setExitEndDate] = useState('');
    const [appliedExitSubwarehouseFilter, setAppliedExitSubwarehouseFilter] = useState('all');
    const [appliedExitStartDate, setAppliedExitStartDate] = useState('');
    const [appliedExitEndDate, setAppliedExitEndDate] = useState('');

    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    const productStock = useMemo(() => {
        const stockMap = new Map<string, number>();
        products.forEach(p => stockMap.set(p.id, 0));
        transactions.forEach(tx => {
            const currentStock = stockMap.get(tx.productId) || 0;
            if (tx.type === TransactionType.ENTRY) {
                stockMap.set(tx.productId, currentStock + tx.quantity);
            } else {
                stockMap.set(tx.productId, currentStock - tx.quantity);
            }
        });
        return stockMap;
    }, [products, transactions]);

    const productsWithStock = useMemo<ProductWithStock[]>(() => {
        return products.map(p => ({
            ...p,
            stock: productStock.get(p.id) || 0,
        }));
    }, [products, productStock]);

    const uniqueSubwarehouses = useMemo(() => {
        const warehouses = new Set(products.map(p => p.subwarehouse));
        return ['all', ...Array.from(warehouses).sort()];
    }, [products]);

    const filteredInventory = useMemo(() => {
        return productsWithStock.filter(product => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = product.name.toLowerCase().includes(searchLower) ||
                                  product.id.toLowerCase().includes(searchLower) ||
                                  product.subwarehouse.toLowerCase().includes(searchLower);

            const matchesSubwarehouse = stockSubwarehouseFilter === 'all' || product.subwarehouse === stockSubwarehouseFilter;

            const matchesStockLevel = stockLevelFilters.size === 0 ||
                stockLevelFilters.has(product.stock) ||
                (stockLevelFilters.has(5) && product.stock >= 5);

            return matchesSearch && matchesSubwarehouse && matchesStockLevel;
        });
    }, [productsWithStock, searchQuery, stockSubwarehouseFilter, stockLevelFilters]);
    
    const entries = useMemo(() => transactions.filter(tx => tx.type === TransactionType.ENTRY), [transactions]);
    const exits = useMemo(() => transactions.filter(tx => tx.type === TransactionType.EXIT), [transactions]);

    const filteredEntries = useMemo(() => {
        return entries.filter(tx => {
            const product = productMap.get(tx.productId);
            if (!product) return false;

            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = product.name.toLowerCase().includes(searchLower) ||
                                  product.id.toLowerCase().includes(searchLower);
            
            const txDate = new Date(tx.date);
            const matchesStartDate = !appliedEntryStartDate || txDate >= new Date(appliedEntryStartDate);
            const matchesEndDate = !appliedEntryEndDate || txDate <= new Date(appliedEntryEndDate);

            return matchesSearch && matchesStartDate && matchesEndDate;
        });
    }, [entries, searchQuery, productMap, appliedEntryStartDate, appliedEntryEndDate]);

    const filteredExits = useMemo(() => {
        return exits.filter(tx => {
            const product = productMap.get(tx.productId);
            if (!product) return false;

            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = product.name.toLowerCase().includes(searchLower) ||
                                  product.id.toLowerCase().includes(searchLower) ||
                                  (tx.batch && tx.batch.toLowerCase().includes(searchLower)) ||
                                  (tx.subwarehouse && tx.subwarehouse.toLowerCase().includes(searchLower));
            
            const matchesSubwarehouse = appliedExitSubwarehouseFilter === 'all' || tx.subwarehouse === appliedExitSubwarehouseFilter;
            
            const txDate = new Date(tx.date);
            const matchesStartDate = !appliedExitStartDate || txDate >= new Date(appliedExitStartDate);
            const matchesEndDate = !appliedExitEndDate || txDate <= new Date(appliedExitEndDate);

            return matchesSearch && matchesSubwarehouse && matchesStartDate && matchesEndDate;
        });
    }, [exits, searchQuery, productMap, appliedExitSubwarehouseFilter, appliedExitStartDate, appliedExitEndDate]);


    const handleNewTransaction = useCallback((newTx: Omit<Transaction, 'id' | 'date'>) => {
        if (newTx.type === TransactionType.EXIT) {
            const stock = productStock.get(newTx.productId) || 0;
            if (stock < newTx.quantity) {
                setModalState({
                    isOpen: true,
                    title: 'Stock Insuficiente',
                    message: `No hay suficiente stock para el producto seleccionado. Stock actual: ${stock}.`,
                    confirmText: 'Entendido',
                    onConfirm: closeModal,
                    showCancelButton: false
                });
                return;
            }
        }
        setTransactions(prev => [...prev, { ...newTx, id: crypto.randomUUID(), date: new Date().toISOString() }]);
    }, [productStock]);

    const handleDeleteTransaction = useCallback((transactionId: string) => {
        setModalState({
            isOpen: true,
            title: 'Confirmar Eliminación',
            message: '¿Está seguro de que desea eliminar esta transacción? Esta acción no se puede deshacer.',
            onConfirm: () => {
                setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
                closeModal();
            }
        });
    }, []);

    const handleFileUpload = useCallback((data: any[]) => {
        const newEntries: Omit<Transaction, 'id' | 'date'>[] = [];
        const uploadErrors: { row: number; data: any; reason: string }[] = [];

        const findValueInRow = (row: any, possibleKeys: string[]): any | undefined => {
            const lowerCaseRow = Object.keys(row).reduce((acc, key) => {
                acc[key.toLowerCase().trim()] = row[key];
                return acc;
            }, {} as Record<string, any>);

            for (const key of possibleKeys) {
                if (lowerCaseRow[key] !== undefined) {
                    return lowerCaseRow[key];
                }
            }
            return undefined;
        };

        const idKeys = ['código de item', 'id', 'item', 'codigo'];
        const quantityKeys = ['cantidad', 'quantity', 'numero', 'cant.'];

        data.forEach((row, index) => {
            const rowNumber = index + 2;
            const productIdValue = findValueInRow(row, idKeys);
            const quantityValue = findValueInRow(row, quantityKeys);

            if (productIdValue === undefined) {
                uploadErrors.push({ row: rowNumber, data: row, reason: "No se encontró la columna de código ('ID', 'Codigo', etc.)." });
                return;
            }
            if (quantityValue === undefined) {
                uploadErrors.push({ row: rowNumber, data: row, reason: "No se encontró la columna de cantidad ('Cantidad', 'Numero', etc.)." });
                return;
            }

            const productId = String(productIdValue || '').trim();
            const quantity = parseInt(String(quantityValue || '0'), 10);

            if (!productId) {
                 uploadErrors.push({ row: rowNumber, data: row, reason: "El código del producto está vacío." });
                 return;
            }

            const product = productMap.get(productId);

            if (!product) {
                uploadErrors.push({ row: rowNumber, data: row, reason: `El producto con código '${productId}' no existe en el sistema.` });
                return;
            }
            
            if (isNaN(quantity) || quantity < 0) {
                 uploadErrors.push({ row: rowNumber, data: row, reason: `La cantidad '${quantityValue}' no es un número válido o es negativo.` });
                 return;
            }

            if (quantity > 0) {
                newEntries.push({
                    productId: product.id,
                    quantity: quantity,
                    type: TransactionType.ENTRY,
                    subwarehouse: product.subwarehouse
                });
            }
        });

        if (uploadErrors.length > 0) {
            console.groupCollapsed(`[Errores de Importación] Se encontraron ${uploadErrors.length} filas con problemas`);
            uploadErrors.forEach(err => {
                console.error(`Fila ${err.row}: ${err.reason}`, 'Datos:', err.data);
            });
            console.groupEnd();
        }

        if (newEntries.length > 0) {
            const errorMsg = uploadErrors.length > 0 ? (
                <p className="mt-2 text-xs">
                    {uploadErrors.length} fila(s) inválida(s) fueron ignoradas.
                    <br />
                    Presione F12 para ver los errores en la consola.
                </p>
            ) : null;
    
            setModalState({
                isOpen: true,
                title: 'Confirmar Importación',
                message: (
                    <>
                        <p>{newEntries.length} entradas válidas encontradas. ¿Desea registrarlas?</p>
                        {errorMsg}
                    </>
                ),
                confirmText: 'Registrar',
                onConfirm: () => {
                    setTransactions(prev => [...prev, ...newEntries.map(tx => ({ ...tx, id: crypto.randomUUID(), date: new Date().toISOString() }))]);
                    closeModal();
                }
            });
        } else {
            setModalState({
                isOpen: true,
                title: 'Importación Fallida',
                message: 'No se encontraron entradas válidas en el archivo. Revise la consola del desarrollador (F12) para ver los errores detallados por fila.',
                confirmText: 'Entendido',
                onConfirm: closeModal,
                showCancelButton: false
            });
        }
    }, [productMap]);

    const handleToggleMarkTransaction = useCallback((transactionId: string) => {
        setMarkedTransactionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(transactionId)) {
                newSet.delete(transactionId);
            } else {
                newSet.add(transactionId);
            }
            return newSet;
        });
    }, []);

    const handleApplyEntryFilters = () => {
        setAppliedEntryStartDate(entryStartDate);
        setAppliedEntryEndDate(entryEndDate);
    };
    const handleClearEntryFilters = () => {
        setEntryStartDate('');
        setEntryEndDate('');
        setAppliedEntryStartDate('');
        setAppliedEntryEndDate('');
    };
    const handleApplyExitFilters = () => {
        setAppliedExitSubwarehouseFilter(exitSubwarehouseFilter);
        setAppliedExitStartDate(exitStartDate);
        setAppliedExitEndDate(exitEndDate);
    };
    const handleClearExitFilters = () => {
        setExitSubwarehouseFilter('all');
        setExitStartDate('');
        setExitEndDate('');
        setAppliedExitSubwarehouseFilter('all');
        setAppliedExitStartDate('');
        setAppliedExitEndDate('');
    };
    
    useEffect(() => {
      setSearchQuery('');
      setStockSubwarehouseFilter('all');
      setStockLevelFilters(new Set());
    }, [activeTab]);

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <ConfirmModal
                isOpen={modalState.isOpen}
                title={modalState.title}
                onConfirm={modalState.onConfirm}
                onCancel={closeModal}
                confirmText={modalState.confirmText}
                showCancelButton={modalState.showCancelButton}
            >
                {modalState.message}
            </ConfirmModal>
            <Header warehouseName={warehouseName} />
            <main className="mx-auto mt-6 grid max-w-screen-2xl grid-cols-1 gap-6 lg:grid-cols-4">
                <div className="lg:col-span-3">
                    <InventoryDashboard
                        inventory={filteredInventory}
                        entryTransactions={filteredEntries}
                        exitTransactions={filteredExits}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        onDeleteTransaction={handleDeleteTransaction}
                        uniqueSubwarehouses={uniqueSubwarehouses}
                        selectedSubwarehouse={stockSubwarehouseFilter}
                        onSubwarehouseChange={setStockSubwarehouseFilter}
                        products={productsWithStock}
                        markedTransactionIds={markedTransactionIds}
                        onToggleMarkTransaction={handleToggleMarkTransaction}
                    />
                </div>
                <div className="lg:col-span-1">
                    <ActionPanel
                        products={products}
                        onNewTransaction={handleNewTransaction}
                        onFileUpload={handleFileUpload}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        activeTab={activeTab}
                        uniqueSubwarehouses={uniqueSubwarehouses}
                        exitSubwarehouseFilter={exitSubwarehouseFilter}
                        onExitSubwarehouseChange={setExitSubwarehouseFilter}
                        exitStartDate={exitStartDate}
                        onExitStartDateChange={setExitStartDate}
                        exitEndDate={exitEndDate}
                        onExitEndDateChange={setExitEndDate}
                        entryStartDate={entryStartDate}
                        onEntryStartDateChange={setEntryStartDate}
                        entryEndDate={entryEndDate}
                        onEntryEndDateChange={setEntryEndDate}
                        onApplyEntryFilters={handleApplyEntryFilters}
                        onClearEntryFilters={handleClearEntryFilters}
                        onApplyExitFilters={handleApplyExitFilters}
                        onClearExitFilters={handleClearExitFilters}
                        stockLevelFilters={stockLevelFilters}
                        onStockLevelChange={setStockLevelFilters}
                    />
                </div>
            </main>
        </div>
    );
};

export default App;