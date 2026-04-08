export type ItemCategory = 'Food' | 'Drinks' | 'Gear' | 'Games/Activities';

export interface CampItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  assignedTo: string;
  bought: boolean;
  boughtBy?: string;
  boughtAt?: number;
  addedBy: string;
  createdAt: number;
}

export const CATEGORIES: ItemCategory[] = ['Food', 'Drinks', 'Gear', 'Games/Activities'];

export const CATEGORY_COLORS: Record<ItemCategory, { bg: string; text: string; border: string }> = {
  'Food':            { bg: 'bg-earth-100',  text: 'text-earth-800',  border: 'border-earth-300' },
  'Drinks':          { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300' },
  'Gear':            { bg: 'bg-bark-100',   text: 'text-bark-800',   border: 'border-bark-300' },
  'Games/Activities':{ bg: 'bg-forest-100', text: 'text-forest-800', border: 'border-forest-300' },
};

export const CATEGORY_EMOJIS: Record<ItemCategory, string> = {
  'Food':            '🍕',
  'Drinks':          '🥤',
  'Gear':            '🏕️',
  'Games/Activities':'🎮',
};
