const fs = require('fs');

['src/pages/dashboard/AdminDashboard.tsx', 'src/pages/dashboard/SuperAdminDashboard.tsx'].forEach(path => {
    let dash = fs.readFileSync(path, 'utf8');

    // Make the outer div a <main>
    dash = dash.replace(
        '<div className="min-h-screen bg-slate-50 p-8">',
        '<main className="min-h-screen bg-slate-50 p-8">'
    );
    // Find the last </div> before the ); and replace it with </main>
    const lastDivIndex = dash.lastIndexOf('</div>');
    if (lastDivIndex !== -1) {
        dash = dash.substring(0, lastDivIndex) + '</main>' + dash.substring(lastDivIndex + 6);
    }

    // Replace the inner header div with <header>
    dash = dash.replace(
        '<div className="flex items-center justify-between">',
        '<header className="flex items-center justify-between">'
    );
    // Find the corresponding </div> manually or via regex... it's followed by some content. 
    // It's safer to just replace the known </div> closing that header.
    // In these files, it's followed by `{/* Stats Row */}` or `{/* Content here */}` (wait, actually, SuperAdmin has its own layout).
    // Let's check AdminDashboard to see its layout.
    fs.writeFileSync(path, dash);
});
