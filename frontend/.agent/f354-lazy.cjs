const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add `lazy, Suspense` to React import. Since App.tsx might only import from react-router-dom and context, let's insert it at the very top.
app = 'import { lazy, Suspense } from "react";\n' + app;

// 2. Replace static imports with lazy imports
const lazyReplacements = [
    { name: "LoginPage", path: "./pages/auth/LoginPage" },
    { name: "SignupPage", path: "./pages/auth/SignupPage" },
    { name: "UserDashboard", path: "./pages/dashboard/UserDashboard" },
    { name: "AdminDashboard", path: "./pages/dashboard/AdminDashboard" },
    { name: "SuperAdminDashboard", path: "./pages/dashboard/SuperAdminDashboard" },
    { name: "SubscriptionPage", path: "./pages/subscriptions/SubscriptionPage" },
    { name: "WebsiteEditor", path: "./pages/editor/WebsiteEditor" },
    { name: "CustomPostTypesList", path: "./pages/dashboard/CustomPostTypesList" },
    { name: "CustomPostTypeBuilder", path: "./pages/dashboard/CustomPostTypeBuilder" },
    { name: "CustomEntriesList", path: "./pages/dashboard/CustomEntriesList" },
    { name: "CustomEntryEditor", path: "./pages/dashboard/CustomEntryEditor" }
];

lazyReplacements.forEach(({ name, path }) => {
    // Regex to match `import ComponentName from "path";` taking into account single/double quotes
    const regex = new RegExp(`import\\s+${name}\\s+from\\s+["']${path}["'];?`, 'g');
    app = app.replace(regex, `const ${name} = lazy(() => import("${path}"));`);
});

// 3. Wrap <Routes> ... </Routes> with <Suspense fallbacks>
// Find the <Routes> tag and wrap it
app = app.replace('<Routes>', '<Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-500">Loading module...</p></main>}>\n          <Routes>');
app = app.replace('</Routes>', '</Routes>\n          </Suspense>');

fs.writeFileSync('src/App.tsx', app);
