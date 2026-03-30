const fs = require('fs');
const path = require('path');

const statusTitles = {
  400: ["about:blank", "Bad Request"],
  401: ["about:blank", "Unauthorized"],
  402: ["about:blank", "Payment Required"],
  403: ["about:blank", "Forbidden"],
  404: ["about:blank", "Not Found"],
  409: ["about:blank", "Conflict"],
  410: ["about:blank", "Gone"],
  413: ["about:blank", "Payload Too Large"],
  422: ["about:blank", "Unprocessable Entity"],
  429: ["about:blank", "Too Many Requests"],
  500: ["about:blank", "Internal Server Error"],
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const files = [];
walkDir('src/app/api', function(filePath) {
  if (filePath.endsWith('route.ts')) {
    files.push(filePath);
  }
});

let modifiedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  let pos = 0;
  while ((pos = content.indexOf('NextResponse.json(', pos)) !== -1) {
    let openParens = 0;
    let inString = false;
    let stringChar = '';
    let endPos = -1;

    for (let i = pos + 18; i < content.length; i++) {
        const char = content[i];
        if (inString) {
            if (char === stringChar && content[i-1] !== '\\') {
                inString = false;
            }
        } else {
            if (char === '"' || char === '\'' || char === '`') {
                inString = true;
                stringChar = char;
            } else if (char === '(') {
                openParens++;
            } else if (char === ')') {
                if (openParens === 0) {
                    endPos = i;
                    break;
                }
                openParens--;
            }
        }
    }

    if (endPos === -1) {
        pos += 18;
        continue;
    }

    const payloadArgs = content.substring(pos + 18, endPos).trim();
    const statusMatch = payloadArgs.match(/status:\s*([45][0-9]{2})/);
    
    if (statusMatch) {
       const statusCode = parseInt(statusMatch[1]);
       
       if (statusCode >= 400 && statusCode < 600) {
           const [type, title] = statusTitles[statusCode] || ["about:blank", "Error"];
           
           let detail = '""';
           const errorMatch = payloadArgs.match(/(?:error|message):\s*("[^"]+"|'[^']+'|`[^`]+`|\w+)/);
           if (errorMatch) {
               detail = errorMatch[1];
           } else {
               // Try to extract dynamic strings or template literals as a fallback
               const fallbackMatch = payloadArgs.match(/error:\s*([^,]+)/);
               if (fallbackMatch && !fallbackMatch[1].includes('{')) {
                   detail = fallbackMatch[1].trim();
               } else {
                   detail = '"An error occurred"';
               }
           }

           // Check for additional properties (specifically taking care of paymentStatus that wasn't mapped)
           const replaceText = `createProblemDetails("${type}", "${title}", ${statusCode}, ${detail})`;

           const fullCall = content.substring(pos, endPos + 1);
           content = content.replace(fullCall, replaceText);
       }
    }
    pos += 18;
  }

  if (content !== originalContent) {
    if (!content.includes('createProblemDetails')) {
       if (content.match(/import\s+{([^}]+)}\s+from\s+["']@\/lib\/api-utils["']/)) {
           content = content.replace(/(import\s+{)([^}]+)(}\s+from\s+["']@\/lib\/api-utils["'])/, "$1 createProblemDetails, $2 $3");
       } else {
           content = 'import { createProblemDetails } from "@/lib/api-utils";\n' + content;
       }
    }
    fs.writeFileSync(file, content, 'utf8');
    modifiedFiles++;
  }
});
console.log(`Modified ${modifiedFiles} files.`);
