export const getMappedColorHex = (colorName) => {
  if (!colorName) return '#f1f5f9';
  const c = colorName.toLowerCase().trim();
  
  if (c.includes('black')) return '#0f172a'; // slate-900
  if (c.includes('white')) return '#ffffff';
  if (c.includes('silver')) return '#cbd5e1'; // slate-300
  if (c.includes('gray') || c.includes('grey')) return '#64748b'; // slate-500
  if (c.includes('blue')) return '#3b82f6'; // blue-500
  if (c.includes('red')) return '#ef4444'; // red-500
  if (c.includes('green')) return '#22c55e'; // green-500
  if (c.includes('yellow')) return '#eab308'; // yellow-500
  if (c.includes('gold')) return '#ca8a04'; // yellow-600
  if (c.includes('orange')) return '#f97316'; // orange-500
  if (c.includes('purple')) return '#a855f7'; // purple-500
  if (c.includes('brown')) return '#78350f'; // amber-900
  if (c.includes('beige')) return '#fef3c7'; // amber-50
  if (c.includes('pink')) return '#ec4899'; // pink-500
  if (c.includes('maroon')) return '#831843'; // pink-900
  if (c.includes('navy')) return '#1e3a8a'; // blue-900
  if (c.includes('wine')) return '#9f1239'; // rose-800
  
  // if it's a valid hex, return it
  if (c.startsWith('#')) return c;
  
  // fallback for things like "lightblue" or just a basic color string
  return c.replace(/\s+/g, '');
};
