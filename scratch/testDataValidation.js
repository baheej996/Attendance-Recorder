import * as XLSX from 'xlsx';
import fs from 'fs';

const wb = XLSX.utils.book_new();
const wsData = [
  ['RegisterNo', 'StudentName', 'Installment1', 'Installment2', 'Installment3', 'PaymentMode', 'PaymentDate', 'Remarks'],
  ['26M01B07', 'RAIZA THOTTUNGAL SHIHAB', 4233, 0, 0, 'Cash', '30-05-2026', 'Admission fee'],
  ['26M01B03', 'MUHAMMED ZAYNI AL DAHLAN', 4233, 4233, 0, 'UPI', '30-05-2026', 'Online payment']
];

const ws = XLSX.utils.aoa_to_sheet(wsData);

ws['!dataValidation'] = [
  {
    sqref: 'F2:F100',
    type: 'list',
    operator: 'equal',
    formula1: '"Cash,UPI,Bank Transfer,Cheque"',
    showErrorMessage: true,
    errorTitle: 'Invalid Payment Mode',
    error: 'Please select a valid payment mode from the dropdown list.'
  }
];

XLSX.utils.book_append_sheet(wb, ws, 'Fee Payments');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('./scratch/test_template.xlsx', buf);
console.log('Successfully created test_template.xlsx, size:', buf.length);
