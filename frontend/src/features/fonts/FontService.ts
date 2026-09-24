import type { FontMetadata, FontCategory, FontSearchFilter } from './types';
import { FontRegistry } from './FontRegistry';
import { loadFontFamily } from './FontLoader';

const FAVORITES_KEY = 'fs_favorite_fonts';
const RECENT_KEY = 'fs_recent_fonts';

class FontServiceClass {
  private favorites: Set<string> = new Set();
  private recentlyUsed: string[] = [];

  constructor() {
    this.loadStorage();
  }

  private loadStorage() {
    try {
      const favStr = localStorage.getItem(FAVORITES_KEY);
      if (favStr) {
        this.favorites = new Set(JSON.parse(favStr));
      }
      const recStr = localStorage.getItem(RECENT_KEY);
      if (recStr) {
        this.recentlyUsed = JSON.parse(recStr);
      }
    } catch (e) {
      console.warn('LocalStorage font cache access warning:', e);
    }
  }

  private saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(this.favorites)));
    } catch (e) {}
  }

  private saveRecentlyUsed() {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(this.recentlyUsed));
    } catch (e) {}
  }

  public getFavorites(): FontMetadata[] {
    return Array.from(this.favorites)
      .map((fam) => FontRegistry.getFontMetadata(fam))
      .filter(Boolean);
  }

  public isFavorite(family: string): boolean {
    return this.favorites.has(family.toLowerCase());
  }

  public toggleFavorite(family: string): boolean {
    const key = family.toLowerCase();
    if (this.favorites.has(key)) {
      this.favorites.delete(key);
    } else {
      this.favorites.add(key);
    }
    this.saveFavorites();
    return this.favorites.has(key);
  }

  public getRecentlyUsed(): FontMetadata[] {
    return this.recentlyUsed
      .map((fam) => FontRegistry.getFontMetadata(fam))
      .filter(Boolean);
  }

  public addRecentlyUsed(family: string): void {
    if (!family || family === 'inherit' || family === 'default') return;
    const clean = family.replace(/["']/g, '').trim();
    const key = clean.toLowerCase();

    this.recentlyUsed = [clean, ...this.recentlyUsed.filter((item) => item.toLowerCase() !== key)].slice(0, 15);
    this.saveRecentlyUsed();
  }

  public searchFonts(filter: FontSearchFilter): FontMetadata[] {
    const allFonts = FontRegistry.getAllFonts();
    const queryStr = (filter.query || '').trim().toLowerCase();
    const category = filter.category || 'all';

    return allFonts.filter((font) => {
      // Category filter
      if (category === 'recent') {
        if (!this.recentlyUsed.some((f) => f.toLowerCase() === font.family.toLowerCase())) return false;
      } else if (category === 'favorites') {
        if (!this.isFavorite(font.family)) return false;
      } else if (category === 'system') {
        if (font.source !== 'system') return false;
      } else if (category !== 'all') {
        if (font.category !== category) return false;
      }

      if (filter.popularOnly && !font.popular) {
        return false;
      }

      // Case-insensitive search match
      if (queryStr) {
        const familyMatch = font.family.toLowerCase().includes(queryStr);
        const categoryMatch = font.category.toLowerCase().includes(queryStr);
        if (!familyMatch && !categoryMatch) return false;
      }

      return true;
    });
  }

  public getFontMetadata(family?: string): FontMetadata {
    return FontRegistry.getFontMetadata(family);
  }

  public getFontFamilyCss(family?: string): string {
    if (!family || family === 'inherit' || family === 'default') return 'inherit';

    const clean = family.replace(/["']/g, '').trim();
    const meta = FontRegistry.getFontMetadata(clean);
    
    if (meta.source === 'system') {
      return `"${clean}", ${meta.fallback}`;
    }
    return `"${clean}", ${meta.fallback}`;
  }

  public getSupportedWeights(family?: string): number[] {
    const meta = FontRegistry.getFontMetadata(family);
    return meta.weights && meta.weights.length > 0 ? meta.weights : [400, 700];
  }

  public hasItalic(family?: string): boolean {
    const meta = FontRegistry.getFontMetadata(family);
    return Boolean(meta.hasItalic);
  }

  public getFontPairings(): { id: string; name: string; heading: string; body: string; description: string; category: string }[] {
    return [
      { id: 'pair_1', name: 'Modern Sans', heading: 'Inter', body: 'Roboto', description: 'Clean, highly legible corporate & SaaS layout pairing.', category: 'SaaS / Modern' },
      { id: 'pair_2', name: 'Editorial Serif', heading: 'Playfair Display', body: 'Source Sans Pro', description: 'High contrast luxury, magazine & editorial design.', category: 'Editorial / Luxury' },
      { id: 'pair_3', name: 'Creative Display', heading: 'Abril Fatface', body: 'Poppins', description: 'Bold statement headings paired with friendly geometric body font.', category: 'Creative / Agency' },
      { id: 'pair_4', name: 'Tech & Code', heading: 'Oswald', body: 'Fira Code', description: 'Industrial condensed headline with crisp developer body font.', category: 'Tech / Portfolio' },
      { id: 'pair_5', name: 'Warm Warmth', heading: 'Merriweather', body: 'Open Sans', description: 'Warm literary serif with balanced humanist sans-serif.', category: 'Blog / E-commerce' },
      { id: 'pair_6', name: 'Minimalist Clean', heading: 'Montserrat', body: 'Lato', description: 'Geometric geometric header with soft neutral body text.', category: 'Minimalist' },
    ];
  }

  public loadFont(family: string, weights?: number[]): Promise<boolean> {
    this.addRecentlyUsed(family);
    return loadFontFamily(family, weights);
  }
}

export const FontService = new FontServiceClass();
