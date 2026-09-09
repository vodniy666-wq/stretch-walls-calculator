import './style.css';
import { money, area, wallTotals, roomTotals } from './calculations.js';
import { load, saveAll, blankProject, blankRoom, blankWall, uid } from './store.js';
import { drawing } from './drawing.js';

const app = document.querySelector('#app');
let prices = await fetch('/prices.json').then(r => r.json());
let projects = load();
let draft = null;
const route = () => location.hash.slice(1).split('/').filter(Boolean);
const icon = (name) => ({ back:'←', dots:'•••', plus:'＋', home:'⌂', folder:'▱', price:'₽', edit:'✎', trash:'⌫', copy:'⧉', save:'✓', chevron:'›' }[name]);
const field = (label, name, value='', type='text', suffix='') => `<label class="field"><span>${label}</span><div class="input-wrap"><input name="${name}" type="${type}" value="${value}" ${type==='number'?'min="0" inputmode="numeric"':''}>${suffix?`<b>${suffix}</b>`:''}</div></label>`;

function persist() {
  if (!draft) return;
  draft.updatedAt = new Date().toISOString();
  const index = projects.findIndex(p => p.id === draft.id);
  index < 0 ? projects.unshift(draft) : projects[index] = draft;
  saveAll(projects);
}
function navigate(path) { location.hash = path; }
function header(title, back='', action='') {
  return `<header class="topbar">${back?`<button class="icon-button" data-go="${back}" aria-label="Назад">${icon('back')}</button>`:'<span class="brand-mark">S</span>'}<strong>${title}</strong>${action||'<span class="header-space"></span>'}</header>`;
}
function nav(active) {
  return `<nav class="bottom-nav"><button data-go="home" class="${active==='home'?'active':''}"><b>${icon('home')}</b>Главная</button><button data-go="saved" class="${active==='saved'?'active':''}"><b>${icon('folder')}</b>Расчёты</button><button data-go="prices" class="${active==='prices'?'active':''}"><b>${icon('price')}</b>Прайс</button></nav>`;
}
const shell = (content, active='') => `<main>${content}</main>${active?nav(active):''}`;

function home() {
  const recent = projects.slice(0,2);
  app.innerHTML = shell(`${header('СТЕНЫ')}<div class="page hero-page"><section class="hero"><span class="eyebrow">КАЛЬКУЛЯТОР СТОИМОСТИ</span><h1>Натяжные стены.<br><em>Просто посчитать.</em></h1><p>Обмерьте стены, выберите материалы — стоимость рассчитается сама.</p><button class="primary jumbo" id="new-project">${icon('plus')} Новый расчёт</button></section>
  ${recent.length?`<section><div class="section-title"><h2>Последние расчёты</h2><button class="link" data-go="saved">Все расчёты ${icon('chevron')}</button></div>${recent.map(projectCard).join('')}</section>`:''}
  <div class="how"><span>01</span><p><b>Создайте объект</b><br>Укажите данные клиента</p><span>02</span><p><b>Добавьте комнаты</b><br>И стены с размерами</p><span>03</span><p><b>Получите смету</b><br>Стоимость обновится сама</p></div></div>`, 'home');
  document.querySelector('#new-project').onclick = () => { draft = blankProject(); navigate('new'); };
}
function projectCard(p) {
  const total = p.rooms.reduce((s,r)=>s+roomTotals(r,prices).total,0);
  return `<article class="project-card" data-open="${p.id}"><div><span class="eyebrow">${p.rooms.length} ${plural(p.rooms.length,'КОМНАТА','КОМНАТЫ','КОМНАТ')}</span><h3>${p.name || 'Без названия'}</h3><p>${new Date(p.updatedAt).toLocaleDateString('ru-RU')} · ${p.client || 'Клиент не указан'}</p></div><strong>${money(total)}</strong><i>${icon('chevron')}</i></article>`;
}
function plural(n,a,b,c){const m=n%100; return m>10&&m<20?c:n%10===1?a:n%10>1&&n%10<5?b:c}

