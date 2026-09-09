const labels = { profile_corner: 'Угловой', profile_bumper: 'Отбойник', profile_shadow: 'Теневой', '': 'Без профиля' };
export function drawing(wall) {
  const ratio = Math.max(.5, Math.min(2, wall.width / wall.height));
  return `<section class="drawing card"><div class="section-title"><div><span class="eyebrow">СХЕМА</span><h2>Чертёж стены</h2></div><span class="muted">Вид спереди</span></div>
    <div class="drawing-stage"><div class="measure measure-top">${wall.width} мм</div><div class="measure measure-left">${wall.height} мм</div>
      <div class="wall-shape" style="aspect-ratio:${ratio}"><span class="profile-label label-top">${labels[wall.profiles.top]}</span><span class="profile-label label-bottom">${labels[wall.profiles.bottom]}</span><span class="profile-label label-left">${labels[wall.profiles.left]}</span><span class="profile-label label-right">${labels[wall.profiles.right]}</span></div>
    </div><div class="legend"><span><i class="dot orange"></i> Профиль</span><span><i class="dot gray"></i> Размер стены</span></div></section>`;
}
