import { useState } from 'react';
import { Box, PanelsTopLeft, Grid3X3, Columns2, Minus, MoveVertical, Heading, AlignLeft, RectangleEllipsis, Image, SquarePlay, Star, List, Quote, FileInput, CalendarDays, Search, MapPin, X } from 'lucide-react';
import { STUDIO_BLOCKS, type StudioBlockId } from '../defaults/studioBlocks';
import type { ElementType } from '../types';
import type { StudioSection } from './StudioChrome';
import './StudioBlocksPanel.css';

const icons = {container: Box, section: PanelsTopLeft, grid: Grid3X3, columns: Columns2, divider: Minus, spacer: MoveVertical, heading: Heading, text: AlignLeft, button: RectangleEllipsis, image: Image, video: SquarePlay, icon: Star, list: List, quote: Quote, form: FileInput, 'date-picker': CalendarDays, search: Search, map: MapPin};

export function StudioBlocksPanel({selectSection, insert, disabledWidgets, restricted}: {
  selectSection: (section: StudioSection) => void;
  insert: (id: StudioBlockId) => void;
  disabledWidgets: ElementType[];
  restricted: boolean;
}) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visible = STUDIO_BLOCKS.filter(block => `${block.label} ${block.group}`.toLowerCase().includes(query));
  const showTemplate = !query || 'templates'.includes(query);
  return <aside className="studio-blocks" aria-label="Blocks library">
    <div className="studio-panel-tabs" role="tablist" aria-label="Editor library">
      {(['pages', 'blocks', 'assets'] as const).map(tab => <button key={tab} role="tab" aria-selected={tab === 'blocks'} className={tab === 'blocks' ? 'active' : ''} onClick={() => selectSection(tab)}>{tab}</button>)}
    </div>
    <div className="studio-block-search"><Search size={14}/><input aria-label="Search blocks" placeholder="Search blocks..." value={search} onChange={e => setSearch(e.target.value)}/>{search && <button aria-label="Clear block search" onClick={() => setSearch('')}><X size={13}/></button>}</div>
    {restricted && <p className="studio-block-notice" role="status">Your role allows content editing. Adding blocks requires design access.</p>}
    {showTemplate && <section className="studio-block-group studio-block-templates"><h3>Templates</h3><button className="studio-block-template" disabled={restricted} onClick={() => selectSection('templates')} aria-label="Browse templates"><img src="/editor/blocks-template-preview.png" alt="Landing page template preview"/></button></section>}
    {['Layouts', 'Basic Elements', 'FORMS & TOOLS'].map(group => {
      const blocks = visible.filter(block => block.group === group);
      if (!blocks.length) return null;
      return <section className="studio-block-group" key={group}><h3>{group}</h3><div className="studio-block-grid">{blocks.map(block => {
        const Icon = icons[block.id];
        const disabled = restricted || disabledWidgets.includes(block.type);
        return <button key={block.id} className="studio-block-card" data-block-id={block.id} disabled={disabled} draggable={!disabled} title={disabled ? `${block.label} is unavailable for this editor` : `Add ${block.label} (or drag onto the canvas)`} onClick={() => insert(block.id)} onDragStart={e => {
          if (disabled) {e.preventDefault(); return;}
          e.dataTransfer.setData('application/json', JSON.stringify({type: 'studio-block', blockId: block.id}));
          // Existing canvas drop zones choose a move cursor for all editor drags.
          e.dataTransfer.effectAllowed = 'copyMove';
        }}><Icon size={16} strokeWidth={1.7}/><span>{block.label === 'Date Picker' ? <>Date<br/>Picker</> : block.label}</span></button>;
      })}</div></section>;
    })}
    {!visible.length && !showTemplate && <p className="studio-block-notice" role="status">No blocks found for “{search}”.</p>}
  </aside>;
}
