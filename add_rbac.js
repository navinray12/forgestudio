const fs = require('fs');

let con = fs.readFileSync('backend/src/controllers/website.controller.ts', 'utf8');

const rbacValidation = `
    // F-118 RBAC Verification
    const isStandardUser = user.role === 'USER';
    
    // Check elements for F-110 htmlAllowScripts bypass
    if (editorData?.elements) {
        const checkHtmlScripts = (elements: any[]) => {
            for (const el of elements) {
                if (el.type === 'html' && el.htmlAllowScripts === true) {
                    if (isStandardUser) {
                        throw new Error("RBAC_VIOLATION: Only Administrators can enable Unsafe Scripts in HTML Widgets.");
                    }
                }
                if (el.children) checkHtmlScripts(el.children);
            }
        };
        try {
            checkHtmlScripts(editorData.elements);
        } catch (err: any) {
            return res.status(403).json({ success: false, message: err.message });
        }
    }
    
    // Check Custom Code List for Javascript (F-118)
    if (editorData?.globalSettings?.customCodeList) {
        const hasJs = editorData.globalSettings.customCodeList.some((s:any) => s.type === 'javascript');
        if (hasJs && isStandardUser) {
             return res.status(403).json({ success: false, message: "Only Administrators can modify or deploy Custom Javascript Logic." });
        }
    }
`;

con = con.replace('const { editorData } = req.body;', 'const { editorData } = req.body;' + rbacValidation);

fs.writeFileSync('backend/src/controllers/website.controller.ts', con);
console.log('RBAC applied.');
