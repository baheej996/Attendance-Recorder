import XLSX from "xlsx";

const excelPath = "C:\\Users\\SMART_MADRASA\\Downloads\\fee_payments_upload_template (3) (1).xlsx";
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const excelRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

console.log("Sheet Name:", sheetName);
console.log("Total Rows:", excelRows.length);
if (excelRows.length > 0) {
    console.log("Headers:", Object.keys(excelRows[0]));
    console.log("\nRow 0:", excelRows[0]);
    console.log("\nRow 1:", excelRows[1]);
}
