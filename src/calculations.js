export const money = value => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
export const area = wall => (Number(wall.width) * Number(wall.height)) / 1_000_000;

export function wallTotals(wall, prices) {
  const price = id => prices.find(item => item.id === id)?.price || 0;
  const wallArea = area(wall);
  const lengths = { top: wall.width / 1000, bottom: wall.width / 1000, left: wall.height / 1000, right: wall.height / 1000 };
  const profiles = Object.entries(lengths).reduce((sum, [side, length]) => sum + length * price(wall.profiles[side]), 0);
  const extras = wall.sockets * price('socket') + wall.innerCorners * price('inner_corner') + wall.outerCorners * price('outer_corner');
  const soundproof = wall.soundproof ? Number(wall.soundproofArea) * price('soundproof') : 0;
  const canvas = wallArea * price('wall_canvas');
  return { area: wallArea, profiles, extras, soundproof, canvas, total: profiles + extras + soundproof + canvas };
}

export function roomTotals(room, prices) {
  return room.walls.reduce((sum, wall) => {
    const value = wallTotals(wall, prices);
    Object.keys(value).forEach(key => { sum[key] += value[key]; });
    return sum;
  }, { area: 0, profiles: 0, extras: 0, soundproof: 0, canvas: 0, total: 0 });
}
