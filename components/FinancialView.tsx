import React, { useState, useMemo } from 'react';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Plus,
    Calendar,
    Repeat,
    CheckCircle2,
    Circle,
    Trash2,
    Edit2,
    AlertCircle,
    ChevronRight,
    ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { backend } from '../services/supabaseBackend';
import { FinancialCost, FinancialIncome, User } from '../types';

interface FinancialViewProps {
    costs: FinancialCost[];
    income: FinancialIncome[];
    currentUser: User;
}

export const FinancialView: React.FC<FinancialViewProps> = ({ costs, income, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'costs' | 'income'>('costs');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'cost' | 'income'>('cost');
    const [editingItem, setEditingItem] = useState<FinancialCost | FinancialIncome | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        value: '',
        dueDay: '10',
        totalInstallments: '',
        isFixed: false,
        isRecurring: false
    });

    const totals = useMemo(() => {
        const totalIncome = income.reduce((acc, curr) => acc + curr.value, 0);
        const totalCosts = costs.filter(c => c.active).reduce((acc, curr) => acc + curr.value, 0);
        const balance = totalIncome - totalCosts;
        return { totalIncome, totalCosts, balance };
    }, [costs, income]);

    const handleOpenModal = (type: 'cost' | 'income', item?: FinancialCost | FinancialIncome) => {
        setModalType(type);
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                value: item.value.toString(),
                dueDay: item.dueDay.toString(),
                totalInstallments: (item as FinancialCost).totalInstallments?.toString() || '',
                isFixed: (item as FinancialCost).isFixed || false,
                isRecurring: (item as FinancialIncome).isRecurring || false
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                value: '',
                dueDay: '10',
                totalInstallments: '',
                isFixed: false,
                isRecurring: false
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(formData.value);
        const dueDay = parseInt(formData.dueDay);

        try {
            if (modalType === 'cost') {
                const costData = {
                    name: formData.name,
                    value,
                    dueDay,
                    isFixed: formData.isFixed,
                    totalInstallments: formData.isFixed ? null : parseInt(formData.totalInstallments) || null,
                    paidInstallments: editingItem ? (editingItem as FinancialCost).paidInstallments : 0,
                    active: true,
                    category: 'Geral'
                };

                if (editingItem) {
                    await backend.updateFinancialCost(editingItem.id, costData);
                } else {
                    await backend.createFinancialCost(costData);
                }
            } else {
                const incomeData = {
                    name: formData.name,
                    value,
                    dueDay,
                    isRecurring: formData.isRecurring
                };

                if (editingItem) {
                    await backend.updateFinancialIncome(editingItem.id, incomeData);
                } else {
                    await backend.createFinancialIncome(incomeData);
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            alert('Erro ao salvar: ' + (error as Error).message);
        }
    };

    const handleDelete = async (id: string, type: 'cost' | 'income') => {
        if (!confirm('Tem certeza que deseja excluir?')) return;
        try {
            if (type === 'cost') await backend.deleteFinancialCost(id);
            else await backend.deleteFinancialIncome(id);
        } catch (error) {
            alert('Erro ao excluir: ' + (error as Error).message);
        }
    };

    const handleTurnMonth = async () => {
        if (confirm('Isso irá incrementar as parcelas pagas de todos os custos ativos. Continuar?')) {
            try {
                await backend.turnMonth();
                alert('Mês financeiro atualizado com sucesso!');
            } catch (error) {
                alert('Erro ao virar o mês: ' + (error as Error).message);
            }
        }
    };

    return (
        <div className="flex flex-col gap-4 sm:gap-6 h-full overflow-hidden">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-navy-800/50 p-3 sm:p-4 rounded-xl border border-emerald-500/20 shadow-md shadow-emerald-500/5 flex items-center gap-3 min-w-0"
                >
                    <div className="shrink-0 p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <TrendingUp size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="block text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider truncate">Rendimentos</span>
                        <p className="text-base sm:text-lg font-bold text-white tracking-tight truncate">R$ {totals.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-navy-800/50 p-3 sm:p-4 rounded-xl border border-rose-500/20 shadow-md shadow-rose-500/5 flex items-center gap-3 min-w-0"
                >
                    <div className="shrink-0 p-2 rounded-lg bg-rose-500/10 text-rose-400">
                        <TrendingDown size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="block text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider truncate">Custos Ativos</span>
                        <p className="text-base sm:text-lg font-bold text-white tracking-tight truncate">R$ {totals.totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="col-span-2 bg-navy-800/50 p-3 sm:p-4 rounded-xl border border-blue-500/20 shadow-md shadow-blue-500/5 flex items-center gap-3 min-w-0"
                >
                    <div className="shrink-0 p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <DollarSign size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="block text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider truncate">Saldo Mensal</span>
                        <p className={`text-lg sm:text-xl font-bold tracking-tight truncate ${totals.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-navy-800/80 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col">
                {/* Header Tabs */}
                <div className="p-3 sm:p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                    <div className="flex bg-navy-900 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('costs')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'costs' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Custos
                        </button>
                        <button
                            onClick={() => setActiveTab('income')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'income' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Rendimentos
                        </button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleTurnMonth}
                            className="flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-lg bg-navy-900 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-all flex items-center gap-2"
                            title="Liquidar parcelas do mês e projetar próximo mês"
                        >
                            <ArrowRightLeft size={16} />
                            <span>Virar Mês</span>
                        </button>
                        <button
                            onClick={() => handleOpenModal(activeTab === 'costs' ? 'cost' : 'income')}
                            className="flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-lg bg-primary hover:bg-sky-400 text-white text-sm font-medium shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all"
                        >
                            <Plus size={16} />
                            Adicionar
                        </button>
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
                    {activeTab === 'costs' ? (
                        <div className="space-y-3">
                            {costs.length === 0 ? (
                                <div className="text-center py-20 opacity-50">Nenhum custo registrado.</div>
                            ) : (
                                costs.map((cost) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        key={cost.id}
                                        className={`p-3 sm:p-4 rounded-xl border group transition-all ${cost.active ? 'bg-navy-900/50 border-slate-800' : 'bg-slate-900/30 border-slate-900 opacity-60'}`}
                                    >
                                        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${cost.isFixed ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                {cost.isFixed ? <Repeat size={18} /> : <Calendar size={18} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2 sm:gap-4">
                                                    <h4 className="text-sm font-semibold text-white truncate flex-1">{cost.name}</h4>
                                                    <p className="text-sm font-bold text-white whitespace-nowrap">R$ {cost.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest font-medium">
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> Dia {cost.dueDay}</span>
                                                    {cost.isFixed ? (
                                                        <span className="text-indigo-400/80">Fixo</span>
                                                    ) : (
                                                        <span>{cost.paidInstallments}/{cost.totalInstallments || '?'}</span>
                                                    )}
                                                    <span className={`font-bold ${cost.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                        {cost.active ? 'Em Aberto' : 'Finalizado'}
                                                    </span>
                                                </div>
                                                {!cost.isFixed && cost.totalInstallments && (
                                                    <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                                                        <div
                                                            className="bg-rose-500 h-full transition-all duration-1000"
                                                            style={{ width: `${(cost.paidInstallments / cost.totalInstallments) * 100}%` }}
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-end gap-1 mt-2 sm:mt-1 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
                                                    <button onClick={() => handleOpenModal('cost', cost)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(cost.id, 'cost')} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {income.length === 0 ? (
                                <div className="text-center py-20 opacity-50">Nenhum rendimento registrado.</div>
                            ) : (
                                income.map((item) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        key={item.id}
                                        className="p-3 sm:p-4 bg-navy-900/50 rounded-xl border border-slate-800 group transition-all"
                                    >
                                        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${item.isRecurring ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {item.isRecurring ? <Repeat size={18} /> : <TrendingUp size={18} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2 sm:gap-4">
                                                    <h4 className="text-sm font-semibold text-white truncate flex-1">{item.name}</h4>
                                                    <p className="text-sm font-bold text-emerald-400 whitespace-nowrap">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest font-medium">
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> Dia {item.dueDay}</span>
                                                    <span className={item.isRecurring ? 'text-emerald-400/80' : 'text-blue-400/80'}>
                                                        {item.isRecurring ? 'Recorrente' : 'Único'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-end gap-1 mt-2 sm:mt-1 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
                                                    <button onClick={() => handleOpenModal('income', item)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id, 'income')} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal - Unified for Cost and Income */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-navy-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-4 sm:p-6 border-b border-slate-700 flex items-center justify-between shrink-0">
                                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                    {editingItem ? 'Editar' : 'Novo'} {modalType === 'cost' ? 'Custo' : 'Rendimento'}
                                </h3>
                            </div>

                            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nome</label>
                                    <input
                                        type="text" required
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Aluguel, Salário, Internet..."
                                        className="w-full bg-navy-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Valor</label>
                                        <input
                                            type="number" step="0.01" required inputMode="decimal"
                                            value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })}
                                            placeholder="0,00"
                                            className="w-full bg-navy-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Dia Vencimento</label>
                                        <input
                                            type="number" min="1" max="31" required inputMode="numeric"
                                            value={formData.dueDay} onChange={e => setFormData({ ...formData, dueDay: e.target.value })}
                                            className="w-full bg-navy-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                </div>

                                {modalType === 'cost' ? (
                                    <>
                                        <div className="flex items-center gap-3 p-3 bg-navy-900 rounded-xl border border-slate-700">
                                            <input
                                                type="checkbox" id="isFixed"
                                                checked={formData.isFixed} onChange={e => setFormData({ ...formData, isFixed: e.target.checked })}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-0"
                                            />
                                            <label htmlFor="isFixed" className="text-sm text-slate-300 font-medium cursor-pointer flex-1">Conta Fixa (Sem parcelas)</label>
                                        </div>

                                        {!formData.isFixed && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Total de Parcelas</label>
                                                <input
                                                    type="number" min="1" required={!formData.isFixed}
                                                    value={formData.totalInstallments} onChange={e => setFormData({ ...formData, totalInstallments: e.target.value })}
                                                    placeholder="Ex: 12"
                                                    className="w-full bg-navy-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                />
                                            </motion.div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 bg-navy-900 rounded-xl border border-slate-700">
                                        <input
                                            type="checkbox" id="isRecurring"
                                            checked={formData.isRecurring} onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-0"
                                        />
                                        <label htmlFor="isRecurring" className="text-sm text-slate-300 font-medium cursor-pointer flex-1">Recorrente Mensal</label>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button" onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 font-medium hover:bg-white/5 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        Salvar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
