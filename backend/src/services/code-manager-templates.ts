// Reviewed starter templates. Selection only fills an editable draft; no provider calls occur here.
export const codeTemplates = [
 {id:'google-analytics',name:'Google Analytics',description:'Add Google Analytics tracking code',language:'JS',placement:'HEAD',source:'THIRD_PARTY',help:'Replace YOUR_MEASUREMENT_ID with your Google tag ID. Tracking runs in the existing JavaScript runtime.',code:`const measurementId = "YOUR_MEASUREMENT_ID";
const script = document.createElement("script");
script.async = true;
script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
document.head.appendChild(script);
window.dataLayer = window.dataLayer || [];
function gtag(){ window.dataLayer.push(arguments); }
gtag("js", new Date());
gtag("config", measurementId);`},
 {id:'facebook-pixel',name:'Facebook Pixel',description:'Facebook Pixel for conversion tracking',language:'JS',placement:'HEAD',source:'THIRD_PARTY',help:'Paste your Meta Events Manager base code and replace YOUR_PIXEL_ID. JavaScript runs in the existing isolated runtime.',code:`// Paste the base code supplied by Meta Events Manager here.
// Replace YOUR_PIXEL_ID with your own pixel ID before publishing.
// Template intentionally starts without loading external tracking code.`},
 {id:'whatsapp-chat',name:'WhatsApp Chat',description:'Add WhatsApp chat widget',language:'HTML',placement:'BODY_END',source:'THIRD_PARTY',help:'Replace YOUR_PHONE_NUMBER with your international phone number, using digits only.',code:`<a href="https://wa.me/YOUR_PHONE_NUMBER" target="_blank" rel="noopener noreferrer">Chat with us on WhatsApp</a>`},
 {id:'custom-css',name:'Custom CSS',description:'Add custom CSS styles',language:'CSS',placement:'HEAD',source:'TEMPLATE',help:'Edit these styles for your site.',code:`/* Custom site styles */
:root {
  --custom-accent: #8b5cf6;
}`},
 {id:'custom-js',name:'Custom JS',description:'Add custom JavaScript',language:'JS',placement:'BODY_END',source:'TEMPLATE',help:'JavaScript runs in the existing isolated runtime.',code:`// Add your custom JavaScript here.
document.addEventListener("DOMContentLoaded", () => {
  // Your code
});`}
] as const;
export const templateById=(id:string)=>codeTemplates.find(t=>t.id===id);
export function templateConfigurationError(code:string,status:string){return status!=='DRAFT'&&/YOUR_(?:MEASUREMENT_ID|PIXEL_ID|PHONE_NUMBER)/.test(code)?'Replace the template placeholders before publishing or scheduling.':null;}
