const fs = require('fs');
const path = require('path');

const distFile = path.join(__dirname, '../dist/assets/index-CdqyyymE.js');
const content = fs.readFileSync(distFile, 'utf8');

const targetIdx = content.indexOf('minAttendancePercent');
console.log('Index of minAttendancePercent:', targetIdx);

if (targetIdx !== -1) {
  const snippet = content.substring(targetIdx - 100, targetIdx + 300);
  console.log('Snippet in compiled bundle:');
  console.log(snippet);
}
