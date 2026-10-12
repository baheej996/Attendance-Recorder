const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

const srcDir = path.join(__dirname, '../src');
const files = getAllFiles(srcDir);

let violationCount = 0;

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let currentComponent = '';
  let returnLine = -1;
  let returnText = '';

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Detect function / component boundary
    const compMatch = line.match(/(?:const|function)\s+([A-Z]\w+)/);
    if (compMatch) {
      currentComponent = compMatch[1];
      returnLine = -1;
      returnText = '';
    }

    // Check if line is a top-level early return inside a component (e.g. if (!isOpen) return null;)
    if (line.match(/^\s*if\s*\([^)]*\)\s*return\b/) || line.match(/^\s*if\s*\([^)]*\)\s*\{\s*return\b/)) {
      // Exclude early returns inside hooks or helper functions
      if (!line.includes('=>') && !line.includes('useMemo') && !line.includes('useEffect') && !line.includes('useCallback')) {
        returnLine = lineNum;
        returnText = line.trim();
      }
    }

    // Check if a hook is called after an early return
    const hookMatch = line.match(/\b(use[A-Z]\w*)\b\s*\(/);
    if (hookMatch && returnLine !== -1) {
      const hookName = hookMatch[1];
      // Ignore if inside callback
      const hookIdx = line.indexOf(hookName);
      const arrowIdx = line.indexOf('=>');
      if (arrowIdx === -1 || arrowIdx > hookIdx) {
        violationCount++;
        console.log(`[HOOK VIOLATION] ${path.relative(path.join(__dirname, '..'), filePath)}:${lineNum}`);
        console.log(`   Component: ${currentComponent}`);
        console.log(`   Early Return at Line ${returnLine}: ${returnText}`);
        console.log(`   Hook called at Line ${lineNum}: ${line.trim()}\n`);
      }
    }
  });
});

console.log(`Total Violations Found: ${violationCount}`);
