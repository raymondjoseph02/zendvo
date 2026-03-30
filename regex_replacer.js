const fs = require('fs');
const path = require('path');

const statusTitles = {
  400: ["about:blank", "Bad Request"],
  401: ["about:blank", "Unauthorized"],
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

  // We want to replace NextResponse.json(...)
  // Because regex matching nested parens is hard in JS, let's just find NextResponse.json( and then find the closing paren.
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
    // Check if it has { status: 4xx/5xx }
    const statusMatch = payloadArgs.match(/status:\s*([45][0-9]{2})/);
    
    if (statusMatch) {
       const statusCode = parseInt(statusMatch[1]);
       
       if (statusTitles[statusCode]) {
           const [type, title] = statusTitles[statusCode];
           
           // We have the body config too.. wait
           // It usually looks like: { success: false, error: "Something" }, { status: 400 }
           // Try to extract the error string
           let detail = '"An error occurred"';
           let additionalData = '';

           // Let's use quick regex for error string
           const errorMatch = payloadArgs.match(/(?:error|message):\s*("[^"]+"|'[^']+'|`[^`]+`|\w+)/);
           if (errorMatch) {
               detail = errorMatch[1];
           }

           // Check for invalidIds or similar things for additionalData (just anything else that looks like property)
           // But parsing JS objects with regex is hairy. Let's rely on simple replace for the main structure.
           let replaceText = `createProblemDetails("${type}", "${title}", ${statusCode}, ${detail})`;

           if (payloadArgs.includes("invalidIds:")) {
               // specific hack for the mark-read route
               replaceText = `createProblemDetails("${type}", "${title}", ${statusCode}, ${detail}, undefined, { invalidIds: unauthorizedIds })`;
               if (payloadArgs.includes("invalidIds: unauthorizedIds") === false) {
                   replaceText = `createProblemDetails("${type}", "${title}", ${statusCode}, ${detail}, undefined, { invalidIds })`;
               }
           }

           const fullCall = content.substring(pos, endPos + 1);
           content = content.replace(fullCall, replaceText);
           // adjust index due to replaced length difference
           // we'll just continue from pos, but since we replaced it, the next match is farther. 
       }
    }
    pos += 18;
  }

  if (content !== originalContent) {
    // Add import if needed
    if (!content.includes('createProblemDetails')) {
       // if not already there, we need to add the import.
       // find import { ... } from "@/lib/api-utils";
       if (content.match(/import\s+{([^}]+)}\s+from\s+["']@\/lib\/api-utils["']/)) {
           // has import from api-utils, substitute
           content = content.replace(/(import\s+{)([^}]+)(}\s+from\s+["']@\/lib\/api-utils["'])/, "$1 createProblemDetails, $2 $3");
       } else {
           // insert at top
           content = 'import { createProblemDetails } from "@/lib/api-utils";\n' + content;
       }
    }
    
    // Sometimes it creates "import { createProblemDetails,  createProblemDetails..."
    fs.writeFileSync(file, content, 'utf8');
    modifiedFiles++;
  }
});
console.log(`Modified ${modifiedFiles} files.`);
