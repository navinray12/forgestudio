const fs = require('fs');
let f = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

f = f.replace(
    /updateSelectedProp\(\"content\", e\.target\.value\)\}/,
    `updateSelectedProp("content", e.target.value)}
      className="mt-2 block w-full resize-none rounded-lg border-slate-200 p-2 text-xs font-mono shadow-sm focus:border-blue-500 bg-slate-50 focus:bg-white"
    />
    <p className="mt-2 text-[10px] text-slate-500">
      <strong>Dynamic Data:</strong> F-121 allows mapping <code>{{title}}</code>, <code>{{slug}}</code>, or <code>{{author}}</code>. For custom fields, map exactly by key: <code>{{custom_key}}</code>. Template pages parse this on render.`
);

fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', f);
