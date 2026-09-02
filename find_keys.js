const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    const lw = l.toLowerCase();
    if (lw.includes('keydown') || lw.includes('keyup') || lw.includes('backspace') || lw.includes('delete') || lw.includes('removeeventlistener')) {
        console.log(`${i + 1}: ${l.trim()}`);
    }
});
