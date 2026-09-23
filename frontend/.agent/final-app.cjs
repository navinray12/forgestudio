const fs = require('fs');
let f = fs.readFileSync('src/App.tsx', 'utf8');

const injection = `
          <Route path="/dashboard/cpts/:websiteId" element={<RoleRoute allowedRoles={["USER"]}><CustomPostTypesList /></RoleRoute>} />
          <Route path="/dashboard/cpts/:websiteId/builder/:cptId?" element={<RoleRoute allowedRoles={["USER"]}><CustomPostTypeBuilder /></RoleRoute>} />
          <Route path="/dashboard/cpts/:websiteId/entries/:cptId" element={<RoleRoute allowedRoles={["USER"]}><CustomEntriesList /></RoleRoute>} />
          <Route path="/dashboard/cpts/:websiteId/entries/:cptId/editor/:entryId?" element={<RoleRoute allowedRoles={["USER"]}><CustomEntryEditor /></RoleRoute>} />
          <Route
            path="/subscriptions"
`;
f = f.replace('<Route\n            path="/subscriptions"', injection);
fs.writeFileSync('src/App.tsx', f);
