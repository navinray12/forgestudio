/**
 * F-145: SVG Sanitizer & Custom Vector Viewer Utility
 * Cleans SVG markup to eliminate XSS, script injection, and unsafe protocols 
 * while keeping vector geometry, paths, gradients, and styling intact.
 */

export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg) return '';

  let cleaned = rawSvg;

  // 1. Remove script tags and contents
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove inline event handlers (e.g. onload, onclick, onerror)
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3. Neutralize javascript: or data: URIs in href, src, or xlink:href
  cleaned = cleaned.replace(/(href|xlink:href|src)\s*=\s*["']?\s*(?:javascript|data:text\/html|vbscript):[^"'\s>]+/gi, '$1="#"');

  // 4. Strip iframe, object, embed, or applet tags
  cleaned = cleaned.replace(/<(?:iframe|object|embed|applet)\b[^<]*(?:(?!<\/(?:iframe|object|embed|applet)>)<[^<]*)*<\/(?:iframe|object|embed|applet)>/gi, '');

  // 5. Ensure SVG element has appropriate attributes for rendering if it's raw SVG
  if (!cleaned.includes('<svg') && !cleaned.includes('</svg>')) {
    cleaned = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${cleaned}</svg>`;
  }

  return cleaned;
}

export function validateSvg(rawSvg: string): { isValid: boolean; error?: string } {
  if (!rawSvg || !rawSvg.trim()) {
    return { isValid: false, error: 'SVG markup is empty.' };
  }
  const hasSvgTag = rawSvg.includes('<svg') || rawSvg.includes('<path') || rawSvg.includes('<circle') || rawSvg.includes('<g');
  if (!hasSvgTag) {
    return { isValid: false, error: 'Invalid SVG vector content.' };
  }
  return { isValid: true };
}
