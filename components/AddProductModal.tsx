import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { PlusCircleIcon } from './icons';

interface AddProductModalProps {
    isOpen: boolean;
    onSave: (product: Product) => void;
    onCancel: () => void;
    existingProductIds: Iterable<string>;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onSave, onCancel, existingProductIds }) => {
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [subwarehouse, setSubwarehouse] = useState('');
    const [error, setError] = useState('');

    const existingIdsSet = new Set(existingProductIds);

    useEffect(() => {
        if (isOpen) {
            setId('');
            setName('');
            setSubwarehouse('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleSave = () => {
        const trimmedId = id.trim();
        const trimmedName = name.trim();
        const trimmedSubwarehouse = subwarehouse.trim();

        if (!trimmedId || !trimmedName || !trimmedSubwarehouse) {
            setError('Todos los campos son obligatorios.');
            return;
        }

        if (existingIdsSet.has(trimmedId)) {
            setError(`El ITEM (ID) '${trimmedId}' ya existe. Por favor, ingrese un ID único.`);
            return;
        }
        
        onSave({
            id: trimmedId,
            name: trimmedName,
            subwarehouse: trimmedSubwarehouse,
        });
    };

    return (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-slate-900 bg-opacity-75 transition-opacity backdrop-blur-sm"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg border border-white/10 bg-slate-800 text-left shadow-2xl shadow-black/40 transition-all sm:my-8 sm:w-full sm:max-w-lg">
                        <div className="bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-900 sm:mx-0 sm:h-10 sm:w-10">
                                    <PlusCircleIcon className="h-6 w-6 text-indigo-400" aria-hidden="true" />
                                </div>
                                <div className="mt-3 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
                                    <h3 className="text-base font-semibold leading-6 text-slate-100" id="modal-title">Agregar Nuevo Producto</h3>
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <label htmlFor="new-product-id" className="block text-sm font-medium text-slate-300">
                                                ITEM (ID)
                                            </label>
                                            <input
                                                type="text"
                                                id="new-product-id"
                                                value={id}
                                                onChange={(e) => setId(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="new-product-name" className="block text-sm font-medium text-slate-300">
                                                Nombre del Producto
                                            </label>
                                            <input
                                                type="text"
                                                id="new-product-name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="new-product-subwarehouse" className="block text-sm font-medium text-slate-300">
                                                Subalmacén
                                            </label>
                                            <input
                                                type="text"
                                                id="new-product-subwarehouse"
                                                value={subwarehouse}
                                                onChange={(e) => setSubwarehouse(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                        {error && <p className="text-sm text-red-400">{error}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button
                                type="button"
                                className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                                onClick={handleSave}
                            >
                                Guardar Producto
                            </button>
                            <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 sm:mt-0 sm:w-auto"
                                onClick={onCancel}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddProductModal;