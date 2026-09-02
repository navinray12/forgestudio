const fs = require('fs');
let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

const htmlP = '<div class="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-[#f8fafc] border border-dashed border-slate-300 rounded-xl m-2 select-none"><div class="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-4"><svg class="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></div><h3 class="text-sm font-extrabold text-slate-700 tracking-tight mb-1">Custom HTML Configured</h3><p class="text-[11px] text-slate-500 font-medium max-w-[200px] text-center leading-relaxed">Double-click this widget or use the right sidebar to inject raw HTML, IFrames, or Scripts.</p></div>';

const scP = '<div class="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-[#f8fafc] border border-dashed border-slate-300 rounded-xl m-2 select-none"><div class="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-4"><svg class="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><h3 class="text-sm font-extrabold text-slate-700 tracking-tight mb-1">Shortcode Module Active</h3><p class="text-[11px] text-slate-500 font-medium max-w-[200px] text-center leading-relaxed">Double-click to link this module to dynamic platform components like forms or APIs.</p></div>';

const lines = con.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Empty HTML Widget')) {
        lines[i] = '                  ? (el.htmlContent || (isPreview ? "" : "' + htmlP.replace(/"/g, '\\"') + '"))';
    }
    if (lines[i].includes('Edit HTML content')) {
        lines[i] = '                  : (sanitizeHtml(el.htmlContent || "") || (isPreview ? "" : `' + htmlP + '`))';
    }
    if (lines[i].includes('if (!el.shortcode) return <div className="p-4 border')) {
        lines[i] = '                if (!el.shortcode) return <div dangerouslySetInnerHTML={{ __html: `' + scP + '` }} />;';
    }
    // Add fix for Shortcode "Double-click to configure" block (the fallback missing one)
    if (lines[i].includes('⚙️ Dynamic Shortcode')) {
        lines[i] = '                <span className="text-xs font-bold text-slate-500">⚙️ Dynamic Shortcode: {el.shortcode || "Unconfigured"}</span>';
        lines[i - 1] = '              <div className="flex justify-center border border-dashed border-slate-300 rounded-lg p-6 bg-blue-50/50 flex-col items-center shadow-inner">';
        lines[i + 1] = '                <span className="mt-1 text-[9px] text-slate-400">Settings configured in sidebar</span></div>';
    }
}

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', lines.join('\n'));
console.log('Fixed Empty States securely.');
