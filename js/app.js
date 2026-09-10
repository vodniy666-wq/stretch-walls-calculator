import { money, square, wallTotals, roomTotals, projectTotals, projectEstimate } from './calculator.js';
import { loadProjects, saveProjects, makeProject, makeRoom, makeWall, uid } from './store.js';
import { syncSocketPositions, wallDrawing } from './drawing.js';
import { normalizeNumericInput, parseNumericInput } from './numeric-input.js';

const app = document.querySelector('#app');
const saveButton = document.querySelector('#saveButton');
const toast = document.querySelector('#toast');
let prices = [];
let priceById = {};
let projects = loadProjects();
let current = null;

function migrateLegacyWalls() {
  let changed = false;
  for (const project of projects) for (const room of project.rooms || []) for (const wall of room.walls || []) {
    if (wall.material === 'material_standard') { wall.material = 'material_stretch_wall'; changed = true; }
    const profileMap = { profile_corner: 'profile_inner_corner', profile_bumper: 'profile_basic' };
    for (const side of ['top', 'bottom', 'left', 'right']) {
      if (profileMap[wall.profiles?.[side]]) { wall.profiles[side] = profileMap[wall.profiles[side]]; changed = true; }
    }
    if (wall.extras?.socket != null) {
      wall.extras.socket_type_1 = Math.max(0, Number(wall.extras.socket) || 0);
      delete wall.extras.socket; changed = true;
    }
    for (const removedId of ['inner_corner', 'outer_corner']) {
      if (wall.extras?.[removedId] != null) { delete wall.extras[removedId]; changed = true; }
    }
    if (wall.soundproof?.enabled != null) {
      wall.soundproof.id = wall.soundproof.enabled ? 'soundproof_heavy_felt' : '';
      delete wall.soundproof.enabled; changed = true;
    }
    const socketIds = Object.keys(wall.extras || {}).filter(id => id.startsWith('socket_type_'));
    const oldPositions = JSON.stringify(wall.socketPositions || {});
    syncSocketPositions(wall, socketIds);
    if (JSON.stringify(wall.socketPositions) !== oldPositions) changed = true;
  }
  if (changed) saveProjects(projects);
}

const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
const route = () => location.hash.slice(1).split('/').filter(Boolean);
const findProject = (id) => projects.find(project => project.id === id);
const getContext = () => {
  const [, projectId, roomId, wallId] = route();
  const project = findProject(projectId) || current;
  const room = project?.rooms.find(item => item.id === roomId);
  const wall = room?.walls.find(item => item.id === wallId);
  return { project, room, wall };
};
const go = (path) => { location.hash = path; };
const showToast = (message) => {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
};
const persist = (message) => {
  if (!current) return;
  current.updatedAt = new Date().toISOString();
  const index = projects.findIndex(project => project.id === current.id);
  if (index < 0) projects.unshift(current); else projects[index] = current;
  saveProjects(projects);
  if (message) showToast(message);
};
const heroBanner = () => `<section class="hero"><div><p class="eyebrow">Калькулятор натяжных стен</p><h1>Смета без<br><em>лишних движений</em></h1><p class="lead"><span class="lead-desktop">Комнаты, стены и материалы — в понятном расчёте, который всегда под рукой.</span><span class="lead-mobile">Комнаты, стены и материалы — в понятном расчёте.</span></p></div></section>`;
const page = (eyebrow, title, content, back = '') => `${heroBanner()}<div class="page">
  <div class="page-heading">${back ? `<button class="back" data-go="${back}">←</button>` : ''}<div><p class="eyebrow">${eyebrow}</p><h1>${esc(title)}</h1></div></div>${content}</div>`;

function renderHome() {
  current = null; saveButton.classList.add('hidden');
  app.innerHTML = `${heroBanner()}
  <section class="home-grid"><button class="menu-card" data-action="new"><span class="menu-icon accent">＋</span><span><b>Новый расчёт</b><small>Создать объект с нуля</small></span><i>→</i></button><button class="menu-card" data-go="saved"><span class="menu-icon">▤</span><span><b>Сохранённые</b><small>${projects.length} ${projects.length === 1 ? 'расчёт' : 'расчётов'}</small></span><i>→</i></button><button class="menu-card" data-go="price"><span class="menu-icon">₽</span><span><b>Прайс</b><small>${prices.length} позиций</small></span><i>→</i></button></section>`;
}

