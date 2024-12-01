const COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#4f46e5', // indigo
  '#db2777', // pink
];

export const getRandomColor = () => 
  COLORS[Math.floor(Math.random() * COLORS.length)];