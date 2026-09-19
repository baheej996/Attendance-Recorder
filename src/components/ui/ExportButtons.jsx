import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Reusable UI button pair for Excel and PDF Export actions
 * @param {Function} onExportExcel - Callback function when Excel button is clicked
 * @param {Function} onExportPDF - Callback function when PDF button is clicked
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} className - Optional additional classes
 * @param {boolean} disabled - Disable buttons state
 */
export const ExportButtons = ({ 
    onExportExcel, 
    onExportPDF, 
    size = "md",
    className = "",
    disabled = false
}) => {
    const isSmall = size === "sm";

    return (
        <div className={clsx("flex items-center gap-2 flex-wrap", className)}>
            <button
                type="button"
                onClick={onExportExcel}
                disabled={disabled}
                className={clsx(
                    "bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                    isSmall ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-xs"
                )}
                title="Export data to Microsoft Excel (.xlsx)"
            >
                <FileSpreadsheet className={isSmall ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span>Excel</span>
            </button>

            <button
                type="button"
                onClick={onExportPDF}
                disabled={disabled}
                className={clsx(
                    "bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                    isSmall ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-xs"
                )}
                title="Export data to PDF document (.pdf)"
            >
                <FileText className={isSmall ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span>PDF</span>
            </button>
        </div>
    );
};

export default ExportButtons;
