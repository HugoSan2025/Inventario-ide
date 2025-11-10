import React from 'react';
import { ArchiveBoxIcon } from './icons';

interface HeaderProps {
    warehouseName: string;
}

const Header: React.FC<HeaderProps> = ({ warehouseName }) => {
    return (
        <header className="sticky top-4 z-40 mx-auto max-w-screen-2xl rounded-xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/40 backdrop-blur-md">
            <div className="container mx-auto flex items-center justify-between p-4">
                <div className="flex flex-1 items-center gap-3">
                    <ArchiveBoxIcon className="h-8 w-8 text-indigo-400" />
                    <span className="text-lg font-bold uppercase text-slate-300">{warehouseName}</span>
                </div>
                <h1 className="flex-1 text-center text-xl font-bold uppercase tracking-wider text-slate-200">
                    Sistema de Control de Inventario
                </h1>
                <div className="flex-1 text-right">
                    <span className="text-base font-bold text-slate-300">Made by Huguin</span>
                </div>
            </div>
        </header>
    );
};

export default Header;