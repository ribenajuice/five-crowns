# Changelog

Every change you would notice, in plain language, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each dated heading below is live in
production. Anything not yet deployed sits in an **Unreleased** section at the top.

## [Unreleased]

The second stage of Milestone 2: correcting the record. Built and tested, but not merged or
deployed yet.

### Added

- **A saved game can now be corrected.** "Edit this game" on a game's page reopens the same review
  screen used when it was first entered — the same photo beside the numbers, the same checks — and
  saving updates that game in place instead of creating a new one. You can change the date, venue,
  players and every number; the sheet photo itself is the one thing that can't be swapped for
  another. Nothing marks a game as edited — an edited game looks exactly like one that was never
  touched.
- **A saved game can now be permanently deleted.** "Delete game" leads to a confirmation naming the
  exact game — its date and who played — and needs a second, deliberate tap on "Delete permanently".
  A single tap never deletes anything. The confirmation is upfront that this can't be undone and
  that it takes the game's photos out of the record with it — though the photo files themselves
  aren't destroyed; the app is deliberately never given permission to do that, so one could still be
  recovered by hand later if it ever mattered.
- **Broken and made-up links now show this app's own screens, not a generic one.** A deleted game's
  page, a mistyped address, or a link to a player, roster or place that doesn't exist all show a
  plain "not found" page with a clear way back to the games list. If something goes wrong
  unexpectedly, you see a plain, honest error screen instead — neither screen ever shows a
  technical detail.

### Fixed

- Both new buttons, "Edit this game" and "Delete permanently", didn't actually do anything when
  tapped in a real browser. Found by review and fixed before anyone would have hit it.
- A few edge cases around doing two things to the same game at once — editing it right as someone
  else deletes it, for instance — were found and closed before this shipped.

## [Stage 5] - 2026-09-13

This stage was a checkup, not a new feature — an audit pass, top to bottom, to make sure everything
already shipped actually works and is easy to use on a phone. There's almost nothing to see here on
purpose.

### Fixed

- **Four buttons were slightly too small to tap reliably on a phone.** The "As written / Per hand"
  toggle on a game's page, the "Fix something" link on both the review screen and the cell editor,
  and the show/hide icon next to the API key field in the admin panel were all a little under the
  minimum comfortable tap size. All four are now easy to tap.
- **The rotate button's icon was actually broken, not just a bit off.** Its circular arrow was drawn
  too large for its own frame, so most of it was invisibly clipped away — what showed up was an odd
  little hook, not a proper arrow. Replaced with a correctly-drawn one that also turns the same way
  the button actually rotates your photo.

### Verified, nothing to fix

- Every game and every screen was checked again from scratch, all 86 of the app's original
  requirements, including running "Read the sheet" against the real, paid reading service (not a
  stand-in) — it worked cleanly.
- The original test of how accurate automatic reading is was re-run for real, using the paid
  reading service instead of an estimate. The numbers held up: it gets the vast majority of
  individual scores right, but you should still glance over every reading before saving, because it
  can't catch every mistake by itself. Worth knowing: a mis-read final score in a column is just as
  likely as any other mistake, and it's the one kind that nothing else in the app would catch for
  you — so it's worth a second look on that last number especially.

## [Stage 4] - 2026-09-13

### Added

- **You can fix the shape of a column, not just its numbers.** From "Fix something" on the review
  screen, you can now add a column the first read missed, remove one that shouldn't be there,
  reassign a column to a different player (or a new one), reorder columns to match the photo, and
  insert or delete a single value inside a column — so an off-by-one doesn't mean retyping the
  whole thing.
- **You can re-photograph just one column.** If a column's read looks wrong, take a close-up of it
  on its own instead of redoing the whole sheet — it's faster and far more reliable than a full
  re-read. The new reading is shown against the old one so you can see exactly what changed, and
  rejecting it takes one tap with no re-upload needed.
- **If you photograph the wrong column**, the app notices the name on the close-up doesn't match
  the player you picked, and tells you — without stopping you from saving.
- **If a close-up disagrees with something you typed yourself**, that exact cell is called out,
  rather than the close-up silently overwriting your correction.
- **There's a daily limit on column re-reads too**, as the same kind of safety net as the sheet
  read limit — separate from it, generous enough for a genuinely bad night, and manual entry and
  editing are never affected by it.
