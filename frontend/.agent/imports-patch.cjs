const fs = require('fs');
let f = fs.readFileSync('src/App.tsx', 'utf8');

const imports = `
import CustomPostTypesList from "./pages/dashboard/CustomPostTypesList";
import CustomPostTypeBuilder from "./pages/dashboard/CustomPostTypeBuilder";
import CustomEntriesList from "./pages/dashboard/CustomEntriesList";
import CustomEntryEditor from "./pages/dashboard/CustomEntryEditor";
`;

f = f.replace('import WebsiteEditor from "./pages/editor/WebsiteEditor";', 'import WebsiteEditor from "./pages/editor/WebsiteEditor";' + imports);

fs.writeFileSync('src/App.tsx', f);