function newProject() {
  if (!draft) draft = blankProject();
  app.innerHTML = shell(`${header('Новый расчёт','home')}<div class="page narrow"><div class="steps"><b class="active">1</b><i></i><b>2</b><i></i><b>3</b></div><div class="intro"><span class="eyebrow">ШАГ 1 ИЗ 3</span><h1>Новый объект</h1><p>Название поможет быстро найти расчёт позже.</p></div><form id="project-form" class="card form-card">${field('Название объекта *','name',draft.name)}<div class="separator"><span>КЛИЕНТ · НЕОБЯЗАТЕЛЬНО</span></div>${field('Имя клиента','client',draft.client)}${field('Телефон','phone',draft.phone,'tel')}${field('Комментарий','comment',draft.comment)}<button class="primary wide">Продолжить ${icon('chevron')}</button></form></div>`);
  document.querySelector('#project-form').onsubmit=e=>{e.preventDefault();Object.assign(draft,Object.fromEntries(new FormData(e.currentTarget)));if(!draft.name.trim()){e.currentTarget.name.focus();return}persist();navigate(`project/${draft.id}`)};
}
function projectView(id) {
  draft = projects.find(p=>p.id===id); if(!draft){navigate('home');return}
  const total = draft.rooms.reduce((s,r)=>s+roomTotals(r,prices).total,0), totalArea=draft.rooms.reduce((s,r)=>s+roomTotals(r,prices).area,0);
  app.innerHTML=shell(`${header('Объект','home',`<button class="save-pill" id="save">${icon('save')} Сохранено</button>`)}<div class="page"><section class="object-head"><span class="eyebrow">ОБЪЕКТ</span><h1>${draft.name}</h1><p>${draft.client||'Клиент не указан'}${draft.phone?` · ${draft.phone}`:''}</p></section><div class="section-title"><div><h2>Комнаты</h2><span class="muted">${draft.rooms.length} ${plural(draft.rooms.length,'комната','комнаты','комнат')}</span></div><button class="secondary" id="add-room">${icon('plus')} Добавить</button></div><section class="room-grid">${draft.rooms.length?draft.rooms.map(roomCard).join(''):`<div class="empty"><b>⌂</b><h3>Пока нет комнат</h3><p>Добавьте первую комнату, чтобы начать расчёт.</p></div>`}</section><section class="total-panel"><span>ИТОГО ПО ОБЪЕКТУ</span><strong>${money(total)}</strong><div><p>Общая площадь <b>${totalArea.toFixed(2)} м²</b></p><p>Комнат <b>${draft.rooms.length}</b></p></div></section></div>`);
  document.querySelector('#add-room').onclick=()=>{draft.rooms.push(blankRoom(draft.rooms.length+1));persist();render()};
}
function roomCard(r) { const t=roomTotals(r,prices); return `<article class="room-card" data-room="${r.id}"><div class="room-icon">⌂</div><div class="room-main"><span class="eyebrow">${r.walls.length} ${plural(r.walls.length,'СТЕНА','СТЕНЫ','СТЕН')}</span><h3>${r.name}</h3><p>${t.area.toFixed(2)} м² общая площадь</p></div><strong>${money(t.total)}</strong><i>${icon('chevron')}</i></article>` }

function roomView(projectId, roomId) {
  draft=projects.find(p=>p.id===projectId); const room=draft?.rooms.find(r=>r.id===roomId); if(!room){navigate(`project/${projectId}`);return} const t=roomTotals(room,prices);
  app.innerHTML=shell(`${header(room.name,`project/${projectId}`,`<button class="icon-button danger" id="delete-room">${icon('trash')}</button>`)}<div class="page"><section class="room-heading"><div><span class="eyebrow">КОМНАТА</span><h1 contenteditable="true" id="room-name">${room.name}</h1><p>${room.walls.length} ${plural(room.walls.length,'стена','стены','стен')} · ${t.area.toFixed(2)} м²</p></div><button class="edit-name">${icon('edit')}</button></section><div class="section-title"><h2>Стены</h2><button class="secondary" id="add-wall">${icon('plus')} Добавить стену</button></div><section class="wall-list">${room.walls.length?room.walls.map(wallCard).join(''):`<div class="empty"><b>▭</b><h3>Добавьте первую стену</h3><p>Введите размеры и выберите профили.</p></div>`}</section><section class="breakdown card"><h2>Итого по комнате</h2><div><span>Площадь стен</span><b>${t.area.toFixed(2)} м²</b></div><div><span>Профили</span><b>${money(t.profiles)}</b></div><div><span>Дополнительные элементы</span><b>${money(t.extras)}</b></div><div><span>Звукоизоляция</span><b>${money(t.soundproof)}</b></div><footer><span>ИТОГО</span><strong>${money(t.total)}</strong></footer></section></div>`);
  document.querySelector('#add-wall').onclick=()=>{const w=blankWall(room.walls.length+1);room.walls.push(w);persist();navigate(`wall/${projectId}/${roomId}/${w.id}`)};
  document.querySelector('#room-name').onblur=e=>{room.name=e.target.textContent.trim()||room.name;persist()};
  document.querySelector('#delete-room').onclick=()=>{if(confirm(`Удалить «${room.name}»?`)){draft.rooms=draft.rooms.filter(r=>r.id!==room.id);persist();navigate(`project/${projectId}`)}};
}
function wallCard(w){const t=wallTotals(w,prices);return `<article class="wall-card" data-wall="${w.id}"><div class="wall-thumb"><i></i></div><div><span class="eyebrow">${w.name}</span><h3>${(w.width/1000).toFixed(2)} × ${(w.height/1000).toFixed(2)} м</h3><p>${t.area.toFixed(2)} м²</p></div><strong>${money(t.total)}</strong><button>${icon('edit')}<span> Редактировать</span></button></article>`}

