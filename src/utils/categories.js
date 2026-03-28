export const CATEGORIES = [
  'Irrigation Supplies',
  'Landscaping Manual Tools',
  'Landscaping Power Tools/Supplies',
  'Construction Tools',
  'Construction Supplies',
  'Painting Supplies',
  'Safety & Medical Equipment',
  'Misc',
];

export const CATEGORY_COLORS = {
  'Irrigation Supplies': '#06b6d4',
  'Landscaping Manual Tools': '#10b981',
  'Landscaping Power Tools/Supplies': '#22c55e',
  'Construction Tools': '#f59e0b',
  'Construction Supplies': '#f97316',
  'Painting Supplies': '#ec4899',
  'Safety & Medical Equipment': '#ef4444',
  'Misc': '#8b5cf6',
};

export const DEFAULT_CATEGORY = 'Misc';

export const getCategoryIndex = (category) => {
  const index = CATEGORIES.indexOf(category);
  return index === -1 ? CATEGORIES.length - 1 : index;
};

export const getCategoryColor = (category) => {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Misc'];
};
