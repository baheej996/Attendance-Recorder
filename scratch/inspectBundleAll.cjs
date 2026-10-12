const fs = require('fs');
const path = require('path');

const distFile = path.join(__dirname, '../dist/assets/index-CdqyyymE.js');
const content = fs.readFileSync(distFile, 'utf8');

let pos = 0;
while ((pos = content.indexOf('minAttendancePercent', pos)) !== -1) {
  console.log(`\n--- Match at index ${pos} ---`);
  console.log(content.substring(Math.max(0, pos - 200), Math.min(content.length, pos + 300)));
  pos += 'minAttendancePercent'.length;
}