function wallView(pid,rid,wid){draft=projects.find(p=>p.id===pid);const room=draft?.rooms.find(r=>r.id===rid),wall=room?.walls.find(w=>w.id===wid);if(!wall){navigate(`room/${pid}/${rid}`);return}const t=wallTotals(wall,prices);const opts=`<option value="">Без профиля</option>${prices.filter(p=>p.category==='profile').map(p=>`<option value="${p.id}">${p.name} · ${p.price} ₽/м</option>`).join('')}`;
  app.innerHTML=shell(`${header(wall.name,`room/${pid}/${rid}`,`<button class="icon-button danger" id="delete-wall">${icon('trash')}</button>`)}<div class="page wall-page"><section class="wall-summary"><div><span class="eyebrow">${room.name.toUpperCase()} · СТЕНА</span><h1>${wall.name}</h1><p>${(wall.width/1000).toFixed(2)} × ${(wall.height/1000).toFixed(2)} м · ${t.area.toFixed(2)} м²</p></div><strong>${money(t.total)}</strong></section><form id="wall-form"><section class="card wall-section"><div class="section-title"><div><span class="number">01</span><h2>Размеры стены</h2></div></div>${field('Название','name',wall.name)}<div class="two-cols">${field('Ширина','width',wall.width,'number','мм')}${field('Высота','height',wall.height,'number','мм')}</div><div class="area-result"><span>Площадь стены</span><b>${t.area.toFixed(2)} м²</b></div></section>${drawing(wall)}<section class="card wall-section"><div class="section-title"><div><span class="number">02</span><h2>Профили</h2></div><span class="section-price">${money(t.profiles)}</span></div><p class="hint">Профиль выбирается отдельно для каждой стороны</p>${[['top','Верх',wall.width],['bottom','Низ',wall.width],['left','Слева',wall.height],['right','Справа',wall.height]].map(([key,label,len])=>`<label class="select-field"><span><b>${label}</b><small>${(len/1000).toFixed(2)} м</small></span><select name="profile_${key}">${opts}</select></label>`).join('')}</section><section class="card wall-section"><div class="section-title"><div><span class="number">03</span><h2>Дополнительно</h2></div><span class="section-price">${money(t.extras+t.soundproof)}</span></div>${counter('Подрозетники / выключатели','450 ₽ / шт','sockets',wall.sockets)}${counter('Внутренний угол','650 ₽ / шт','innerCorners',wall.innerCorners)}${counter('Внешний угол','850 ₽ / шт','outerCorners',wall.outerCorners)}<label class="toggle-row"><div><b>Звукоизоляция</b><small>780 ₽ / м²</small></div><input name="soundproof" type="checkbox" ${wall.soundproof?'checked':''}><i></i></label><div class="sound-area ${wall.soundproof?'':'hidden'}">${field('Площадь звукоизоляции','soundproofArea',wall.soundproofArea,'number','м²')}</div></section></form><div class="sticky-total"><div><span>Стоимость стены</span><strong>${money(t.total)}</strong></div><button class="primary" id="done">Готово</button></div></div>`);
  ['top','bottom','left','right'].forEach(k=>document.querySelector(`[name=profile_${k}]`).value=wall.profiles[k]);
  const form=document.querySelector('#wall-form');form.onchange=()=>{syncWall(form,wall);persist();wallView(pid,rid,wid)};
  document.querySelector('#done').onclick=()=>navigate(`room/${pid}/${rid}`);
  document.querySelector('#delete-wall').onclick=()=>{if(confirm(`Удалить «${wall.name}»?`)){room.walls=room.walls.filter(w=>w.id!==wid);persist();navigate(`room/${pid}/${rid}`)}};
}
function counter(title,sub,name,value){return `<div class="counter"><div><b>${title}</b><small>${sub}</small></div><button type="button" data-count="${name}" data-delta="-1">−</button><input name="${name}" value="${value}" type="number" min="0"><button type="button" data-count="${name}" data-delta="1">＋</button></div>`}
function syncWall(form,w){
  const d=new FormData(form);
  const previousArea=area(w);
  w.name=d.get('name');w.width=Number(d.get('width'));w.height=Number(d.get('height'));
  ['top','bottom','left','right'].forEach(k=>w.profiles[k]=d.get(`profile_${k}`));
  ['sockets','innerCorners','outerCorners'].forEach(k=>w[k]=Number(d.get(k)));
  const enteredSoundproofArea=Number(d.get('soundproofArea'));
  if(Math.abs(enteredSoundproofArea-previousArea)>.001)w.soundproofAreaManual=true;
  w.soundproofArea=w.soundproofAreaManual?enteredSoundproofArea:area(w);
  w.soundproof=d.has('soundproof');
}

