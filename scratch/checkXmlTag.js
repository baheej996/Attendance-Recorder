import fs from 'fs';
import unzipper from 'unzipper'; // or read string

const buf = fs.readFileSync('./scratch/test_exceljs_template.xlsx');
console.log('Buffer size:', buf.length);
// Search for dataValidation in raw zip buffer or xml bytes
const raw = buf.toString('utf8');
const ascii = buf.toString('latin1');
console.log('Contains dataValidation in ExcelJS zip?', ascii.includes('dataValidation'));
