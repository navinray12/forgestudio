import type { EditorElement, ElementType } from '../types';

export const STUDIO_BLOCKS = [
  { id: 'container', label: 'Container', group: 'Layouts', type: 'container' },
  { id: 'section', label: 'Section', group: 'Layouts', type: 'container' },
  { id: 'grid', label: 'Grid', group: 'Layouts', type: 'container' },
  { id: 'columns', label: 'Columns', group: 'Layouts', type: 'container' },
  { id: 'divider', label: 'Divider', group: 'Layouts', type: 'divider' },
  { id: 'spacer', label: 'Spacer', group: 'Layouts', type: 'spacer' },
  { id: 'heading', label: 'Heading', group: 'Basic Elements', type: 'heading' },
  { id: 'text', label: 'Text', group: 'Basic Elements', type: 'text' },
  { id: 'button', label: 'Button', group: 'Basic Elements', type: 'button' },
  { id: 'image', label: 'Image', group: 'Basic Elements', type: 'image' },
  { id: 'video', label: 'Video', group: 'Basic Elements', type: 'video' },
  { id: 'icon', label: 'Icon', group: 'Basic Elements', type: 'icon' },
  { id: 'list', label: 'List', group: 'Basic Elements', type: 'icon-list' },
  { id: 'quote', label: 'Quote', group: 'Basic Elements', type: 'blockquote' },
  { id: 'form', label: 'Form', group: 'FORMS & TOOLS', type: 'form' },
  { id: 'date-picker', label: 'Date Picker', group: 'FORMS & TOOLS', type: 'form' },
  { id: 'search', label: 'Search', group: 'FORMS & TOOLS', type: 'site-search' },
  { id: 'map', label: 'Map', group: 'FORMS & TOOLS', type: 'google-maps' },
] as const satisfies ReadonlyArray<{id: string; label: string; group: string; type: ElementType}>;

export type StudioBlockId = typeof STUDIO_BLOCKS[number]['id'];

/** Built-ins use the canonical editor schema and the existing website persistence API. */
export function createStudioBlock(id: string, create: (type: ElementType) => EditorElement): EditorElement | null {
  const block = STUDIO_BLOCKS.find(item => item.id === id);
  if (!block) return null;
  const element = create(block.type);
  if (id === 'section') {
    element.content = 'Section';
    element.styles = {...element.styles, paddingTop: '64px', paddingBottom: '64px'};
  }
  if (id === 'grid') {
    element.content = block.label;
    element.layout = {...element.layout, layoutType: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24};
    element.children = Array.from({length: 4}, () => create('container'));
    element.responsiveLayout = {mobile: {layoutType: 'grid', gridTemplateColumns: '1fr'}};
  }
  if (id === 'columns') {
    element.content = 'Columns';
    element.layout = {...element.layout, layoutType: 'flex', direction: 'row', gap: 24};
    element.children = Array.from({length: 2}, () => {
      const column = create('container');
      column.styles = {...column.styles, width: 'calc(50% - 12px)', minWidth: '0px'};
      column.responsiveStyles = {mobile: {width: '100%'}};
      return column;
    });
    element.responsiveLayout = {mobile: {direction: 'column'}};
  }
  if (id === 'list') {
    element.content = 'List';
    element.iconListItems = ['First item', 'Second item', 'Third item'].map((text, index) => ({id: `${element.id}_item_${index}`, text, icon: '\u2713', color: '#a78bfa'}));
  }
  if (id === 'date-picker') {
    element.content = 'Date Picker';
    element.formTitle = 'Choose a date';
    element.formSubtitle = 'Select your preferred date below.';
    element.formFields = [{id: `${element.id}_date`, type: 'date', label: 'Date', required: true, width: 'full'}];
    element.formSubmitText = 'Submit date';
    element.formActions = {saveToDb: true};
  }
  return element;
}
