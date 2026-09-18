import ExcelJS from 'exceljs';

async function testReadBack() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./scratch/test_exceljs_template.xlsx');
  const worksheet = workbook.getWorksheet('Fee Payments');
  const cell = worksheet.getCell('F2');
  console.log('Cell F2 data validation:', cell.dataValidation);
}

testReadBack();
