const fs = require('fs');
const content = fs.readFileSync('backend/src/utils/customCodeValidator.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('type ') || l.includes('interface ')) {
        console.log(`${i + 1}: ${l.trim()}`);
    }
});
