const fs = require('fs');
let file = fs.readFileSync('src/pages/dashboard/UserDashboard.tsx', 'utf8');

const sectionToInject = `
      {/* Lazy Loaded Admin/Developer Settings */}
      <section className="mt-12 space-y-8">
        <LazySection rootMargin="300px">
          <React.Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Loading panels...</div>}>
            <DeveloperApiSettings />
            <ComposerPanel />
            <PluginSettingsPanel />
          </React.Suspense>
        </LazySection>
      </section>

      {/* ================= CREATE WEBSITE MODAL ================= */}`;

file = file.replace('      {/* ================= CREATE WEBSITE MODAL ================= */}', sectionToInject);

fs.writeFileSync('src/pages/dashboard/UserDashboard.tsx', file);
