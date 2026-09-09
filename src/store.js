const KEY = 'stretch-walls-calculations-v1';
export const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
export const load = () => JSON.parse(localStorage.getItem(KEY) || '[]');
export const saveAll = items => localStorage.setItem(KEY, JSON.stringify(items));
export const blankProject = () => ({ id: uid('project'), name: '', client: '', phone: '', comment: '', updatedAt: new Date().toISOString(), rooms: [] });
export const blankRoom = number => ({ id: uid('room'), name: `Комната ${number}`, walls: [] });
export const blankWall = number => ({
  id: uid('wall'), name: `Стена ${number}`, width: 4200, height: 2700,
  profiles: { top: 'profile_corner', bottom: 'profile_bumper', left: 'profile_corner', right: 'profile_corner' },
  sockets: 0, innerCorners: 0, outerCorners: 0, soundproof: false,
  soundproofArea: 11.34, soundproofAreaManual: false
});
