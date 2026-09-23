/**
 * @file Fonts feature: Font Service. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { FontMetadata, FontCategory, FontSearchFilter } from './types';
import { FontRegistry } from './FontRegistry';
import { loadFontFamily } from './FontLoader';

const FAVORITES_KEY = 'fs_favorite_fonts';
const RECENT_KEY = 'fs_recent_fonts';

class FontServiceClass {
  private favorites: Set<string> = new Set();
  private recentlyUsed: string[] = [];

  /**
   * Constructor.
   */
  constructor() {
    this.loadStorage();
  }

  /**
   * Load Storage.
   */
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

  /**
   * Save Favorites.
   */
  private saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(this.favorites)));
    } catch (e) {}
  }

  /**
   * Save Recently Used.
   */
  private saveRecentlyUsed() {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(this.recentlyUsed));
    } catch (e) {}
  }

  /**
   * Get Favorites.
   */
  public getFavorites(): FontMetadata[] {
    return Array.from(this.favorites)
      .map((fam) => FontRegistry.getFontMetadata(fam))
      .filter(Boolean);
  }

  /**
   * Is Favorite.
   * @param family Family supplied to this operation (type: string).
   */
  public isFavorite(family: string): boolean {
    return this.favorites.has(family.toLowerCase());
  }

  /**
   * Toggle Favorite.
   * @param family Family supplied to this operation (type: string).
   */
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

  /**
   * Get Recently Used.
   */
  public getRecentlyUsed(): FontMetadata[] {
    return this.recentlyUsed
      .map((fam) => FontRegistry.getFontMetadata(fam))
      .filter(Boolean);
  }

  /**
   * Add Recently Used.
   * @param family Family supplied to this operation (type: string).
   */
  public addRecentlyUsed(family: string): void {
    if (!family || family === 'inherit' || family === 'default') return;
    const clean = family.replace(/["']/g, '').trim();
    const key = clean.toLowerCase();

    this.recentlyUsed = [clean, ...this.recentlyUsed.filter((item) => item.toLowerCase() !== key)].slice(0, 15);
    this.saveRecentlyUsed();
  }

  /**
   * Search Fonts.
   * @param filter Filter supplied to this operation (type: FontSearchFilter).
   */
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

  /**
   * Get Font Metadata.
   * @param family Family supplied to this operation (type: string). Optional; callers may omit it.
   */
  public getFontMetadata(family?: string): FontMetadata {
    return FontRegistry.getFontMetadata(family);
  }

  /**
   * Get Font Family Css.
   * @param family Family supplied to this operation (type: string). Optional; callers may omit it.
   */
  public getFontFamilyCss(family?: string): string {
    if (!family || family === 'inherit' || family === 'default') return 'inherit';

    const clean = family.replace(/["']/g, '').trim();
    const meta = FontRegistry.getFontMetadata(clean);
    
    if (meta.source === 'system') {
      return `"${clean}", ${meta.fallback}`;
    }
    return `"${clean}", ${meta.fallback}`;
  }

  /**
   * Get Supported Weights.
   * @param family Family supplied to this operation (type: string). Optional; callers may omit it.
   */
  public getSupportedWeights(family?: string): number[] {
    const meta = FontRegistry.getFontMetadata(family);
    return meta.weights && meta.weights.length > 0 ? meta.weights : [400, 700];
  }

  /**
   * Has Italic.
   * @param family Family supplied to this operation (type: string). Optional; callers may omit it.
   */
  public hasItalic(family?: string): boolean {
    const meta = FontRegistry.getFontMetadata(family);
    return Boolean(meta.hasItalic);
  }

  /**
   * Load Font.
   * @param family Family supplied to this operation (type: string).
   * @param weights Weights supplied to this operation (type: number[]). Optional; callers may omit it.
   */
  public loadFont(family: string, weights?: number[]): Promise<boolean> {
    this.addRecentlyUsed(family);
    return loadFontFamily(family, weights);
  }
}

export const FontService = new FontServiceClass();
