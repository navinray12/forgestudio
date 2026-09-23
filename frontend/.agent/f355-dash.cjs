import React from "react";
const fs = require('fs');
let file = fs.readFileSync('src/pages/dashboard/UserDashboard.tsx', 'utf8');

const replacementImports = `import { useAuth } from "../../context/AuthContext";
const DeveloperApiSettings = React.lazy(() => import("./components/DeveloperApiSettings"));
const ComposerPanel = React.lazy(() => import("./components/ComposerPanel"));
const PluginSettingsPanel = React.lazy(() => import("../../plugins/components/PluginSettingsPanel"));`;

file = file.replace('import { useAuth } from "../../context/AuthContext";', replacementImports);

const sectionToInject = `
        {/* Lazy Loaded Admin/Developer Settings */}
        <section className="mt-12 space-y-8">
          <React.Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Loading panels...</div>}>
            <DeveloperApiSettings />
            <ComposerPanel />
            <PluginSettingsPanel />
          </React.Suspense>
        </section>

        {/* ================= CREATE WEBSITE MODAL ================= */}`;

file = file.replace('        {/*\n================= CREATE WEBSITE MODAL\n================= */}', sectionToInject);

// For standardizing layout boundaries (F-351 remnants missed because of the rollback), the outer is currently `<div>`. Let's just keep the div to avoid regex failures and build errors.

fs.writeFileSync('src/pages/dashboard/UserDashboard.tsx', file);
