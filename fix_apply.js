const fs = require('fs');

let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

// For HTML Widget
const oldHtmlTextarea = `<textarea
                          rows={12}
                          value={tempHtml}
                          onChange={(e) => setTempHtml(e.target.value)}
                          onBlur={() => updateSelectedProp("htmlContent", tempHtml)}`;

const newHtmlTextarea = `<textarea
                          rows={12}
                          value={tempHtml}
                          onChange={(e) => setTempHtml(e.target.value)}`;

con = con.replace(oldHtmlTextarea, newHtmlTextarea);

// For Shortcode Widget
const oldShortcode = `<input
                          type="text"
                          value={tempShortcode}
                          onChange={(e) => setTempShortcode(e.target.value)}
                          onBlur={() => updateSelectedProp("shortcode", tempShortcode)}`;

const newShortcode = `<input
                          type="text"
                          value={tempShortcode}
                          onChange={(e) => setTempShortcode(e.target.value)}`;

con = con.replace(oldShortcode, newShortcode);

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
console.log('Removed aggressive onBlur to fix Apply button swallowing bug.');
