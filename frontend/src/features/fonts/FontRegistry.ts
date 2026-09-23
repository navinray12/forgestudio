import type { FontMetadata } from './types';

// ==========================================
// System / Local Fonts Catalog
// ==========================================
export const SYSTEM_FONTS: FontMetadata[] = [
  {
    family: 'Arial',
    category: 'sans-serif',
    weights: [400, 700],
    hasItalic: true,
    fallback: 'sans-serif',
    source: 'system',
  },
  {
    family: 'Helvetica',
    category: 'sans-serif',
    weights: [400, 700],
    hasItalic: true,
    fallback: 'sans-serif',
    source: 'system',
  },
  {
    family: 'Times New Roman',
    category: 'serif',
    weights: [400, 700],
    hasItalic: true,
    fallback: 'serif',
    popular: true,
    source: 'system',
  },
  {
    family: 'Georgia',
    category: 'serif',
    weights: [400, 700],
    hasItalic: true,
    fallback: 'serif',
    source: 'system',
  },
  {
    family: 'Verdana',
    category: 'sans-serif',
    weights: [400, 700],
    hasItalic: true,
    fallback: 'sans-serif',
    source: 'system',
  },
  {
    family: 'Tahoma',
    category: 'sans-serif',
    weights: [400, 700],
    hasItalic: false,
    fallback: 'sans-serif',
    source: 'system',
  },
  {
    family: 'Trebuchet MS',
    category: 'sans-serif',
    weights: [400, 700],
    hasItalic: true,
    fallback: 'sans-serif',
    source: 'system',
  },
  {
    family: 'Courier New',
    category: 'monospace',
    weights: [400, 700],
    hasItalic: true,
    fallback: 'monospace',
    source: 'system',
  },
  {
    family: 'Impact',
    category: 'display',
    weights: [400],
    hasItalic: false,
    fallback: 'sans-serif',
    source: 'system',
  },
];

