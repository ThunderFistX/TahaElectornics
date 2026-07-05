export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const assetUrl = (path) => {
  if (!path) return '/1.webp';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${API_URL.replace('/api', '')}${path}`;
};
