const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('__tests__', function(filePath) {
  if (filePath.endsWith('.test.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // replace .success).toBe(false) with .detail).toBeDefined() (we do this because only errors were changed to problemDetails, success=true still uses standard json)
    // Actually, sometimes they do expect(data.success).toBe(false)
    // Wait, if it checks for success=false, it means it's an error response.
    content = content.replace(/(expect\([^)]+)\.success\)\.toBe\(false\)/g, "$1.detail).toBeDefined()");
    
    // replace .error) with .detail) 
    // Example: expect(body.error).toContain("Invalid") -> expect(body.detail).toContain("Invalid")
    content = content.replace(/(expect\([^)]+)\.error\)/g, "$1.detail)");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
