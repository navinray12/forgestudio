export type FontCategory = 
  | 'sans-serif' 
  | 'serif' 
  | 'display' 
  | 'handwriting' 
  | 'monospace' 
  | 'system';

export type FontSource = 'google' | 'system' | 'custom';

export interface FontVariant {
  weight: number;
  style: 'normal' | 'italic';
  fileUrl?: string;
}

export interface FontMetadata {
  family: string;
  category: FontCategory;
  weights: number[];
  hasItalic: boolean;
  fallback: string;
  popular?: boolean;
  source: FontSource;
  variants?: FontVariant[];
}

export interface GlobalFontConfig {
  heading?: string;
  body?: string;
  button?: string;
  nav?: string;
}

export interface FontSearchFilter {
  query?: string;
  category?: FontCategory | 'all' | 'recent' | 'favorites';
  popularOnly?: boolean;
}
