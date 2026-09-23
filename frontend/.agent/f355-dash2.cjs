const fs = require('fs');
let file = fs.readFileSync('src/pages/dashboard/UserDashboard.tsx', 'utf8');

const replacementImports = `import { useAuth } from "../../context/AuthContext";
import React from "react";
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

        {/*
================= CREATE WEBSITE MODAL
================= */}`;

file = file.replace('        {/*\r\n================= CREATE WEBSITE MODAL\r\n================= */}', sectionToInject);
file = file.replace('        {/*\n================= CREATE WEBSITE MODAL\n================= */}', sectionToInject);

fs.writeFileSync('src/pages/dashboard/UserDashboard.tsx', file);
