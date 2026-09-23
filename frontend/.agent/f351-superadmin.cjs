const fs = require('fs');

let saDash = fs.readFileSync('src/pages/dashboard/SuperAdminDashboard.tsx', 'utf8');

saDash = saDash.replace(
    '<div className="min-h-screen bg-slate-50 p-8">',
    '<main className="min-h-screen bg-slate-50 p-8">'
);
saDash = saDash.replace(
    '          </div>\n        </div>\n      </div>\n    );',
    '          </div>\n        </div>\n      </main>\n    );'
);
saDash = saDash.replace(
    '<div className="flex items-center justify-between">',
    '<header className="flex items-center justify-between">'
);
saDash = saDash.replace(
    '          </button>\n        </div>\n      </div>',
    '          </button>\n        </div>\n      </header>'
);

fs.writeFileSync('src/pages/dashboard/SuperAdminDashboard.tsx', saDash);
