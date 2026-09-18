import * as XLSX from 'xlsx';
import fs from 'fs';

// Test reading xlsx
const buf = fs.readFileSync('./scratch/test_template.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const sheetName = wb.SheetNames[0];
const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
console.log('Parsed XLSX rows:', data);

// Test reading csv text as buffer
const csvText = `RegisterNo,StudentName,Installment1,Installment2,Installment3,PaymentMode,PaymentDate,Remarks
26M01B07,RAIZA THOTTUNGAL SHIHAB,4233,0,0,Cash,30-05-2026,Admission fee`;
const csvWb = XLSX.read(csvText, { type: 'string' });
const csvData = XLSX.utils.sheet_to_json(csvWb.Sheets[csvWb.SheetNames[0]], { defval: '' });
console.log('Parsed CSV rows:', csvData);
