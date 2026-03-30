const { Project, SyntaxKind, TypeGuards } = require("ts-morph");

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

project.addSourceFilesAtPaths("src/app/api/**/route.ts");

const statusMap = {
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

let modifiedFiles = 0;

project.getSourceFiles().forEach((sourceFile) => {
  let fileModified = false;

  const nextResponses = sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression,
  ).filter(callExpr => {
    const expr = callExpr.getExpression();
    if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
      if (expr.getText() === "NextResponse.json") return true;
    }
    return false;
  });

  nextResponses.forEach(callExpr => {
    const args = callExpr.getArguments();
    if (args.length !== 2) return;

    const arg0 = args[0]; // { success: false, error: ... }
    const arg1 = args[1]; // { status: 400 }

    if (arg1.getKind() !== SyntaxKind.ObjectLiteralExpression) return;

    const statusProp = arg1.getProperty("status");
    if (!statusProp) return;

    // Check if the property is shorthand or normal
    let statusNumber = 200;
    if (statusProp.getKind() === SyntaxKind.PropertyAssignment) {
      const init = statusProp.getInitializer();
      if (init && init.getKind() === SyntaxKind.NumericLiteral) {
        statusNumber = Number(init.getText());
      }
    }

    if (statusNumber < 400) return; // Only process errors

    if (!statusMap[statusNumber]) return;

    const [type, title] = statusMap[statusNumber];
    
    // Attempt to extract detail from arg0
    let detailStr = '"An error occurred"';
    let instanceStr = undefined;
    let additionalDataStr = undefined;
    
    if (arg0.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const errorProp = arg0.getProperty("error") || arg0.getProperty("message");
      if (errorProp && errorProp.getKind() === SyntaxKind.PropertyAssignment) {
        detailStr = errorProp.getInitializer().getText(); // This could be a static string, identifier, or template literal
      }

      // Check for other properties (like invalidIds from mark-read) to pass as additionalData
      const otherProps = arg0.getProperties().filter(p => {
         const name = p.getName();
         return name !== "success" && name !== "error" && name !== "message";
      });
      
      if (otherProps.length > 0) {
         additionalDataStr = "{ " + otherProps.map(p => p.getText()).join(", ") + " }";
      }
      
    } else {
       // if arg0 is like e.g. a variable, we could just pass it but usually it's an inline `{ error: ... }`.
       // fallback: pass the whole arg0 as detail? Actually let's stringify arg0 if we can't parse it easily.
       // we skip for now if it's not an object literal to avoid breaking edge cases
       // but maybe it's just { error: variable }
    }

    // Replace the call expression
    let replacement = `createProblemDetails("${type}", "${title}", ${statusNumber}, ${detailStr}`;
    if (additionalDataStr) {
      replacement += `, undefined, ${additionalDataStr}`;
    }
    replacement += `)`;
    
    callExpr.replaceWithText(replacement);
    fileModified = true;
  });

  if (fileModified) {
    // Ensure import is there
    const hasImport = sourceFile.getImportDeclarations().some(imp => 
      imp.getModuleSpecifierValue() === "@/lib/api-utils" &&
      imp.getNamedImports().some(ni => ni.getName() === "createProblemDetails")
    );
    
    if (!hasImport) {
      // Find existing import for "@/lib/api-utils"
      const existingImport = sourceFile.getImportDeclaration(imp => imp.getModuleSpecifierValue() === "@/lib/api-utils");
      
      if (existingImport) {
        existingImport.addNamedImport("createProblemDetails");
      } else {
        sourceFile.addImportDeclaration({
          moduleSpecifier: "@/lib/api-utils",
          namedImports: ["createProblemDetails"],
        });
      }
    }
    modifiedFiles++;
    sourceFile.saveSync();
  }
});

console.log(\`Successfully modified \${modifiedFiles} files.\`);
