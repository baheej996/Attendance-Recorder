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

console.log(`Analyzing ${files.length} files...`);

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let returnLineNum = -1;
  let componentName = '';
  let inComponent = false;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Detect component definition
    const compMatch = line.match(/(?:const|function)\s+([A-Z]\w+)/);
    if (compMatch) {
      componentName = compMatch[1];
      returnLineNum = -1;
    }

    // Detect hooks called
    const hookMatch = line.match(/\b(use[A-Z]\w*)\b\s*\(/);
    if (hookMatch) {
      const hookName = hookMatch[1];
      
      // Check if hook is after an early return
      if (returnLineNum !== -1) {
        console.log(`[HOOK AFTER RETURN] ${path.basename(filePath)}:${lineNum} - Hook '${hookName}' called at line ${lineNum} after early return at line ${returnLineNum} in component ${componentName}`);
        console.log(`   Line: ${line.trim()}`);
      }

      // Check if hook is called inside an arrow function / callback / map / loop
      if (line.includes('=>') || line.includes('function(') || line.includes('.map(') || line.includes('.forEach(')) {
        // Exclude useState initializer function like useState(() => ...) or useEffect(() => ...)
        const hookIdx = line.indexOf(hookName);
        const arrowIdx = line.indexOf('=>');
        if (arrowIdx !== -1 && arrowIdx < hookIdx) {
          console.log(`[HOOK INSIDE CALLBACK] ${path.basename(filePath)}:${lineNum} - Hook '${hookName}' called inside arrow function/callback:`);
          console.log(`   Line: ${line.trim()}`);
        }
      }
    }

    // Detect early return (conditional return before component finishes)
    // Matches: if (...) return ... or return (...) where return is top-level return in component
    if (line.match(/^\s*if\s*\(.*\).*\breturn\b/)) {
      returnLineNum = lineNum;
    }
  });
});

console.log("Analysis complete.");
