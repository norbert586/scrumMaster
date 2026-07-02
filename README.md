# Daily Draw

A standup **question of the day** helper for scrum teams. Open it at the start of
your daily, draw a card to warm up the room, and curate your own deck of
questions over time.

Each visitor gets a **private board** (their own deck + history) tied to a
browser cookie. A copyable **board link** restores that same deck on another
device — or hands it to a teammate.

- One card a day, stable for the whole day so the team sees the same question.
- **Draw another** if you want a different one — it avoids repeating recent picks.
- **Manage deck** to add, edit, delete, search, and categorize questions.
- Ships with ~180 curated starter questions across seven categories, including
  **Michigan** and **Tech** decks.
- 16 card-face designs: printed stocks, all four playing-card suits, and themed
  faces (Lake Superior, Keweenaw copper, cherry, northern lights, circuit board).

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

`npm run dev` restarts on file changes.

Local data is written to `./data/boards/<id>.json` (git-ignored). Delete the
`data` folder to reset.

## Configuration

| Variable     | Default       | Purpose                                                        |
| ------------ | ------------- | -------------------------------------------------------------- |
| `PORT`       | `3000`        | Port to listen on. Railway sets this automatically.            |
| `DATA_DIR`   | `./data`      | Where board files live. Point at a mounted volume in prod.     |
| `NODE_ENV`   | `development` | Set to `production` so session cookies are marked `Secure`.    |

## Deploy on Railway

1. Push this repo to GitHub, then in Railway: **New Project → Deploy from GitHub
   repo**. Nixpacks auto-detects Node and runs `npm install` + `npm start`.
   (`railway.json` pins the start command.)
2. **Add a Volume** so boards survive redeploys: in the service, **+ Volume**,
   mount path `/data`.
3. **Variables**: set `DATA_DIR=/data` and `NODE_ENV=production`. Leave `PORT`
   alone — Railway injects it.
4. Generate a domain under **Settings → Networking → Generate Domain** and share
   the URL with your team.

> Prefer the CLI? `npm i -g @railway/cli`, then `railway init` and `railway up`.
> Add the volume and variables from the dashboard as above.

## How data is stored

One JSON file per board under `DATA_DIR/boards/`. Writes are atomic (temp file +
rename) and serialized per board, which is plenty for a small team's deck. The
storage layer lives in [`src/store.js`](src/store.js) behind a small interface,
so it can later be swapped for SQLite or Postgres without touching the routes.

## A note on access

A board link contains the board's id, which acts like a password — anyone with
the link can view and edit that deck. That's the right trade-off for an internal
standup tool, but don't post the link publicly.
