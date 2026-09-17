const fs = require('fs');

let page = fs.readFileSync('src/pages/subscriptions/SubscriptionPage.tsx', 'utf8');

page = page.replace(
    '<div className="my-6 border-t border-slate-800" />',
    '<hr className="my-6 border-t border-slate-800" />'
);

page = page.replace(
    '<div className="min-h-screen bg-[#0f172a] text-slate-100">',
    '<div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col">'
);

fs.writeFileSync('src/pages/subscriptions/SubscriptionPage.tsx', page);
