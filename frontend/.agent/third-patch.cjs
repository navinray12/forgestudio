const fs = require('fs');
let f = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

// I will look for `<p className="mt-2 text-[10px] text-slate-500">` and clear out its problems!
const idx = f.indexOf('<p className="mt-2 text-[10px] text-slate-500">');
if (idx > -1) {
    const start = f.substring(0, idx);
    const endRaw = f.substring(idx);

    // We want to just replace up to 
    const nextDivIdx = endRaw.indexOf('</div>'); // The container holding textarea

    // safe injection
    const correctParagraph = `
    <p className="mt-2 text-[10px] text-slate-500">
      <strong>Dynamic Data:</strong> F-121 allows mapping <code>{'{{title}}'}</code>, <code>{'{{slug}}'}</code>. Map exactly by key: <code>{'{{custom_key}}'}</code>.
    </p>
    `;

    const end = endRaw.substring(nextDivIdx);

    f = start + correctParagraph + end;
    fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', f);
}
