const fs = require('fs');

let f = fs.readFileSync('src/App.tsx', 'utf8');

const injection = `
          <Route path="/dashboard/cpts/:websiteId" element={<RoleRoute allowedRoles={["USER"]}><CustomPostTypesList /></RoleRoute>} />
          <Route path="/dashboard/cpts/:websiteId/builder/:cptId?" element={<RoleRoute allowedRoles={["USER"]}><CustomPostTypeBuilder /></RoleRoute>} />
          <Route path="/dashboard/cpts/:websiteId/entries/:cptId" element={<RoleRoute allowedRoles={["USER"]}><CustomEntriesList /></RoleRoute>} />
          <Route path="/dashboard/cpts/:websiteId/entries/:cptId/editor/:entryId?" element={<RoleRoute allowedRoles={["USER"]}><CustomEntryEditor /></RoleRoute>} />
`;

f = f.replace('<UserDashboard />\n              </RoleRoute>\n            }\n          />', `<UserDashboard />\n              </RoleRoute>\n            }\n          />\n${injection}`);

// Add imports
const imports = `
import CustomPostTypesList from "./pages/dashboard/CustomPostTypesList";
import CustomPostTypeBuilder from "./pages/dashboard/CustomPostTypeBuilder";
import CustomEntriesList from "./pages/dashboard/CustomEntriesList";
import CustomEntryEditor from "./pages/dashboard/CustomEntryEditor";
`;

f = f.replace('import WebsiteEditor from "./pages/editor/WebsiteEditor";', `import WebsiteEditor from "./pages/editor/WebsiteEditor";\n${imports}`);

fs.writeFileSync('src/App.tsx', f);
