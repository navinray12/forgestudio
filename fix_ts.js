const fs = require('fs');

let con = fs.readFileSync('backend/src/controllers/website.controller.ts', 'utf8');
con = con.replace('req.params.id, res.locals.user.id', 'req.params.id as string, res.locals.user.id');
con = con.replace('req.params.id, res.locals.user.id, req.params.revisionId', 'req.params.id as string, res.locals.user.id, req.params.revisionId as string');
fs.writeFileSync('backend/src/controllers/website.controller.ts', con);

let dep = fs.readFileSync('backend/src/services/deployment.service.ts', 'utf8');
dep = dep.replace('throw new AppError("Revision not found", 404);', 'throw new AppError("Revision not found", 404, "NOT_FOUND");');
dep = dep.replace('throw new AppError("Snippet not found", 404);', 'throw new AppError("Snippet not found", 404, "NOT_FOUND");');
fs.writeFileSync('backend/src/services/deployment.service.ts', dep);

console.log('fixed ts errors');
