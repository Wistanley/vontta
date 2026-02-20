import React from 'react';
import { WeeklyHistory, Task, BoardTask, Project, User } from '../types';
import { Calendar, Clock, CheckCircle, Download, ChevronRight, XCircle, Edit2, Save, X } from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { backend } from '../services/supabaseBackend';
import { useState } from 'react';

interface HistoryViewProps {
    history: WeeklyHistory[];
    projects: Project[];
    users: User[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, projects, users }) => {

    // State for renaming
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    // Helpers to resolve names
    const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || id;
    const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

    const startEditing = (week: WeeklyHistory) => {
        setEditingId(week.id);
        setEditTitle(week.title || `Semana de ${new Date(week.createdAt).toLocaleDateString('pt-BR')}`);
    };

    const saveTitle = async (id: string) => {
        try {
            await backend.updateWeeklyHistory(id, editTitle);
            setEditingId(null);
        } catch (error) {
            console.error(error);
            alert("Erro ao renomear");
        }
    };

    const handleExport = (week: WeeklyHistory) => {
        // 1. Prepare Data for Tasks Sheet
        const tasksData = week.tasks.map(t => ({
            Projeto: getProjectName(t.projectId),
            Setor: t.sector,
            Colaborador: getUserName(t.collaboratorId),
            'Atividade Planejada': t.plannedActivity,
            'Atividade Entregue': t.deliveredActivity,
            Status: t.status,
            Prioridade: t.priority,
            'Data Entrega': t.dueDate,
            'Horas Dedicadas': t.hoursDedicated,
            'Observações': t.notes
        }));

        // 2. Prepare Data for Board Sheet
        const boardData = week.boardTasks.map(b => {
            // Resolve member names if possible (assuming memberIds is array of strings)
            const members = b.memberIds?.map(mid => getUserName(mid)).join(', ') || '';
            return {
                Titulo: b.title,
                Status: b.status,
                'Data Inicio': b.startDate,
                'Data Fim': b.endDate,
                'Membros': members,
                'Descrição': b.description
            };
        });

        // 3. Create Workbook
        const wb = XLSX.utils.book_new();

        // Custom Header Helper
        const createSheetWithHeader = (data: any[], title: string) => {
            const ws = XLSX.utils.json_to_sheet([], { skipHeader: true });

            // LOGO / TITLE STYLE
            const titleStyle = {
                font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "1e293b" } }, // Navy-800
                alignment: { horizontal: "center", vertical: "center" }
            };

            const subTitleStyle = {
                font: { bold: true, sz: 12, color: { rgb: "94a3b8" } }, // Slate-400
                alignment: { horizontal: "center" }
            };

            // HEADER STYLE
            const headerStyle = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "3b82f6" } }, // Blue-500
                alignment: { horizontal: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };

            // DATA STYLE
            const dataStyle = {
                alignment: { wrapText: true, vertical: "top" },
                border: {
                    top: { style: "thin", color: { rgb: "cbd5e1" } },
                    bottom: { style: "thin", color: { rgb: "cbd5e1" } },
                    left: { style: "thin", color: { rgb: "cbd5e1" } },
                    right: { style: "thin", color: { rgb: "cbd5e1" } }
                }
            };

            // Add Title Rows
            XLSX.utils.sheet_add_aoa(ws, [
                ["Vontta - Relatório Semanal"],
                [`Semana de: ${new Date(week.createdAt).toLocaleDateString('pt-BR')}`],
                [""] // Empty row
            ], { origin: "A1" });

            // Apply Merge for Titles (Assuming ~10 cols)
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }
            ];

            // Apply Styles to Titles
            ws['A1'].s = titleStyle;
            // Note: Merged cells need style applied to the top-left cell ONLY, but sometimes all cells in range.
            // library handles it mostly.

            // Add Headers manually to apply style
            const headers = Object.keys(data[0] || {});
            XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });

            headers.forEach((h, i) => {
                const cellRef = XLSX.utils.encode_cell({ r: 3, c: i });
                if (!ws[cellRef]) ws[cellRef] = { v: h, t: 's' };
                ws[cellRef].s = headerStyle;
            });

            // Add Data
            XLSX.utils.sheet_add_json(ws, data, { origin: "A5", skipHeader: true });

            // Apply Data Styles
            const range = XLSX.utils.decode_range(ws['!ref'] || "A1");
            for (let R = 4; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                    if (ws[cellRef]) ws[cellRef].s = dataStyle;
                }
            }

            // Column Widths
            const wscols = headers.map(() => ({ wch: 25 }));
            ws['!cols'] = wscols;

            return ws;
        };

        const tasksSheet = createSheetWithHeader(tasksData, "Atividades");
        const boardSheet = createSheetWithHeader(boardData, "Quadro");

        XLSX.utils.book_append_sheet(wb, tasksSheet, "Atividades");
        XLSX.utils.book_append_sheet(wb, boardSheet, "Quadro");

        // 4. Download
        const fileName = `Vontta_Relatorio_${new Date(week.createdAt).toLocaleDateString().replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Calendar size={48} className="mb-4 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Nenhum histórico encontrado</h2>
                <p>Feche uma semana nas configurações para gerar um histórico.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Histórico Semanal</h2>
                    <p className="text-slate-400">Visualize e exporte os dados de semanas anteriores.</p>
                </div>
            </div>

            <div className="grid gap-4">
                {history.map((week) => (
                    <div key={week.id} className="bg-navy-800/50 border border-slate-700/50 rounded-xl p-6 hover:bg-navy-800 transition-all group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    {editingId === week.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="bg-navy-900 border border-slate-600 text-white rounded px-2 py-1 text-lg font-semibold w-64 focus:border-blue-500 outline-none"
                                                autoFocus
                                            />
                                            <button onClick={() => saveTitle(week.id)} className="text-emerald-400 hover:text-emerald-300"><Save size={18} /></button>
                                            <button onClick={() => setEditingId(null)} className="text-rose-400 hover:text-rose-300"><X size={18} /></button>
                                        </div>
                                    ) : (
                                        <h3 className="text-lg font-semibold text-white flex items-center gap-2 group/title">
                                            {week.title || `Semana de ${new Date(week.createdAt).toLocaleDateString('pt-BR')}`}
                                            <button
                                                onClick={() => startEditing(week)}
                                                className="opacity-0 group-hover/title:opacity-100 text-slate-500 hover:text-blue-400 transition-opacity"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </h3>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} />
                                            {week.totalHours} horas
                                        </span>
                                        <span className="flex items-center gap-1 text-emerald-400">
                                            <CheckCircle size={14} />
                                            {week.tasksCompleted} comcluídas
                                        </span>
                                        <span className="flex items-center gap-1 text-amber-400">
                                            <XCircle size={14} />
                                            {week.tasksPending} pendentes
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pl-16 md:pl-0">
                                <div className="text-right hidden md:block">
                                    <div className="text-sm font-medium text-slate-300">
                                        {week.tasks.length} Atividades
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {week.boardTasks.length} Cards no Quadro
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleExport(week)}
                                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Download size={16} />
                                    Baixar Excel
                                </button>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
