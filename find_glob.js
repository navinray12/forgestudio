const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('setGlobalSettings(') || l.includes('updateSelectedStyle(')) {
        console.log(`${i + 1}: ${l.trim()}`);
    }
});
