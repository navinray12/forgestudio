const fs = require('fs');

let con = fs.readFileSync('backend/src/services/website.service.ts', 'utf8');

const oldUpdate = `    if (db?.website?.update) {
      const updated = await db.website.update({
        where: { id: websiteId },
        data: {
          editorData,
          updatedAt: new Date(),
        },
      });`;

const newUpdate = `    if (db?.website?.update) {
      const updateData: any = {
        editorData,
        updatedAt: new Date(),
      };
      
      // Keep root database 'name' synchronized with editor's Global Site Identity 
      if (editorData?.globalSettings?.siteIdentity?.name) {
          updateData.name = editorData.globalSettings.siteIdentity.name;
      }
      
      const updated = await db.website.update({
        where: { id: websiteId },
        data: updateData,
      });`;

con = con.replace(oldUpdate, newUpdate);

// Also fix the raw SQL query path
const oldRaw = `      UPDATE websites
      SET "editorData" = \${jsonStr}::jsonb, "updatedAt" = NOW()
      WHERE id = \${websiteId}::uuid AND "userId" = \${userId}::uuid`;

const newRaw = `      UPDATE websites
      SET "editorData" = \${jsonStr}::jsonb, 
          "name" = COALESCE(NULLIF(\${editorData?.globalSettings?.siteIdentity?.name || ''}, ''), "name"),
          "updatedAt" = NOW()
      WHERE id = \${websiteId}::uuid AND "userId" = \${userId}::uuid`;

con = con.replace(oldRaw, newRaw);

fs.writeFileSync('backend/src/services/website.service.ts', con);
console.log('Fixed Global Site Identity Name synchronization issue.');
