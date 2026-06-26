// Daily Draw — frontend. Vanilla JS, no build step. All user-supplied text is
// rendered via textContent (never innerHTML) so the deck can't inject markup.

const $ = (id) => document.getElementById(id);

const state = {
  boardId: null,
  date: localDate(),
  categories: [],
  questions: [],
  daily: null,
};

function localDate() {
  // The user's own calendar day, so "today" is right in every timezone.
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

// ---- toast ------------------------------------------------------------

let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('is-show');
    setTimeout(() => { el.hidden = true; }, 220);
  }, 2600);
}

// ---- card -------------------------------------------------------------

function renderDateline() {
  const d = new Date(state.date + 'T00:00:00');
  $('dateline').textContent = d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// The deck wears nine faces — seven solid colors plus two playing-card styles.
const FACES = ['cream', 'pine', 'indigo', 'coral', 'butter', 'blush', 'sky', 'spade', 'heart'];
const SUITS = { spade: '♠', heart: '♥' };
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Stable 32-bit hash so a given question always wears the same face + rank.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function applyFace(card, q) {
  const corner = $('cardCorner');
  const wm = $('cardWatermark');
  if (!q) { card.dataset.face = 'cream'; corner.replaceChildren(); wm.textContent = ''; return; }

  const h = hashStr(q.id);
  const face = FACES[h % FACES.length];
  card.dataset.face = face;

  const suit = SUITS[face];
  if (suit) {
    const rank = RANKS[(h >>> 8) % RANKS.length];
    const s = document.createElement('span');
    s.className = 'card__suit';
    s.textContent = suit;
    corner.replaceChildren(document.createTextNode(rank), s);
    wm.textContent = suit;
  } else {
    corner.replaceChildren();
    wm.textContent = '';
  }
}

function renderCard(animate) {
  const card = $('card');
  const q = state.daily;

  if (!q) {
    $('question').textContent = 'Your deck is empty — add a card to get started.';
    $('cardIndex').textContent = '0 / 0';
    $('cardCat').hidden = true;
    applyFace(card, null);
    return;
  }

  $('question').textContent = q.text;

  const pos = state.questions.findIndex((x) => x.id === q.id);
  const total = state.questions.length;
  $('cardIndex').textContent = `Card ${pos >= 0 ? pos + 1 : '—'} / ${total}`;

  const cat = $('cardCat');
  if (q.category) { cat.textContent = q.category; cat.hidden = false; }
  else { cat.hidden = true; }

  applyFace(card, q);

  if (animate) {
    card.classList.remove('is-drawing');
    void card.offsetWidth; // restart the animation
    card.classList.add('is-drawing');
  }
}

async function draw() {
  const btn = $('drawBtn');
  btn.disabled = true;
  try {
    const data = await api('/api/redraw', {
      method: 'POST',
      body: JSON.stringify({ date: state.date }),
    });
    state.daily = data.daily;
    renderCard(true);
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
  }
}

// ---- manage drawer ----------------------------------------------------

function fillCategorySelects() {
  const opts = (includeAll) => {
    const parts = [];
    if (includeAll) parts.push('<option value="">All categories</option>');
    else parts.push('<option value="">No category</option>');
    return parts;
  };
  const add = $('addCat');
  const filter = $('filterCat');
  add.innerHTML = '';
  filter.innerHTML = '';
  add.appendChild(new Option('No category', ''));
  filter.appendChild(new Option('All categories', ''));
  for (const c of state.categories) {
    add.appendChild(new Option(c, c));
    filter.appendChild(new Option(c, c));
  }
}

function visibleQuestions() {
  const term = $('search').value.trim().toLowerCase();
  const cat = $('filterCat').value;
  return state.questions.filter((q) => {
    if (cat && q.category !== cat) return false;
    if (term && !q.text.toLowerCase().includes(term)) return false;
    return true;
  });
}

function renderList() {
  const list = $('list');
  const tpl = $('rowTemplate');
  list.innerHTML = '';

  const items = visibleQuestions();
  $('manageCount').textContent =
    `${state.questions.length} card${state.questions.length === 1 ? '' : 's'} in the deck`;

  const empty = $('emptyState');
  if (items.length === 0) {
    empty.hidden = false;
    empty.textContent = state.questions.length === 0
      ? 'No cards yet. Add your first question above.'
      : 'No cards match your search.';
    return;
  }
  empty.hidden = true;

  for (const q of items) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = q.id;
    const catEl = node.querySelector('.row__cat');
    catEl.textContent = q.category || '';
    if (!q.category) catEl.setAttribute('data-empty', '');
    node.querySelector('.row__text').textContent = q.text;
    node.querySelector('.row__uses').textContent =
      q.uses > 0 ? `Used ${q.uses}×` : 'Never used';
    list.appendChild(node);
  }
}

function openManage() {
  $('manage').hidden = false;
  $('manageBtn').setAttribute('aria-expanded', 'true');
  renderList();
  $('addText').focus();
}
function closeManage() {
  $('manage').hidden = true;
  $('manageBtn').setAttribute('aria-expanded', 'false');
}

