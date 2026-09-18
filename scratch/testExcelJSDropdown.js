import ExcelJS from 'exceljs';
import fs from 'fs';

async function test() {
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
    remarks: 'Online payment'
  });

  // Add Data Validation dropdown list for PaymentMode column F (F2:F500)
  for (let row = 2; row <= 500; row++) {
    const cell = worksheet.getCell(`F${row}`);
    cell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Cash,UPI,Bank Transfer,Cheque"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Payment Mode',
      error: 'Please select Cash, UPI, Bank Transfer, or Cheque'
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  fs.writeFileSync('./scratch/test_exceljs_template.xlsx', Buffer.from(buffer));
  console.log('ExcelJS file generated successfully, size:', buffer.byteLength);
}

test();
