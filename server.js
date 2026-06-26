// Daily Draw — standup question-of-the-day server.
// A single Node + Express deployable: serves the static frontend and a small
// REST API. Each visitor gets a private board, identified by a cookie and
// restorable via a shareable link.

import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './src/store.js';
import { CATEGORIES } from './src/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const COOKIE = 'qotd_sid';
const isProd = process.env.NODE_ENV === 'production';

await store.init();

const app = express();
app.set('trust proxy', 1); // Railway terminates TLS in front of us.
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

function setBoardCookie(res, id) {
  res.cookie(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

// Restore a board from a shared link: /?b=<id> adopts that board, then redirects
// to a clean URL so the secret id doesn't linger in the address bar / history.
app.get('/', (req, res, next) => {
  const b = req.query.b;
  if (b && store.isValidBoardId(b)) {
    setBoardCookie(res, b);
    return res.redirect('/');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Resolve the caller's board, creating one (and the cookie) on first contact.
async function withBoard(req, res) {
  let id = req.cookies[COOKIE];
  if (!store.isValidBoardId(id)) {
    id = store.newBoardId();
    setBoardCookie(res, id);
  }
  return store.loadOrCreate(id);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function resolveDate(input) {
  if (typeof input === 'string' && DATE_RE.test(input)) return input;
  return new Date().toISOString().slice(0, 10);
}

function serializeQuestions(board) {
  const counts = store.usageCounts(board);
  return board.questions.map((q) => ({
    id: q.id,
    text: q.text,
    category: q.category || '',
    uses: counts[q.id] || 0,
  }));
}

function asyncRoute(handler) {
  return (req, res) => handler(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our end.' });
  });
}

// Bootstrap: everything the app needs in one call.
app.get('/api/board', asyncRoute(async (req, res) => {
  const board = await withBoard(req, res);
  const date = resolveDate(req.query.date);
  const daily = await store.getDaily(board, date);
  res.json({
    board: { id: board.id, teamName: board.teamName },
    categories: CATEGORIES,
    date,
    daily: daily ? { id: daily.id, text: daily.text, category: daily.category || '' } : null,
    questions: serializeQuestions(board),
  });
}));

app.post('/api/redraw', asyncRoute(async (req, res) => {
  const board = await withBoard(req, res);
  const date = resolveDate(req.body && req.body.date);
  const daily = await store.redraw(board, date);
  res.json({ daily: daily ? { id: daily.id, text: daily.text, category: daily.category || '' } : null });
}));

app.post('/api/questions', asyncRoute(async (req, res) => {
  const board = await withBoard(req, res);
  const result = await store.addQuestion(board, req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json({ question: result.question, questions: serializeQuestions(board) });
}));

app.put('/api/questions/:id', asyncRoute(async (req, res) => {
  const board = await withBoard(req, res);
  const result = await store.updateQuestion(board, req.params.id, req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ question: result.question, questions: serializeQuestions(board) });
}));

app.delete('/api/questions/:id', asyncRoute(async (req, res) => {
  const board = await withBoard(req, res);
  const result = await store.deleteQuestion(board, req.params.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ ok: true, questions: serializeQuestions(board) });
}));

app.post('/api/board/team', asyncRoute(async (req, res) => {
  const board = await withBoard(req, res);
  const result = await store.setTeamName(board, (req.body || {}).teamName);
  res.json(result);
}));

app.listen(PORT, () => {
  console.log(`Daily Draw running on http://localhost:${PORT}`);
});