function renderNew() {
  saveButton.classList.add('hidden');
  app.innerHTML = page('Новый расчёт', 'Расскажите об объекте', `<form id="newForm" class="form-card"><label>Название объекта <span>*</span><input name="name" required autofocus placeholder="Например, квартира на Лесной"></label><div class="two-columns"><label>Имя клиента<input name="client" placeholder="Необязательно"></label><label>Телефон<input name="phone" inputmode="tel" placeholder="+7 999 000-00-00"></label></div><label>Комментарий<textarea name="comment" rows="3" placeholder="Особенности объекта"></textarea></label><button class="primary wide" type="submit">Создать расчёт <span>→</span></button></form>`, 'home');
}

function roomCard(project, room) {
  const totals = roomTotals(room, priceById);
  return `<article class="compact-card clickable" data-go="project/${project.id}/${room.id}"><div class="card-top"><div><h2>${esc(room.name)}</h2><p>${room.walls.length} стен · ${square(totals.area)}</p></div><b class="price">${money(totals.total)}</b></div><span class="edit-link">Открыть комнату <b>→</b></span></article>`;
}

function renderProject(project) {
  if (!project) return go('saved');
  current = project; saveButton.classList.remove('hidden');
  const totals = projectTotals(project, priceById);
  const estimate = projectEstimate(project, priceById);
  const estimateContent = estimate.groups.map(group => `<section class="estimate-group"><h3>${group.name}</h3>${group.rows.length ? group.rows.map(row => `<div class="estimate-row"><div class="estimate-name"><b>${esc(row.name)}</b><small>${Number(row.quantity).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${esc(row.unit)} × ${money(row.unitPrice)}</small></div><strong>${money(row.total)}</strong></div>`).join('') : '<p class="estimate-empty">Нет позиций</p>'}</section>`).join('');
  app.innerHTML = page('Объект', project.name, `<div class="client-line">${project.client ? `<span>Клиент: <b>${esc(project.client)}</b></span>` : ''}${project.phone ? `<span>${esc(project.phone)}</span>` : ''}<button class="text-button" data-action="edit-project">Изменить</button></div><section class="section-head"><div><h2>Комнаты</h2><p>${project.rooms.length} ${project.rooms.length === 1 ? 'комната' : 'комнат'}</p></div><button class="secondary" data-action="add-room">＋ Добавить</button></section><div class="card-list">${project.rooms.length ? project.rooms.map(room => roomCard(project, room)).join('') : empty('Здесь появятся комнаты', 'Добавьте первую комнату, затем стены и материалы.')}</div><details class="estimate"><summary><div><h2>Смета / Комплектация</h2><p>${estimate.groups.reduce((sum, group) => sum + group.rows.length, 0)} позиций</p></div><span>⌄</span></summary><div class="estimate-content">${estimateContent}<div class="estimate-total"><span>Итого по смете</span><strong>${money(estimate.total)}</strong></div></div></details><section class="total-panel"><p>Итог по объекту</p><div><span>Общая площадь</span><b>${square(totals.area)}</b></div><strong>${money(totals.total)}</strong></section>`, 'home');
}

function wallCard(project, room, wall) {
  const totals = wallTotals(wall, priceById);
  return `<article class="compact-card"><div class="card-top clickable" data-go="project/${project.id}/${room.id}/${wall.id}"><div><h2>${esc(wall.name)}</h2><p>${Number(wall.width).toLocaleString('ru-RU')} × ${Number(wall.height).toLocaleString('ru-RU')} мм · ${square(totals.area)}</p></div><b class="price">${money(totals.total)}</b></div><div class="card-actions"><button data-go="project/${project.id}/${room.id}/${wall.id}">Редактировать</button><button class="danger" data-action="delete-wall" data-id="${wall.id}">Удалить</button></div></article>`;
}

function renderRoom(project, room) {
  if (!room) return go(`project/${project?.id || ''}`);
  current = project; saveButton.classList.remove('hidden');
  const totals = roomTotals(room, priceById);
  app.innerHTML = page(project.name, room.name, `<div class="title-actions"><button class="text-button" data-action="rename-room">Переименовать</button><button class="text-button danger" data-action="delete-room">Удалить</button></div><section class="section-head"><div><h2>Стены</h2><p>${room.walls.length} шт. · ${square(totals.area)}</p></div><button class="secondary" data-action="add-wall">＋ Добавить стену</button></section><div class="card-list">${room.walls.length ? room.walls.map(wall => wallCard(project, room, wall)).join('') : empty('Стен пока нет', 'Добавьте стену и укажите её размеры.')}</div><details class="breakdown"><summary>Состав стоимости <span>⌄</span></summary><div><p><span>Материал</span><b>${money(totals.material)}</b></p><p><span>Профили</span><b>${money(totals.profiles)}</b></p><p><span>Дополнительные элементы</span><b>${money(totals.extras)}</b></p><p><span>Звукоизоляция</span><b>${money(totals.soundproof)}</b></p></div></details><section class="total-panel compact"><p>Итого по комнате</p><strong>${money(totals.total)}</strong></section>`, `project/${project.id}`);
}

const profileOptions = (selected) => `<option value="">Без профиля</option>${prices.filter(p => p.category === 'profile').map(p => `<option value="${p.id}" ${selected === p.id ? 'selected' : ''}>${esc(p.name)} · ${money(p.price)}/м</option>`).join('')}`;
const soundproofOptions = (selected) => `<option value="">Без звукоизоляции</option>${prices.filter(p => p.category === 'soundproof').map(p => `<option value="${p.id}" ${selected === p.id ? 'selected' : ''}>${esc(p.name)} · ${money(p.price)}/м²</option>`).join('')}`;
function counter(item, value) { return `<div class="counter-row"><div><b>${esc(item.name)}</b><small>${money(item.price)} / ${esc(item.unit)}</small></div><div class="counter"><button type="button" data-count="${item.id}" data-step="-1">−</button><input aria-label="${esc(item.name)}" name="${item.id}" type="text" inputmode="numeric" data-numeric data-min="0" value="${value || 0}"><button type="button" data-count="${item.id}" data-step="1">＋</button></div></div>`; }

function socketPositionFields(wall, item) {
  return `<div data-socket-positions="${item.id}">${(wall.socketPositions?.[item.id] || []).map((position, index) => `<fieldset class="socket-position"><legend>${esc(item.name)} · ${index + 1}</legend><div class="two-columns"><label>От левого края, мм<input aria-label="${esc(item.name)} ${index + 1}, от левого края" name="socket-position-${item.id}-${index}-left" type="text" inputmode="numeric" data-numeric data-min="0" value="${position.left}"></label><label>От пола, мм<input aria-label="${esc(item.name)} ${index + 1}, от пола" name="socket-position-${item.id}-${index}-floor" type="text" inputmode="numeric" data-numeric data-min="0" value="${position.floor}"></label></div></fieldset>`).join('')}</div>`;
}

function renderWall(project, room, wall) {
  if (!wall) return go(`project/${project?.id || ''}/${room?.id || ''}`);
  current = project; saveButton.classList.remove('hidden');
  const totals = wallTotals(wall, priceById);
  const extras = prices.filter(item => item.category === 'extra');
  const socketItems = extras.filter(item => item.id.startsWith('socket_'));
  syncSocketPositions(wall, socketItems.map(item => item.id));
  const consumables = extras.filter(item => !item.id.startsWith('socket_'));
  const activeConsumables = consumables.filter(item => Number(wall.extras?.[item.id]) > 0);
  const material = priceById[wall.material];
  const selectedSoundproof = wall.soundproof?.id || (wall.soundproof?.enabled ? 'soundproof_heavy_felt' : '');
  const sectionTitle = (number, title, hint) => `<div class="editor-title"><span>${number}</span><div><h2>${title}</h2>${hint ? `<p>${hint}</p>` : ''}</div></div>`;
  app.innerHTML = page(room.name, wall.name, `<form id="wallForm">
    <section class="editor-card">${sectionTitle('01', 'Размеры стены', 'Площадь рассчитывается автоматически')}<label>Название стены<input name="name" value="${esc(wall.name)}"></label><div class="two-columns"><label>Ширина, мм<input name="width" type="text" inputmode="numeric" data-numeric data-min="1" value="${wall.width}"></label><label>Высота, мм<input name="height" type="text" inputmode="numeric" data-numeric data-min="1" value="${wall.height}"></label></div></section>
    <section class="editor-card">${sectionTitle('02', 'Материал')}<input type="hidden" name="material" value="${esc(wall.material)}"><div class="material-summary"><div><b>${esc(material?.name || 'Материал не выбран')}</b><small data-wall-material-area>${square(totals.area)} · ${material ? `${money(material.price)} / м²` : 'нет цены'}</small></div><strong data-wall-material-total>${money(totals.material)}</strong></div></section>
    <section class="editor-card">${sectionTitle('03', 'Профили', 'Отдельно для каждой стороны')}<div class="profile-grid">${[['top','Верх'],['bottom','Низ'],['left','Слева'],['right','Справа']].map(([id,label]) => `<label>${label}<small data-profile-length="${id}">${id === 'top' || id === 'bottom' ? (wall.width/1000).toLocaleString('ru-RU') : (wall.height/1000).toLocaleString('ru-RU')} м</small><select name="profile-${id}">${profileOptions(wall.profiles?.[id])}</select></label>`).join('')}</div></section>
    <section class="editor-card">${sectionTitle('04', 'Подрозетники / закладные', 'Количество и положение каждого экземпляра')}<div class="compact-counters">${socketItems.map(item => `${counter(item, wall.extras?.[item.id])}${socketPositionFields(wall, item)}`).join('')}</div></section>
    <section class="editor-card">${sectionTitle('05', 'Чертёж', 'Схематичный вид стены спереди')}<div data-wall-drawing>${wallDrawing(wall, priceById)}</div></section>
    <section class="editor-card">${sectionTitle('06', 'Звукоизоляция')}<div class="sound-row"><label>Тип звукоизоляции<small data-sound-summary>${selectedSoundproof ? `${square(totals.soundArea)} · ${money(totals.soundproof)}` : 'Не выбрана'}</small><select name="soundproof">${soundproofOptions(selectedSoundproof)}</select></label><div class="sound-options ${selectedSoundproof ? '' : 'hidden'}"><label class="check"><input name="sound-custom" type="checkbox" ${wall.soundproof?.custom ? 'checked' : ''}> Указать площадь вручную</label><label class="sound-area ${wall.soundproof?.custom ? '' : 'hidden'}">Площадь, м²<input name="sound-area" type="text" inputmode="decimal" data-numeric data-min="0" value="${wall.soundproof?.area || totals.area.toFixed(2)}"></label></div></div></section>
    <details class="editor-card consumables" id="consumablesBlock"><summary><div>${sectionTitle('07', 'Дополнительные расходники', 'Клей, лента и крепёж')}</div><span class="details-arrow">⌄</span></summary>${activeConsumables.length ? `<div class="active-consumables" aria-label="Выбранные расходники">${activeConsumables.map(item => `<span>${esc(item.name)}: <b>${Number(wall.extras[item.id]).toLocaleString('ru-RU')}</b></span>`).join('')}</div>` : '<p class="no-consumables">Ничего не добавлено</p>'}<div class="consumable-rows">${consumables.map(item => counter(item, wall.extras?.[item.id])).join('')}</div></details>
    <section class="wall-total"><div><small>Итог стоимости стены</small><b data-wall-total>${money(totals.total)}</b><span data-wall-area>${square(totals.area)}</span></div><button type="button" class="primary" data-action="done-wall">Готово</button></section>
  </form>`, `project/${project.id}/${room.id}`);
}

function empty(title, text) { return `<div class="empty"><span>＋</span><h2>${title}</h2><p>${text}</p></div>`; }
function renderSaved() {
  current = null; saveButton.classList.add('hidden');
  app.innerHTML = page('Ваши проекты', 'Сохранённые расчёты', `<div class="saved-head"><p>${projects.length ? 'Все изменения сохранены на этом устройстве.' : 'Сохранённых расчётов пока нет.'}</p><button class="primary" data-action="new">＋ Новый</button></div><div class="card-list">${projects.map(project => { const totals = projectTotals(project, priceById); return `<article class="saved-card"><div class="clickable" data-go="project/${project.id}"><p>${new Date(project.updatedAt).toLocaleDateString('ru-RU')}</p><h2>${esc(project.name)}</h2><span>${project.rooms.length} комн. · ${square(totals.area)}</span><strong>${money(totals.total)}</strong></div><div class="card-actions"><button data-action="copy-project" data-id="${project.id}">Создать копию</button><button class="danger" data-action="delete-project" data-id="${project.id}">Удалить</button></div></article>`; }).join('')}</div>`, 'home');
}
function renderPrice() {
  current = null; saveButton.classList.add('hidden');
  const names = { material: 'Материал', profile: 'Профили', extra: 'Дополнительные элементы', soundproof: 'Звукоизоляция' };
  app.innerHTML = page('Материалы и работы', 'Прайс', `<p class="intro">Цены используются во всех расчётах автоматически.</p>${Object.entries(names).map(([category,name]) => `<section class="price-section"><h2>${name}</h2>${prices.filter(p => p.category === category).map(p => `<div class="price-row"><span>${esc(p.name)}<small>за ${p.unit}</small></span><b>${money(p.price)}</b></div>`).join('')}</section>`).join('')}`, 'home');
}

function render() {
  const [screen, projectId, roomId, wallId] = route();
  if (!screen || screen === 'home') return renderHome();
  if (screen === 'new') return renderNew();
  if (screen === 'saved') return renderSaved();
  if (screen === 'price') return renderPrice();
  if (screen === 'project') {
    const project = findProject(projectId), room = project?.rooms.find(r => r.id === roomId), wall = room?.walls.find(w => w.id === wallId);
    if (wallId) return renderWall(project, room, wall);
    if (roomId) return renderRoom(project, room);
    return renderProject(project);
  }
  renderHome();
}

app.addEventListener('submit', event => {
  event.preventDefault();
  if (event.target.id === 'newForm') { current = makeProject(Object.fromEntries(new FormData(event.target))); persist(); go(`project/${current.id}`); }
});
app.addEventListener('click', event => {
  const target = event.target.closest('[data-go],[data-action],[data-count]'); if (!target) return;
  if (target.dataset.go) return go(target.dataset.go);
  const action = target.dataset.action; const { project, room, wall } = getContext();
  if (action === 'new') return go('new');
  if (action === 'add-room') { project.rooms.push(makeRoom(project.rooms.length + 1)); persist('Комната добавлена'); return render(); }
  if (action === 'add-wall') { const added = makeWall(room.walls.length + 1); room.walls.push(added); persist(); return go(`project/${project.id}/${room.id}/${added.id}`); }
  if (action === 'rename-room') { const name = prompt('Название комнаты', room.name); if (name?.trim()) { room.name = name.trim(); persist(); render(); } return; }
  if (action === 'delete-room' && confirm(`Удалить «${room.name}» со всеми стенами?`)) { project.rooms = project.rooms.filter(r => r.id !== room.id); persist('Комната удалена'); return go(`project/${project.id}`); }
  if (action === 'delete-wall') { const item = room.walls.find(w => w.id === target.dataset.id); if (confirm(`Удалить «${item.name}»?`)) { room.walls = room.walls.filter(w => w.id !== item.id); persist('Стена удалена'); render(); } return; }
  if (action === 'edit-project') { const name = prompt('Название объекта', project.name); if (name?.trim()) { project.name = name.trim(); persist(); render(); } return; }
  if (action === 'done-wall') { syncWallForm(wall, true); persist('Стена сохранена'); return go(`project/${project.id}/${room.id}`); }
  if (action === 'copy-project') { const original = findProject(target.dataset.id); const copy = structuredClone(original); copy.id = uid(); copy.name += ' — копия'; copy.updatedAt = new Date().toISOString(); projects.unshift(copy); saveProjects(projects); showToast('Копия создана'); return render(); }
  if (action === 'delete-project') { const item = findProject(target.dataset.id); if (confirm(`Удалить расчёт «${item.name}»?`)) { projects = projects.filter(p => p.id !== item.id); saveProjects(projects); render(); } return; }
  if (target.dataset.count) {
    const input = app.querySelector(`[name="${target.dataset.count}"]`);
    input.value = Math.max(0, parseNumericInput(input.value) + Number(target.dataset.step));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateWallStructure(input);
  }
});

function syncWallForm(wall, finalize = false) {
  const form = document.querySelector('#wallForm'); if (!form) return;
  if (finalize) for (const input of form.querySelectorAll('input[data-numeric]')) normalizeNumericInput(input);
  const data = new FormData(form);
  wall.name = String(data.get('name')).trim() || 'Стена'; wall.width = Math.max(0, parseNumericInput(data.get('width'))); wall.height = Math.max(0, parseNumericInput(data.get('height')));
  wall.material = data.get('material') || '';
  wall.profiles ||= {};
  for (const side of ['top','bottom','left','right']) wall.profiles[side] = data.get(`profile-${side}`) || '';
  wall.extras ||= {};
  for (const item of prices.filter(item => item.category === 'extra')) wall.extras[item.id] = Math.max(0, parseNumericInput(data.get(item.id)));
  const socketIds = prices.filter(item => item.category === 'extra' && item.id.startsWith('socket_')).map(item => item.id);
  syncSocketPositions(wall, socketIds);
  for (const id of socketIds) for (const [index, position] of (wall.socketPositions[id] || []).entries()) {
    const leftName = `socket-position-${id}-${index}-left`;
    const floorName = `socket-position-${id}-${index}-floor`;
    if (data.has(leftName)) position.left = Math.max(0, parseNumericInput(data.get(leftName)));
    if (data.has(floorName)) position.floor = Math.max(0, parseNumericInput(data.get(floorName)));
  }
  wall.soundproof = { id: data.get('soundproof') || '', custom: data.has('sound-custom'), area: Math.max(0, parseNumericInput(data.get('sound-area'))) };
}
function syncWallInput(event) {
  if (!event.target.closest('#wallForm')) return;
  const { wall } = getContext();
  syncWallForm(wall);
  persist();
  updateWallDependents(wall);
}

function commitWallInput(event) {
  if (!event.target.closest('#wallForm')) return;
  const { wall } = getContext();
  normalizeNumericInput(event.target);
  syncWallForm(wall);
  persist();
  updateWallDependents(wall);
  updateWallStructure(event.target);
}

function updateWallDependents(wall) {
  const totals = wallTotals(wall, priceById);
  const material = priceById[wall.material];
  const selectedSoundproof = wall.soundproof?.id || '';
  const setText = (selector, value) => { const element = app.querySelector(selector); if (element) element.textContent = value; };
  setText('[data-wall-material-area]', `${square(totals.area)} · ${material ? `${money(material.price)} / м²` : 'нет цены'}`);
  setText('[data-wall-material-total]', money(totals.material));
  for (const side of ['top', 'bottom']) setText(`[data-profile-length="${side}"]`, `${(wall.width / 1000).toLocaleString('ru-RU')} м`);
  for (const side of ['left', 'right']) setText(`[data-profile-length="${side}"]`, `${(wall.height / 1000).toLocaleString('ru-RU')} м`);
  setText('[data-sound-summary]', selectedSoundproof ? `${square(totals.soundArea)} · ${money(totals.soundproof)}` : 'Не выбрана');
  setText('[data-wall-total]', money(totals.total));
  setText('[data-wall-area]', square(totals.area));
  const drawing = app.querySelector('[data-wall-drawing]');
  if (drawing) drawing.innerHTML = wallDrawing(wall, priceById);

  const soundOptions = app.querySelector('.sound-options');
  soundOptions?.classList.toggle('hidden', !selectedSoundproof);
  app.querySelector('.sound-area')?.classList.toggle('hidden', !wall.soundproof?.custom);
}

function updateWallStructure(target) {
  if (!target.name?.startsWith('socket_')) return;
  const { wall } = getContext();
  const item = prices.find(candidate => candidate.id === target.name);
  const positions = app.querySelector(`[data-socket-positions="${target.name}"]`);
  if (item && positions) positions.innerHTML = socketPositionFields(wall, item).replace(/^<div[^>]*>|<\/div>$/g, '');
}

app.addEventListener('input', syncWallInput);
app.addEventListener('change', commitWallInput);
document.body.addEventListener('click', event => { const nav = event.target.closest('[data-go]'); if (nav && !nav.closest('#app')) go(nav.dataset.go); });
saveButton.addEventListener('click', () => persist('Расчёт сохранён'));
window.addEventListener('hashchange', render);

try { prices = await fetch(new URL('../data/prices.json', import.meta.url)).then(response => { if (!response.ok) throw new Error(); return response.json(); }); priceById = Object.fromEntries(prices.map(item => [item.id, item])); migrateLegacyWalls(); render(); }
catch { app.innerHTML = `<div class="fatal"><h1>Не удалось загрузить прайс</h1><p>Обновите страницу или запустите приложение через локальный сервер.</p></div>`; }
