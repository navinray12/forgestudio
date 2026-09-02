const fs = require('fs');
let code = fs.readFileSync('backend/src/controllers/website.controller.ts', 'utf8');

const newImports = `import { publishWebsiteService, restoreRevisionService } from "../services/deployment.service.js";\n`;
code = newImports + code;

const newControllers = `
/**
 * POST /api/websites/:id/publish
 */
export async function publishWebsiteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const website = await publishWebsiteService(req.params.id, res.locals.user.id);
    return res.status(200).json({ success: true, message: "Website published successfully", website });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/restore/:revisionId
 */
export async function restoreRevisionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const website = await restoreRevisionService(req.params.id, res.locals.user.id, req.params.revisionId);
    return res.status(200).json({ success: true, message: "Revision restored to draft successfully", website });
  } catch (error) {
    next(error);
  }
}
`;

code += newControllers;

fs.writeFileSync('backend/src/controllers/website.controller.ts', code);
console.log("update cont success");
