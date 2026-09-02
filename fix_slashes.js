const fs = require('fs');
let code = fs.readFileSync('backend/src/services/deployment.service.ts', 'utf8');

code = code.replace(/\\\`/g, '\`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('backend/src/services/deployment.service.ts', code);
console.log("fixed backslashes");
