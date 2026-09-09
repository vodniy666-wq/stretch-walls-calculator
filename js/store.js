const KEY = 'stenograf-projects-v1';
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const loadProjects = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};
export const saveProjects = (projects) => localStorage.setItem(KEY, JSON.stringify(projects));

export const makeWall = (number) => ({
  id: uid(), name: `Стена ${number}`, width: 4200, height: 2700,
  profiles: { top: 'profile_corner', bottom: 'profile_bumper', left: 'profile_corner', right: 'profile_corner' },
  extras: { socket: 0, inner_corner: 0, outer_corner: 0 },
  soundproof: { enabled: false, custom: false, area: 0 }
});
export const makeRoom = (number) => ({ id: uid(), name: `Комната ${number}`, walls: [] });
export const makeProject = (details = {}) => ({
  id: uid(), name: details.name?.trim() || 'Новый объект', client: details.client?.trim() || '',
  phone: details.phone?.trim() || '', comment: details.comment?.trim() || '',
  rooms: [], updatedAt: new Date().toISOString()
});
