import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (data, headers, filename, title) => {
    const doc = new jsPDF('landscape');
    
    // Add Title
    if (title) {
        doc.setFontSize(18);
        doc.text(title, 14, 22);
    }
    
    // Auto Table
    doc.autoTable({
        startY: title ? 30 : 10,
        head: [headers],
        body: data,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        horizontalPageBreak: true // allow many columns
    });
    
    doc.save(`${filename}.pdf`);
};
