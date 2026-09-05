const fs = require('fs');
let file = fs.readFileSync('src/pages/dashboard/UserDashboard.tsx', 'utf8');

file = file.replace(
    'import React from "react";',
    'import React from "react";\nimport LazySection from "../../components/LazySection";'
);

file = file.replace(
    '<section className="mt-12 space-y-8">',
    '<section className="mt-12 space-y-8">\n          <LazySection rootMargin="300px">'
);

file = file.replace(
    '</React.Suspense>\n        </section>',
    '</React.Suspense>\n          </LazySection>\n        </section>'
);

fs.writeFileSync('src/pages/dashboard/UserDashboard.tsx', file);