function saved(){app.innerHTML=shell(`${header('Сохранённые расчёты')}<div class="page"><section class="object-head"><span class="eyebrow">АРХИВ ОБЪЕКТОВ</span><h1>Расчёты</h1><p>${projects.length} сохранено локально на этом устройстве</p></section><button class="primary" id="new-project">${icon('plus')} Новый расчёт</button><section class="saved-list">${projects.length?projects.map(p=>`${projectCard(p)}<div class="card-actions"><button data-copy="${p.id}">${icon('copy')} Создать копию</button><button class="danger" data-delete="${p.id}">${icon('trash')} Удалить</button></div>`).join(''):'<div class="empty"><h3>Здесь пока пусто</h3><p>Создайте первый расчёт.</p></div>'}</section></div>`,'saved');document.querySelector('#new-project').onclick=()=>{draft=blankProject();navigate('new')}}
function priceView(){const groups=[['profile','Профили'],['service','Полотно и монтаж'],['extra','Дополнительные элементы'],['soundproof','Звукоизоляция']];app.innerHTML=shell(`${header('Прайс')}<div class="page"><section class="object-head"><span class="eyebrow">АКТУАЛЬНЫЕ ЦЕНЫ</span><h1>Прайс</h1><p>Цены автоматически используются во всех расчётах.</p></section>${groups.map(([key,title])=>`<section class="price-group card"><h2>${title}</h2>${prices.filter(p=>p.category===key).map(p=>`<div><span>${p.name}<small>за ${p.unit}</small></span><b>${money(p.price)}</b></div>`).join('')}</section>`).join('')}</div>`,'prices')}

function bind(){document.querySelectorAll('[data-go]').forEach(el=>el.onclick=()=>navigate(el.dataset.go));document.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>navigate(`project/${el.dataset.open}`));document.querySelectorAll('[data-room]').forEach(el=>el.onclick=()=>navigate(`room/${draft.id}/${el.dataset.room}`));document.querySelectorAll('[data-wall]').forEach(el=>el.onclick=()=>{const [,pid,rid]=route();navigate(`wall/${pid}/${rid}/${el.dataset.wall}`)});document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{const input=document.querySelector(`[name=${b.dataset.count}]`);input.value=Math.max(0,+input.value + +b.dataset.delta);input.dispatchEvent(new Event('change',{bubbles:true}))});document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{const p=structuredClone(projects.find(x=>x.id===b.dataset.copy));p.id=uid('project');p.name+= ' — копия';p.updatedAt=new Date().toISOString();projects.unshift(p);saveAll(projects);render()});document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(confirm('Удалить расчёт?')){projects=projects.filter(p=>p.id!==b.dataset.delete);saveAll(projects);render()}})}
function render(){const [view,...args]=route();({home, new:newProject, project:projectView, room:roomView, wall:wallView, saved, prices:priceView}[view||'home']||home)(...args);bind();scrollTo(0,0)}
addEventListener('hashchange',render);render();
