// Curated starter deck. Every new board begins with these so it's useful on
// first load. Categories drive the colored pill on each card.
//
// SEED_VERSION bumps whenever questions are added below. Existing boards are
// topped up with the new ones on next load (see store.migrate) — matched by
// text, so it never duplicates or resurrects a question you've deleted.
export const SEED_VERSION = 2;

export const SEED_QUESTIONS = [
  { text: "What's the first thing you'd do with a surprise free hour today?", category: 'Icebreaker' },
  { text: 'If your week so far had a soundtrack, what is the opening song?', category: 'Icebreaker' },
  { text: "What's a small win from yesterday that nobody else saw?", category: 'Reflection' },
  { text: "Coffee, tea, or something that really shouldn't count as breakfast?", category: 'Fun' },
  { text: "What's the most useless skill you're secretly proud of?", category: 'Icebreaker' },
  { text: 'If you could instantly master one tool or language, which one?', category: 'Fun' },
  { text: "What's a browser tab you've had open for far too long?", category: 'Fun' },
  { text: "What's the last thing that made you laugh out loud?", category: 'Icebreaker' },
  { text: "If today were a weather forecast for your focus, what's the forecast?", category: 'Icebreaker' },
  { text: "What's one thing slowing you down that the team could help with?", category: 'Reflection' },
  { text: "What did you learn this sprint that you'd tell your past self?", category: 'Reflection' },
  { text: "What's a task you keep avoiding — and what's the first 10 minutes of it?", category: 'Reflection' },
  { text: 'Where did you get unblocked recently, and who helped?', category: 'Team' },
  { text: "What's one thing we should absolutely keep doing as a team?", category: 'Reflection' },
  { text: 'If you could delete one recurring meeting, which one and why?', category: 'Reflection' },
  { text: "What's the smallest change that would make tomorrow run smoother?", category: 'Reflection' },
  { text: 'Spaces or tabs — defend your honor in one sentence.', category: 'This or That' },
  { text: 'If your code had a warning label, what would it say?', category: 'Fun' },
  { text: 'Mountains or ocean for your next time off?', category: 'This or That' },
  { text: 'What fictional character would you want in your standup?', category: 'Fun' },
  { text: 'Pineapple on pizza: feature or bug?', category: 'This or That' },
  { text: "What's your walk-on song if standup had entrances?", category: 'Fun' },
  { text: 'Superpower draft: pause time or rewind ten seconds?', category: 'This or That' },
  { text: 'Who on the team deserves a shout-out today?', category: 'Team' },
  { text: "What's something non-work you're looking forward to this week?", category: 'Team' },
  { text: "What's a hobby you could teach the rest of us in five minutes?", category: 'Team' },
  { text: 'What do you wish people asked you more about?', category: 'Team' },
  { text: 'If the team had a mascot, what should it be?', category: 'Fun' },
  { text: "What's a definition of “done” you wish we were stricter about?", category: 'Reflection' },
  { text: 'Window seat or aisle seat — and what does your answer reveal?', category: 'This or That' },
  { text: 'If you could swap roles with anyone here for a day, who and why?', category: 'Icebreaker' },
  { text: "What's a tiny thing that reliably makes your day better?", category: 'Icebreaker' },
  { text: "What's the best advice you've gotten in the last year?", category: 'Reflection' },
  { text: 'If you had to eat one cuisine for a month, which would it be?', category: 'Fun' },
  { text: "What's one thing you got noticeably better at this month?", category: 'Reflection' },
  { text: 'What would make this sprint a personal success for you?', category: 'Reflection' },
  { text: "What's a blocker you can already see coming this week?", category: 'Reflection' },
  { text: "What's one process here you'd love to simplify?", category: 'Reflection' },
  { text: "What's the weirdest thing in your fridge right now?", category: 'Fun' },
  { text: 'If you were a command-line tool, what would you do?', category: 'Fun' },
  { text: "What's an app you wish existed but doesn't?", category: 'Fun' },
  { text: "What's your most-used emoji, and what does it really mean?", category: 'Fun' },
  { text: 'What would your work-edition villain origin story be?', category: 'Fun' },
  { text: 'Dark mode or light mode — final answer?', category: 'This or That' },
  { text: 'Early bird or night owl for your best deep work?', category: 'This or That' },
  { text: 'Chat or email for actually getting things done?', category: 'This or That' },
  { text: "What's something a teammate did recently that you appreciated?", category: 'Team' },
  { text: 'What do you want to learn from someone else on this team?', category: 'Team' },
  { text: 'If we celebrated one tiny win right now, what should it be?', category: 'Team' },
];

export const CATEGORIES = ['Icebreaker', 'Reflection', 'Fun', 'This or That', 'Team'];
