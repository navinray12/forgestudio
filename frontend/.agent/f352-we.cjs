/**
 * @file F352 we: frontend/ agent module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
const fs = require('fs');
let we = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

we = we.replace(
    '<img src={resolveImageUrl(el.src, apiUrl)} alt={el.alt || "Image"} className="max-w-full rounded-lg" />',
    '<img src={resolveImageUrl(el.src, apiUrl)} alt={el.alt || "Image"} loading="lazy" decoding="async" className="max-w-full rounded-lg" />'
);

fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', we);
