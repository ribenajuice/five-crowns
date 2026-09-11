# Changelog

Every change you would notice, in plain language, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Nothing is deployed yet, so everything
below is still **Unreleased**.

## [Unreleased]

### Added

- **The app is private.** Every page asks for the group password first. There are no accounts:
  everyone shares one password.
- **Guessing the password is blocked.** After 10 wrong tries in 10 minutes from the same place, the
  app says "Too many tries. Try again later." and stops checking for a while. This holds even if
  someone tries to dodge it by pretending to guess from lots of different addresses, or by sending
  a burst of guesses at once. Another website also can't quietly use up your household's tries.
- **You land on the games list after you sign in.** It is empty for now and says "Nothing in the
  book yet." The **Add a game** button leads to a "Capture arrives soon" page. You can't
  photograph a sheet yet.
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
