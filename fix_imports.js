const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFiles = 0;

walkDir('src/app/api', function(filePath) {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it uses createProblemDetails
    if (content.includes('createProblemDetails')) {
      // Check if it already imports createProblemDetails
      const hasImport = content.includes('createProblemDetails') && content.match(/import\s+{[^}]*createProblemDetails[^}]*}\s+from\s+["'][^"']*api-utils["']/);
      
      if (!hasImport) {
        // If there's an existing import from api-utils
        if (content.match(/import\s+{([^}]+)}\s+from\s+["']@\/lib\/api-utils["']/)) {
            content = content.replace(/(import\s+{)([^}]+)(}\s+from\s+["']@\/lib\/api-utils["'])/, "$1createProblemDetails, $2$3");
        } else if (content.match(/import\s+{([^}]+)}\s+from\s+["']\.\.\/\.\.\/lib\/api-utils["']/)) { // some relative imports?
            content = content.replace(/(import\s+{)([^}]+)(}\s+from\s+["'].*api-utils["'])/, "$1createProblemDetails, $2$3");
        } else {
            // Find the last import statement
            const importsEndMatch = [...content.matchAll(/^import.*from.*$/gm)];
            if (importsEndMatch.length > 0) {
                const lastImport = importsEndMatch[importsEndMatch.length - 1];
                const insertIndex = lastImport.index + lastImport[0].length;
                content = content.slice(0, insertIndex) + '\nimport { createProblemDetails } from "@/lib/api-utils";' + content.slice(insertIndex);
            } else {
                // Prepend
                content = 'import { createProblemDetails } from "@/lib/api-utils";\n' + content;
            }
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedFiles++;
      }
    }
  }
});

console.log(`Added imports to ${modifiedFiles} files.`);
