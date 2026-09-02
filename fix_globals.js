const fs = require('fs');

let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

// 1. Fix Missing Fonts in Compiled CSS
const oldFonts = `      if (globalSettings.globalStyles?.enableDefaultFonts) {
        css += \`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap');
        \`;
      }`;

const newFonts = `      if (globalSettings.globalStyles?.enableDefaultFonts) {
        css += \`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap');
          
          #page-\${websiteIdStr || "active"} h1, 
          #page-\${websiteIdStr || "active"} h2, 
          #page-\${websiteIdStr || "active"} h3, 
          #page-\${websiteIdStr || "active"} h4, 
          #page-\${websiteIdStr || "active"} h5, 
          #page-\${websiteIdStr || "active"} h6 { 
            font-family: "\${globalSettings.fonts?.heading || 'Inter'}", sans-serif !important; 
          }
          #page-\${websiteIdStr || "active"} p, 
          #page-\${websiteIdStr || "active"} span, 
          #page-\${websiteIdStr || "active"} a, 
          #page-\${websiteIdStr || "active"} div { 
            font-family: "\${globalSettings.fonts?.body || 'Inter'}", sans-serif; 
          }
        \`;
      }`;

con = con.replace(oldFonts, newFonts);


// 2. Fix SiteMaxWidth unused consumption in Workspace
const oldMaxWidth = `            style={{
              width: "100%",
              maxWidth: activeBreakpointId === "widescreen" ? "100%" : \`\${breakpoints.find(b => b.id === activeBreakpointId)?.width || 1024}px\`,
            }}`;

const newMaxWidth = `            style={{
              width: "100%",
              maxWidth: activeBreakpointId === "widescreen" ? "100%" 
                        : activeBreakpointId === "desktop" ? "var(--siteMaxWidth)" 
                        : \`\${breakpoints.find(b => b.id === activeBreakpointId)?.width || 1024}px\`,
            }}`;

con = con.replace(oldMaxWidth, newMaxWidth);

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
console.log('Fixed missing Global Site styling implementation');
