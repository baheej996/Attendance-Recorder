import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export const generateCSVTemplate = async (type) => {
    if (type === 'fee_payment' || type === 'fee_payments') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fee Payments');

        worksheet.columns = [
            { header: 'RegisterNo', key: 'registerNo', width: 15 },
            { header: 'StudentName', key: 'studentName', width: 30 },
            { header: 'Installment1', key: 'inst1', width: 15 },
            { header: 'Installment2', key: 'inst2', width: 15 },
            { header: 'Installment3', key: 'inst3', width: 15 },
            { header: 'PaymentMode', key: 'paymentMode', width: 18 },
            { header: 'PaymentDate', key: 'paymentDate', width: 15 },
            { header: 'AcademicYear', key: 'academicYear', width: 25 },
            { header: 'Remarks', key: 'remarks', width: 25 }
        ];

        worksheet.addRow({
            registerNo: '26M01B07',
            studentName: 'RAIZA THOTTUNGAL SHIHAB',
            inst1: 4233,
            inst2: 0,
            inst3: 0,
            paymentMode: 'Cash',
            paymentDate: '30-05-2026',
            academicYear: '2026-2027 (Current Year)',
            remarks: 'Admission fee'
        });

        worksheet.addRow({
            registerNo: '26M01B03',
            studentName: 'MUHAMMED ZAYNI AL DAHLAN',
            inst1: 4233,
            inst2: 4233,
            inst3: 0,
            paymentMode: 'UPI',
            paymentDate: '30-05-2026',
            academicYear: '2025-2026 (Previous Year)',
            remarks: 'Previous year arrear payment'
        });

        // Add Data Validation dropdown list for PaymentMode column F & AcademicYear column G (F2:G500)
        for (let row = 2; row <= 500; row++) {
            const cellMode = worksheet.getCell(`F${row}`);
            cellMode.dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['"Cash,UPI,Bank Transfer,Cheque"'],
                showErrorMessage: true,
                errorTitle: 'Invalid Payment Mode',
                error: 'Please select Cash, UPI, Bank Transfer, or Cheque from the dropdown list.'
            };

            const cellYear = worksheet.getCell(`G${row}`);
            cellYear.dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['"2026-2027 (Current Year),2025-2026 (Previous Year),2024-2025 (Previous Year)"'],
                showErrorMessage: true,
                errorTitle: 'Invalid Academic Year',
                error: 'Please select an academic year from the dropdown list.'
            };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${type}_upload_template.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        return;
    }

    let headers = '';
    let rows = [];

    switch (type) {
        case 'class':
            headers = 'Name,Division,StartTime,EndTime,Days';
            rows = ['10,A,17:00,18:00,Monday;Tuesday;Wednesday', '10,B,08:00,10:00,Friday;Saturday', '9,A,,,'];
            break;
        case 'mentor':
            headers = 'Name,Email,Password,AssignedClasses';
            rows = [
                'John Doe,john@example.com,password123,10-A',
                'Jane Smith,jane@example.com,securepass,10-B; 9-A'
            ];
            break;
        case 'student':
            headers = 'Name,RegisterNo,UID,Gender,Status,ClassName,Division';
            rows = ['Alice Name,REG001,UID123,Female,Active,10,A', 'Bob Name,REG002,,Male,Active,10,B'];
            break;
        default:
            return null;
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_upload_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const parseCSV = (file, type) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', raw: false });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                
                const result = rawJson.map(row => {
                    const normalizedRow = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[key.trim().toLowerCase()] = String(row[key] ?? '').trim();
                    });
                    return normalizedRow;
                });

                resolve(result);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