async function addCard(e) {
  e.preventDefault();
  const text = $('addText').value.trim();
  if (!text) return;
  try {
    const data = await api('/api/questions', {
      method: 'POST',
      body: JSON.stringify({ text, category: $('addCat').value }),
    });
    state.questions = data.questions;
    $('addText').value = '';
    renderList();
    renderCard(false); // deck size changed → refresh "Card N / M"
    toast('Card added to the deck.');
  } catch (err) {
    toast(err.message);
  }
}

function startEdit(row) {
  const id = row.dataset.id;
  const q = state.questions.find((x) => x.id === id);
  if (!q) return;

  const editor = document.createElement('div');
  editor.className = 'row__editor';

  const ta = document.createElement('textarea');
  ta.rows = 2;
  ta.maxLength = 280;
  ta.value = q.text;

  const controls = document.createElement('div');
  controls.className = 'row__editrow';

  const sel = document.createElement('select');
  sel.className = 'select';
  sel.appendChild(new Option('No category', ''));
  for (const c of state.categories) {
    const o = new Option(c, c);
    if (c === q.category) o.selected = true;
    sel.appendChild(o);
  }

  const save = document.createElement('button');
  save.className = 'btn btn--primary';
  save.type = 'button';
  save.textContent = 'Save';

  const cancel = document.createElement('button');
  cancel.className = 'btn btn--link';
  cancel.type = 'button';
  cancel.textContent = 'Cancel';

  controls.append(sel, save, cancel);
  editor.append(ta, controls);
  row.innerHTML = '';
  row.appendChild(editor);
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);

  cancel.addEventListener('click', renderList);
  save.addEventListener('click', async () => {
    const text = ta.value.trim();
    if (!text) { toast('A question needs some text.'); return; }
    try {
      const data = await api(`/api/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ text, category: sel.value }),
      });
      state.questions = data.questions;
      if (state.daily && state.daily.id === id) {
        state.daily = { id, text: data.question.text, category: data.question.category };
        renderCard(false);
      }
      renderList();
      toast('Card updated.');
    } catch (err) {
      toast(err.message);
    }
  });
}

async function deleteCard(row) {
  const id = row.dataset.id;
  const q = state.questions.find((x) => x.id === id);
  if (!q) return;
  try {
    const data = await api(`/api/questions/${id}`, { method: 'DELETE' });
    state.questions = data.questions;
    if (state.daily && state.daily.id === id) {
      // Today's card was deleted — pull a fresh one.
      const boot = await api(`/api/board?date=${state.date}`);
      state.daily = boot.daily;
      renderCard(true);
    } else {
      renderCard(false);
    }
    renderList();
    toast('Card deleted.');
  } catch (err) {
    toast(err.message);
  }
}

// ---- team name --------------------------------------------------------

function renderTeam() {
  const label = $('teamLabel');
  label.textContent = state.teamName ? state.teamName : 'Name your team';
}

async function editTeam() {
  const name = prompt('Team name (shown nowhere but here — just to make it yours):', state.teamName || '');
  if (name === null) return;
  try {
    const data = await api('/api/board/team', {
      method: 'POST',
      body: JSON.stringify({ teamName: name }),
    });
    state.teamName = data.teamName;
    renderTeam();
  } catch (err) {
    toast(err.message);
  }
}

// ---- board link -------------------------------------------------------

async function copyLink() {
  const url = `${location.origin}/?b=${encodeURIComponent(state.boardId)}`;
  try {
    await navigator.clipboard.writeText(url);
    toast('Board link copied — open it anywhere to restore this deck.');
  } catch {
    prompt('Copy your board link:', url);
  }
}

// ---- boot -------------------------------------------------------------

async function boot() {
  try {
    const data = await api(`/api/board?date=${state.date}`);
    state.boardId = data.board.id;
    state.teamName = data.board.teamName;
    state.categories = data.categories;
    state.questions = data.questions;
    state.daily = data.daily;
  } catch (err) {
    $('question').textContent = "Couldn't load your deck. Refresh to try again.";
    toast(err.message);
    return;
  }

  renderDateline();
  renderTeam();
  fillCategorySelects();
  renderCard(false);

  $('drawBtn').addEventListener('click', draw);
  $('manageBtn').addEventListener('click', openManage);
  $('manageClose').addEventListener('click', closeManage);
  $('manage').addEventListener('click', (e) => { if (e.target === $('manage')) closeManage(); });
  $('addForm').addEventListener('submit', addCard);
  $('search').addEventListener('input', renderList);
  $('filterCat').addEventListener('change', renderList);
  $('teamBtn').addEventListener('click', editTeam);
  $('linkBtn').addEventListener('click', copyLink);

  $('list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const row = btn.closest('.row');
    if (btn.dataset.act === 'edit') startEdit(row);
    else if (btn.dataset.act === 'delete') deleteCard(row);
  });

  if (location.hash === '#manage') openManage(); // deep-link to the manage view

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('manage').hidden) closeManage();
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (!typing && (e.key === 'd' || e.key === 'D') && $('manage').hidden) {
      e.preventDefault();
      draw();
    }
  });
}

boot();
