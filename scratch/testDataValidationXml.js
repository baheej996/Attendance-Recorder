import * as XLSX from 'xlsx';
import fs from 'fs';

const wb = XLSX.utils.book_new();
const wsData = [
  ['RegisterNo', 'StudentName', 'Installment1', 'Installment2', 'Installment3', 'PaymentMode', 'PaymentDate', 'Remarks'],
  ['26M01B07', 'RAIZA THOTTUNGAL SHIHAB', 4233, 0, 0, 'Cash', '30-05-2026', 'Admission fee']
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
ws['!dataValidation'] = [
  {
    sqref: 'F2:F500',
    type: 'list',
    formula1: '"Cash,UPI,Bank Transfer,Cheque"'
  }
];
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const str = out.toString('utf8');
console.log('Contains dataValidation in output buffer?', str.includes('dataValidation'));
