const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/website.routes.ts', 'utf8');

code = code.replace(
    '} from "../controllers/website.controller.js";',
    '  publishWebsiteHandler,\n  restoreRevisionHandler\n} from "../controllers/website.controller.js";'
);

code = code.replace(
    'router.put("/:id", updateWebsiteHandler);',
    'router.put("/:id", updateWebsiteHandler);\nrouter.post("/:id/publish", publishWebsiteHandler);\nrouter.post("/:id/restore/:revisionId", restoreRevisionHandler);'
);

fs.writeFileSync('backend/src/routes/website.routes.ts', code);
console.log("routes updated");
