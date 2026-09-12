# Changelog

Every change you would notice, in plain language, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each dated heading below is live in
production. Anything not yet deployed would sit in an **Unreleased** section at the top — there
isn't one right now, because the latest build is already live.

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
