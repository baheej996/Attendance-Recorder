import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

/**
 * Export flat array of objects to Excel (.xlsx) file
 * @param {Array<Object>} data 
 * @param {string} filename 
 * @param {string} sheetName 
 */
export const exportToExcel = (data = [], filename = 'export', sheetName = 'Sheet1') => {
    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (err) {
        console.error('Error exporting to Excel:', err);
    }
};

/**
 * Export multiple sheets to a single Excel (.xlsx) workbook
 * @param {Array<{sheetName: string, data: Array<Object>}>} sheets 
 * @param {string} filename 
 */
export const exportMultiSheetExcel = (sheets = [], filename = 'export') => {
    try {
        const wb = XLSX.utils.book_new();
        sheets.forEach(({ sheetName, data }) => {
            const ws = XLSX.utils.json_to_sheet(data || []);
            XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet');
        });
        XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (err) {
        console.error('Error exporting multi-sheet Excel:', err);
    }
};

/**
 * Export table data to PDF (.pdf) file
 * @param {Array<Array<any>>} data - Row arrays
 * @param {Array<string>} headers - Column header names
 * @param {string} filename 
 * @param {string} title 
 * @param {string} subtitle 
 * @param {string} orientation - 'landscape' | 'portrait'
 */
export const exportToPDF = (
    data = [], 
    headers = [], 
    filename = 'export', 
    title = '', 
    subtitle = '', 
    orientation = 'landscape'
) => {
    try {
        const doc = new jsPDF({ orientation, unit: 'mm' });
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Slate top banner header
        doc.setFillColor(30, 41, 59); // Slate-800
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text((title || filename).toUpperCase(), 14, 15);

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        const subText = subtitle || `Generated on: ${format(new Date(), 'PPP p')}`;
        doc.text(subText, 14, 22);

        // Render Table via autoTable
        const renderTable = doc.autoTable || autoTable;
        renderTable(doc, {
            startY: 32,
            head: [headers],
            body: data,
            styles: { 
                fontSize: 8, 
                cellPadding: 2.5, 
                font: 'helvetica',
                textColor: [31, 41, 55],
                overflow: 'linebreak'
            },
            headStyles: { 
                fillColor: [79, 70, 229], // Indigo-600
                textColor: [255, 255, 255], 
                fontStyle: 'bold' 
            },
            alternateRowStyles: { 
                fillColor: [249, 250, 251] 
            },
            margin: { top: 10, right: 10, bottom: 14, left: 10 },
            horizontalPageBreak: true
        });

        // Add page numbers footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(156, 163, 175);
            doc.text(
                `Page ${i} of ${pageCount} • Office Data Report`, 
                pageWidth - 14, 
                pageHeight - 6, 
                { align: 'right' }
            );
        }

        doc.save(`${filename}.pdf`);
    } catch (err) {
        console.error('Error exporting to PDF:', err);
    }
};
