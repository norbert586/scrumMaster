// Board persistence + question-of-the-day logic.
//
// Storage model: one JSON file per board under DATA_DIR/boards/<id>.json.
// Writes are atomic (write temp file, then rename) and serialized per board so
// concurrent requests can't corrupt a file. This is intentionally simple — a
// standup deck is tiny and low-traffic. The module exposes a small surface so
// the backing store could later be swapped for SQLite/Postgres without touching
// the routes.

import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SEED_QUESTIONS, SEED_VERSION, CATEGORIES, RETIRED_QUESTIONS } from './seed.js';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const BOARDS_DIR = path.join(DATA_DIR, 'boards');

const MAX_TEXT = 280;
const MAX_TEAM = 60;

// Per-board write queue so saves to the same board never overlap.
const writeChains = new Map();

export async function init() {
  await fs.mkdir(BOARDS_DIR, { recursive: true });
}

// ---- ids ---------------------------------------------------------------

export function newBoardId() {
  // url-safe, ~24 chars, ~135 bits of entropy. The id is a bearer secret.
  return randomBytes(18).toString('base64url');
}

function newQuestionId() {
  return randomBytes(6).toString('hex');
}

export function isValidBoardId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(id);
}

// ---- file io -----------------------------------------------------------

function boardPath(id) {
  return path.join(BOARDS_DIR, `${id}.json`);
}

async function readBoard(id) {
  try {
    const raw = await fs.readFile(boardPath(id), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function writeBoard(board) {
  const id = board.id;
  const run = async () => {
    board.updatedAt = new Date().toISOString();
    const file = boardPath(id);
    const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(board, null, 2), 'utf8');
    await fs.rename(tmp, file);
    return board;
  };
  // Chain on top of any in-flight write for this board.
  const prev = writeChains.get(id) || Promise.resolve();
  const next = prev.then(run, run);
  writeChains.set(id, next.catch(() => {}));
  return next;
}

// ---- board lifecycle ---------------------------------------------------

function makeBoard(id) {
  const now = new Date().toISOString();
  return {
    id,
    teamName: '',
    createdAt: now,
    updatedAt: now,
    seedVersion: SEED_VERSION,
    settings: {},
    history: {}, // { 'YYYY-MM-DD': questionId }
    questions: SEED_QUESTIONS.map((q) => ({
      id: newQuestionId(),
      text: q.text,
      category: q.category,
      createdAt: now,
    })),
  };
}

function normalizeText(t) {
  return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().toLowerCase();
}

// Bring an older board up to the current seed: drop retired seed questions,
// then top up with ones added since its seedVersion. Matches by text so it
// never duplicates existing cards or resurrects deleted ones (an edited card
// no longer matches, so it survives retirement). Returns true if the board
// changed and should be persisted.
function migrate(board) {
  if (board.seedVersion === SEED_VERSION) return false;
  const retired = new Set(RETIRED_QUESTIONS.map(normalizeText));
  board.questions = board.questions.filter((q) => !retired.has(normalizeText(q.text)));
  const have = new Set(board.questions.map((q) => normalizeText(q.text)));
  const now = new Date().toISOString();
  for (const s of SEED_QUESTIONS) {
    if (!have.has(normalizeText(s.text))) {
      board.questions.push({ id: newQuestionId(), text: s.text, category: s.category, createdAt: now });
    }
  }
  board.seedVersion = SEED_VERSION;
  return true;
}

// Load an existing board, or create+seed one for the given id (used when a
// cookie/link references a board whose file is missing — e.g. fresh volume).
export async function loadOrCreate(id) {
  const existing = await readBoard(id);
  if (existing) {
    if (migrate(existing)) await writeBoard(existing);
    return existing;
  }
  const board = makeBoard(id);
  await writeBoard(board);
  return board;
}

// ---- daily question logic ---------------------------------------------

function activeQuestions(board) {
  return board.questions.filter((q) => !q.archived);
}

// Map of questionId -> most recent date it was the daily pick.
function lastUsedMap(board) {
  const used = {};
  for (const [date, qid] of Object.entries(board.history)) {
    if (!used[qid] || date > used[qid]) used[qid] = date;
  }
  return used;
}

// Pick a "fresh" question: ones never used win, then least-recently used,
// random among the freshest tier. `excludeId` is never returned (when possible).
function pickFresh(board, excludeId) {
  let pool = activeQuestions(board);
  if (pool.length === 0) return null;
  if (excludeId && pool.length > 1) pool = pool.filter((q) => q.id !== excludeId);

  const used = lastUsedMap(board);
  const key = (q) => used[q.id] || ''; // '' (never used) sorts first
  const freshest = pool.reduce((min, q) => (key(q) < key(min) ? q : min), pool[0]);
  const tier = pool.filter((q) => key(q) === key(freshest));
  return tier[Math.floor(Math.random() * tier.length)];
}

// The question of the day for `date`. Stable once chosen: stored in history so
// reloads show the same card. Re-picks only if the stored question was deleted.
export async function getDaily(board, date) {
  const stored = board.history[date];
  if (stored && activeQuestions(board).some((q) => q.id === stored)) {
    return board.questions.find((q) => q.id === stored);
  }
  const pick = pickFresh(board, null);
  if (!pick) return null;
  board.history[date] = pick.id;
  await writeBoard(board);
  return pick;
}

// Replace today's pick with a different fresh question.
export async function redraw(board, date) {
  const current = board.history[date];
  const pick = pickFresh(board, current);
  if (!pick) return null;
  board.history[date] = pick.id;
  await writeBoard(board);
  return pick;
}

// ---- CRUD --------------------------------------------------------------

function cleanText(text) {
  return String(text == null ? '' : text).replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

function cleanCategory(category) {
  const c = String(category == null ? '' : category).trim();
  return CATEGORIES.includes(c) ? c : '';
}

export async function addQuestion(board, { text, category }) {
  const clean = cleanText(text);
  if (!clean) return { error: 'A question needs some text.' };
  const q = {
    id: newQuestionId(),
    text: clean,
    category: cleanCategory(category),
    createdAt: new Date().toISOString(),
  };
  board.questions.unshift(q);
  await writeBoard(board);
  return { question: q };
}

export async function updateQuestion(board, id, { text, category }) {
  const q = board.questions.find((x) => x.id === id);
  if (!q) return { error: 'That question no longer exists.' };
  if (text !== undefined) {
    const clean = cleanText(text);
    if (!clean) return { error: 'A question needs some text.' };
    q.text = clean;
  }
  if (category !== undefined) q.category = cleanCategory(category);
  await writeBoard(board);
  return { question: q };
}

export async function deleteQuestion(board, id) {
  const before = board.questions.length;
  board.questions = board.questions.filter((q) => q.id !== id);
  if (board.questions.length === before) return { error: 'That question no longer exists.' };
  await writeBoard(board);
  return { ok: true };
}

export async function setTeamName(board, teamName) {
  board.teamName = String(teamName == null ? '' : teamName).trim().slice(0, MAX_TEAM);
  await writeBoard(board);
  return { teamName: board.teamName };
}

// Usage counts for the manage view (how many days each question has run).
export function usageCounts(board) {
  const counts = {};
  for (const qid of Object.values(board.history)) counts[qid] = (counts[qid] || 0) + 1;
  return counts;
}

export { CATEGORIES };
