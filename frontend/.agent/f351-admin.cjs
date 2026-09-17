const fs = require('fs');

let adminDash = fs.readFileSync('src/pages/dashboard/AdminDashboard.tsx', 'utf8');

adminDash = adminDash.replace(
    '<div className="min-h-screen bg-slate-50 p-8">',
    '<main className="min-h-screen bg-slate-50 p-8">'
);
adminDash = adminDash.replace(
    '          </div>\n        </div>\n      </div>\n    );',
    '          </div>\n        </div>\n      </main>\n    );'
);
adminDash = adminDash.replace(
    '<div className="flex items-center justify-between">',
    '<header className="flex items-center justify-between">'
);
adminDash = adminDash.replace(
    '          </button>\n        </div>\n      </div>',
    '          </button>\n        </div>\n      </header>'
);

fs.writeFileSync('src/pages/dashboard/AdminDashboard.tsx', adminDash);
