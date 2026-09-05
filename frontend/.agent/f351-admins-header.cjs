const fs = require('fs');

['src/pages/dashboard/AdminDashboard.tsx', 'src/pages/dashboard/SuperAdminDashboard.tsx'].forEach(path => {
    let dash = fs.readFileSync(path, 'utf8');

    // The header closes exactly above </main> because it's a very simple placeholder right now!
    // Since it's a small placeholder dashboard, we just replace the last </div> before </main> with </header>
    dash = dash.replace(
        '        </div>\n      </main>',
        '        </header>\n      </main>'
    );

    fs.writeFileSync(path, dash);
});
