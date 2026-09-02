const fs = require('fs');

let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

const oldKeyUpdate = `  const updateAttributeKey = (oldKey: string, newKey: string) => {
    if (!selectedElement) return;
    const current = { ...(selectedElement.customAttributes || {}) };
    const val = current[oldKey] || "";
    delete current[oldKey];

    // Sanitize attribute name
    const sanitizedKey = newKey
      .replace(/[^a-zA-Z0-9_-]/g, "") // Allow alphanumeric plus hyphens/underscores
      .replace(/^on/i, ""); // Ensure it doesn't start with 'on'

    if (sanitizedKey) {
      current[sanitizedKey] = val;
    }
    updateSelectedProp("customAttributes", current);
  };`;

const newKeyUpdate = `  const updateAttributeKey = (oldKey: string, newKey: string) => {
    if (!selectedElement) return;
    const current = { ...(selectedElement.customAttributes || {}) };
    const val = current[oldKey] || "";
    
    const sanitizedKey = newKey
      .replace(/[^a-zA-Z0-9_-]/g, "") 
      .replace(/^on/i, ""); 

    // Skip if it hasn't changed to avoid unnecessary renders
    if (sanitizedKey === oldKey) return;

    delete current[oldKey];

    if (sanitizedKey) {
      current[sanitizedKey] = val;
    }
    updateSelectedProp("customAttributes", current);
  };`;

con = con.replace(oldKeyUpdate, newKeyUpdate);

const oldNameInput = `<input
                                  type="text"
                                  value={key}
                                  onChange={(e) => updateAttributeKey(key, e.target.value)}
                                  placeholder="data-testid"
                                  className="w-[45%] rounded border border-slate-350 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                                />`;

const newNameInput = `<input
                                  type="text"
                                  defaultValue={key}
                                  onBlur={(e) => updateAttributeKey(key, e.target.value)}
                                  placeholder="data-testid"
                                  className="w-[45%] rounded border border-slate-350 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                                />`;

con = con.replace(oldNameInput, newNameInput);

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
console.log('Fixed Custom Attribute Key Focus Bug');
