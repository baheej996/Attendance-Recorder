const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
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
  
  let returnSeen = false;
  let inComponent = false;
  let componentName = '';
  let braceDepth = 0;
  let componentBraceDepth = 0;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Detect component definition
    const compMatch = line.match(/(?:const|function)\s+([A-Z]\w+)\s*=/);
    if (compMatch) {
      inComponent = true;
      componentName = compMatch[1];
      returnSeen = false;
    }

    // Detect hooks called
    const hookMatch = line.match(/\b(use[A-Z]\w*)\b\s*\(/);
    if (hookMatch) {
      const hookName = hookMatch[1];
      
      // Check if called inside an if statement, loop, or callback
      if (line.includes('if ') || line.includes('if(') || line.includes('for ') || line.includes('while ') || line.includes('=>') || line.includes('.map(') || line.includes('.filter(')) {
        // Exception for custom hooks defined at root level or useMemo/useCallback callbacks
        if (!hookName.startsWith('use') || hookName === 'useMemo' || hookName === 'useCallback' || hookName === 'useEffect') {
          // Check if hook is called inside the callback itself
          const beforeHook = line.substring(0, line.indexOf(hookName));
          if (beforeHook.includes('=>') || beforeHook.includes('function')) {
            console.log(`[HOOK INSIDE CALLBACK/CONDITIONAL] ${filePath}:${lineNum} - Hook '${hookName}' inside: ${line.trim()}`);
          }
        }
      }

      if (returnSeen) {
        console.log(`[HOOK AFTER RETURN] ${filePath}:${lineNum} - Hook '${hookName}' called after early return in ${componentName}: ${line.trim()}`);
      }
    }

    // Detect early return (not inside JSX or nested function)
    if (inComponent && line.match(/^\s*if\s*\(.*\)\s*return\b/) || line.match(/^\s*if\s*\(.*\)\s*\{\s*return\b/)) {
      returnSeen = true;
    }
  });
});

console.log("Analysis complete.");
