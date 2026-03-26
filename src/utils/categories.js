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

export const DEFAULT_CATEGORY = 'Misc';

export const getCategoryIndex = (category) => {
  const index = CATEGORIES.indexOf(category);
  return index === -1 ? CATEGORIES.length - 1 : index;
};
