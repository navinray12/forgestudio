import { FontRegistry } from './FontRegistry';

// Track injected font families to prevent duplicate network calls
const loadedFontFamilies = new Set<string>();

/**
 * Dynamically injects Google Fonts CSS link for requested font family & weights
 */
export function loadFontFamily(family: string, weights?: number[]): Promise<boolean> {
  if (!family || family === 'inherit' || family === 'default') {
    return Promise.resolve(true);
  }

  const cleanFamily = family.replace(/["']/g, '').trim();
  const fontMeta = FontRegistry.getFontMetadata(cleanFamily);

  // System fonts do not require external HTTP font files
  if (fontMeta.source === 'system') {
    return Promise.resolve(true);
  }

  const cacheKey = `${cleanFamily.toLowerCase()}`;
  if (loadedFontFamilies.has(cacheKey)) {
    return Promise.resolve(true);
  }

  const targetWeights = weights && weights.length > 0 ? weights : fontMeta.weights || [400, 700];
  const sortedWeights = Array.from(new Set(targetWeights)).sort((a, b) => a - b);
  const encodedFamily = cleanFamily.replace(/\s+/g, '+');
  const weightString = sortedWeights.join(';');

  // Google Fonts API v2 URL format
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightString}&display=swap`;

  return new Promise((resolve) => {
    // Check if stylesheet link already exists in DOM
    const linkId = `font-link-${cleanFamily.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (document.getElementById(linkId)) {
      loadedFontFamilies.add(cacheKey);
      resolve(true);
      return;
    }

    // Ensure preconnects exist
    if (!document.querySelector('link[rel="preconnect"][href="https://fonts.googleapis.com"]')) {
      const p1 = document.createElement('link');
      p1.rel = 'preconnect';
      p1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(p1);
    }
    if (!document.querySelector('link[rel="preconnect"][href="https://fonts.gstatic.com"]')) {
      const p2 = document.createElement('link');
      p2.rel = 'preconnect';
      p2.href = 'https://fonts.gstatic.com';
      p2.crossOrigin = 'anonymous';
      document.head.appendChild(p2);
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = fontUrl;

    link.onload = () => {
      loadedFontFamilies.add(cacheKey);
      resolve(true);
    };

    link.onerror = () => {
      console.warn(`Failed to load Google Font: ${cleanFamily}`);
      resolve(false);
    };

    document.head.appendChild(link);
  });
}

/**
 * Preloads a batch of fonts (e.g. for preview in Font Picker)
 */
export function loadFontBatch(families: string[]): void {
  families.forEach((fam) => {
    loadFontFamily(fam).catch(() => {});
  });
}