- **A saved game's page now shows any close-up photos taken while reviewing it**, labelled with the
  player they belong to — not just the original full sheet photo.

### Fixed

- A close-up photo could vanish if its column was removed (as one of the structural repairs above)
  before the game was saved. It's now kept with the game either way, just without a player label if
  its column no longer exists.
- A rare timing issue meant a column re-read finishing late could overwrite an edit you made while
  it was still working. Your edit now always wins.
- The "try again" button after a failed close-up upload could get stuck and stop working. It now
  always retries properly.
- Inserting or deleting a value inside a column could leave the "worth checking" flag pointing at
  the wrong row afterwards. It now moves with the row it was actually flagging.
- Close-up timestamps now show in the same date format used everywhere else in the app.

## [Stage 3] - 2026-09-12

### Added

- **You can now read the sheet automatically.** When adding a game, choose "Read the sheet" next
  to "Type it in by hand". It reads the numbers off your photo while a progress screen shows it
  working, then fills in the review screen's grid for you — you still check every number before
  saving, the same as always.
- **If a read fails, you don't have to re-photograph anything.** A "Try again" button retries the
  same photo you already took.
- **There's a daily limit on automatic reads**, as a safety net. Once it's used up for the day,
  typing the numbers in by hand still always works — it's never blocked by this limit.
- **The admin panel does something now.** Paste in your Anthropic API key and it's tested with a
  real call before it's saved, so a typo or an expired key is caught immediately and the key you
  had before stays untouched. Afterwards the panel shows only the key's last four characters, when
  it was set, and whether it's currently working — never the key itself.
- **A key that stops working shows up next time you check the panel**, even if nothing was just
  saved — so a revoked key or one that's hit its spending limit turns up calmly in the admin panel,
  not mid-game with a sheet to photograph.

## [Stage 2] - 2026-09-12

### Added

- **You can add a game.** Photograph the paper scoresheet (the camera opens directly on a phone,
  or choose a photo), turn it upright, then type in the numbers on the review screen. Every saved
  game keeps its photo.
- **The review screen** shows a strip of the photo for one player's column next to the numbers, so
  you can check as you type. Mark where each column is as you pick its player, and tap any number
  to fix it. Per-hand scores update as you type. Pairs of numbers that don't climb are flagged, and
  a big hand gets a gentle warning that never blocks saving. The last row is shown on its own with
  the winner.
- **Your work saves as you go**, so if your phone closes the page mid-entry, your draft is still
  there when you come back.
- **Date, venue and players are picked from lists**, or you can add a new one — so one venue or
  person never splits into two by being typed differently.
- **The games list** is newest first, showing the date, venue ("No location" if none), who played,
  and who won. **A game's page** shows the scores as written, the per-hand scores, and a zoomable
  photo.
- Photos must be **JPEGs under 8 MB**, and there's a limit of **40 uploads a day**.

## [Stage 1] - 2026-09-11

### Added

- **The app is private.** Every page asks for the group password first. There are no accounts:
  everyone shares one password.
- **Guessing the password is blocked.** After 10 wrong tries in 10 minutes from the same place, the
  app says "Too many tries. Try again later." and stops checking for a while. This holds even if
  someone tries to dodge it by pretending to guess from lots of different addresses, or by sending
  a burst of guesses at once. Another website also can't quietly use up your household's tries.
- **The admin area has its own password.** Going to `/admin` asks for the admin password, even when
  you're already signed in with the group password. Wrong admin guesses are limited the same way,
  but counted separately. The screen behind it is empty for now. Setting the transcription key
  comes with transcription itself.
- **You can back up the scores yourself.** Run `npm run db:backup` and it saves a dated copy of the
  whole score database to your own computer and prints where it went. There's no automatic nightly
  backup — this is the only one, so it's worth running it now and then. Photos are protected
  separately and kept forever: a deleted photo can always be recovered.
- **The scoring checks are tested against your two real scoresheets** (the four-player and the
  five-player game). If a change to the scoring maths gets either sheet wrong, it can't be shipped.

### Changed

- **Password hashes use a new format.** If you set up the app on your own computer before
  11 September 2026, your saved passwords won't work any more. The server log shows
  `login.malformed_password_hash`. Run `node scripts/hash-password.js` again for each password and
  paste the new values into `.env.local`. New hashes look like `scrypt:16384:8:1:…` and have no `$`
  in them.