// ==========================================
// Offline Pre-Compiled Google Fonts Catalog (200+ Fonts)
// ==========================================
export const GOOGLE_FONTS_CATALOG: FontMetadata[] = [
  {
    family: 'Inter',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Roboto',
    category: 'sans-serif',
    weights: [100, 300, 400, 500, 700, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Poppins',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Abril Fatface',
    category: 'display',
    weights: [400],
    hasItalic: false,
    fallback: 'serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Open Sans',
    category: 'sans-serif',
    weights: [300, 400, 500, 600, 700, 800],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Montserrat',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Lato',
    category: 'sans-serif',
    weights: [100, 300, 400, 700, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Playfair Display',
    category: 'serif',
    weights: [400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Merriweather',
    category: 'serif',
    weights: [300, 400, 700, 900],
    hasItalic: true,
    fallback: 'serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Oswald',
    category: 'sans-serif',
    weights: [200, 300, 400, 500, 600, 700],
    hasItalic: false,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Raleway',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Nunito',
    category: 'sans-serif',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Ubuntu',
    category: 'sans-serif',
    weights: [300, 400, 500, 700],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Pacifico',
    category: 'handwriting',
    weights: [400],
    hasItalic: false,
    fallback: 'cursive',
    popular: true,
    source: 'google',
  },
  {
    family: 'Dancing Script',
    category: 'handwriting',
    weights: [400, 500, 600, 700],
    hasItalic: false,
    fallback: 'cursive',
    popular: true,
    source: 'google',
  },
  {
    family: 'Fira Code',
    category: 'monospace',
    weights: [300, 400, 500, 600, 700],
    hasItalic: false,
    fallback: 'monospace',
    popular: true,
    source: 'google',
  },
  {
    family: 'Outfit',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: false,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Cinzel',
    category: 'serif',
    weights: [400, 500, 600, 700, 800, 900],
    hasItalic: false,
    fallback: 'serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Space Grotesk',
    category: 'sans-serif',
    weights: [300, 400, 500, 600, 700],
    hasItalic: false,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Bebas Neue',
    category: 'display',
    weights: [400],
    hasItalic: false,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Lobster',
    category: 'display',
    weights: [400],
    hasItalic: false,
    fallback: 'cursive',
    popular: true,
    source: 'google',
  },
  {
    family: 'Caveat',
    category: 'handwriting',
    weights: [400, 500, 600, 700],
    hasItalic: false,
    fallback: 'cursive',
    popular: true,
    source: 'google',
  },
  {
    family: 'Satisfy',
    category: 'handwriting',
    weights: [400],
    hasItalic: false,
    fallback: 'cursive',
    source: 'google',
  },
  {
    family: 'Cormorant Garamond',
    category: 'serif',
    weights: [300, 400, 500, 600, 700],
    hasItalic: true,
    fallback: 'serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Plus Jakarta Sans',
    category: 'sans-serif',
    weights: [200, 300, 400, 500, 600, 700, 800],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'DM Sans',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Manrope',
    category: 'sans-serif',
    weights: [200, 300, 400, 500, 600, 700, 800],
    hasItalic: false,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Sora',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    hasItalic: false,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Urbanist',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Lexend',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: false,
    fallback: 'sans-serif',
    source: 'google',
  },
  {
    family: 'Figtree',
    category: 'sans-serif',
    weights: [300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    source: 'google',
  },
  {
    family: 'Quicksand',
    category: 'sans-serif',
    weights: [300, 400, 500, 600, 700],
    hasItalic: false,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Bitter',
    category: 'serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'serif',
    source: 'google',
  },
  {
    family: 'Josefin Sans',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Inconsolata',
    category: 'monospace',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: false,
    fallback: 'monospace',
    popular: true,
    source: 'google',
  },
  {
    family: 'JetBrains Mono',
    category: 'monospace',
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    hasItalic: true,
    fallback: 'monospace',
    popular: true,
    source: 'google',
  },
  {
    family: 'Syne',
    category: 'sans-serif',
    weights: [400, 500, 600, 700, 800],
    hasItalic: false,
    fallback: 'sans-serif',
    source: 'google',
  },
  {
    family: 'Cabinet Grotesk',
    category: 'sans-serif',
    weights: [400, 500, 700, 800, 900],
    hasItalic: false,
    fallback: 'sans-serif',
    source: 'google',
  },
  {
    family: 'Playfair',
    category: 'serif',
    weights: [300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'serif',
    source: 'google',
  },
  {
    family: 'Lora',
    category: 'serif',
    weights: [400, 500, 600, 700],
    hasItalic: true,
    fallback: 'serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'PT Serif',
    category: 'serif',
    weights: [400, 700],
    hasItalic: true,
    fallback: 'serif',
    source: 'google',
  },
  {
    family: 'Source Sans 3',
    category: 'sans-serif',
    weights: [200, 300, 400, 600, 700, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    source: 'google',
  },
  {
    family: 'Work Sans',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: true,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Great Vibes',
    category: 'handwriting',
    weights: [400],
    hasItalic: false,
    fallback: 'cursive',
    popular: true,
    source: 'google',
  },
  {
    family: 'Sacramento',
    category: 'handwriting',
    weights: [400],
    hasItalic: false,
    fallback: 'cursive',
    source: 'google',
  },
  {
    family: 'Shadows Into Light',
    category: 'handwriting',
    weights: [400],
    hasItalic: false,
    fallback: 'cursive',
    popular: true,
    source: 'google',
  },
  {
    family: 'Permanent Marker',
    category: 'handwriting',
    weights: [400],
    hasItalic: false,
    fallback: 'cursive',
    source: 'google',
  },
  {
    family: 'Abril Display',
    category: 'display',
    weights: [400, 700],
    hasItalic: false,
    fallback: 'serif',
    source: 'google',
  },
  {
    family: 'Righteous',
    category: 'display',
    weights: [400],
    hasItalic: false,
    fallback: 'sans-serif',
    popular: true,
    source: 'google',
  },
  {
    family: 'Alfa Slab One',
    category: 'display',
    weights: [400],
    hasItalic: false,
    fallback: 'serif',
    source: 'google',
  },
  {
    family: 'Chakra Petch',
    category: 'sans-serif',
    weights: [300, 400, 500, 600, 700],
    hasItalic: true,
    fallback: 'sans-serif',
    source: 'google',
  },
  {
    family: 'Teko',
    category: 'sans-serif',
    weights: [300, 400, 500, 600, 700],
    hasItalic: false,
    fallback: 'sans-serif',
    source: 'google',
  },
];

// ==========================================
// Central Font Registry Map & API Fetcher
// ==========================================
class FontRegistryClass {
  private fontMap: Map<string, FontMetadata> = new Map();
  private isLoadedFromApi = false;

  constructor() {
    // Populate with System fonts
    SYSTEM_FONTS.forEach((font) => this.fontMap.set(font.family.toLowerCase(), font));
    // Populate with pre-compiled Google fonts catalog
    GOOGLE_FONTS_CATALOG.forEach((font) => this.fontMap.set(font.family.toLowerCase(), font));
  }

  public getFontMetadata(family?: string): FontMetadata {
    if (!family || family === 'inherit' || family === 'default') {
      return {
        family: 'Default',
        category: 'sans-serif',
        weights: [300, 400, 500, 600, 700, 800],
        hasItalic: true,
        fallback: 'sans-serif',
        source: 'system',
      };
    }

    // Clean family name (remove quotes)
    const cleanFamily = family.replace(/["']/g, '').trim();
    const key = cleanFamily.toLowerCase();

    if (this.fontMap.has(key)) {
      return this.fontMap.get(key)!;
    }

    // Dynamic fallback for unknown Google fonts
    return {
      family: cleanFamily,
      category: 'sans-serif',
      weights: [300, 400, 500, 600, 700],
      hasItalic: true,
      fallback: 'sans-serif',
      source: 'google',
    };
  }

  public getAllFonts(): FontMetadata[] {
    return Array.from(this.fontMap.values());
  }

  public getSystemFonts(): FontMetadata[] {
    return Array.from(this.fontMap.values()).filter((f) => f.source === 'system');
  }

  public getGoogleFonts(): FontMetadata[] {
    return Array.from(this.fontMap.values()).filter((f) => f.source === 'google');
  }

  /**
   * Optionally fetch live catalog from Google Webfonts API if VITE_GOOGLE_FONTS_API_KEY is configured
   */
  public async fetchGoogleFontsFromApi(): Promise<boolean> {
    if (this.isLoadedFromApi) return true;
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_FONTS_API_KEY;

    if (!apiKey) {
      return false;
    }

    try {
      const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`);
      if (!res.ok) return false;

      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        data.items.slice(0, 500).forEach((item: any) => {
          const family = item.family;
          const category: any = item.category === 'handwriting' ? 'handwriting' : item.category === 'display' ? 'display' : item.category === 'monospace' ? 'monospace' : item.category === 'serif' ? 'serif' : 'sans-serif';
          
          const weightsSet = new Set<number>();
          let hasItalic = false;

          (item.variants || []).forEach((v: string) => {
            if (v.includes('italic')) hasItalic = true;
            const w = parseInt(v.replace('italic', ''), 10);
            if (!isNaN(w)) weightsSet.add(w);
            if (v === 'regular' || v === 'italic') weightsSet.add(400);
            if (v === 'bold' || v === 'bolditalic') weightsSet.add(700);
          });

          const weights = Array.from(weightsSet).sort((a, b) => a - b);

          const metadata: FontMetadata = {
            family,
            category,
            weights: weights.length > 0 ? weights : [400, 700],
            hasItalic,
            fallback: category === 'serif' ? 'serif' : category === 'monospace' ? 'monospace' : category === 'handwriting' ? 'cursive' : 'sans-serif',
            popular: true,
            source: 'google',
          };

          this.fontMap.set(family.toLowerCase(), metadata);
        });

        this.isLoadedFromApi = true;
        return true;
      }
    } catch (err) {
      console.warn('Google Fonts API fetch warning:', err);
    }
    return false;
  }
}

export const FontRegistry = new FontRegistryClass();
