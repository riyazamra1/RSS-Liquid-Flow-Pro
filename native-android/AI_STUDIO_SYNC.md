# AI Studio → Native Android sync contract

The native Android app reads its supported game-content configuration from:

`native-android/app/src/main/assets/game-spec.json`

When editing this project in Google AI Studio, make supported content changes in that JSON file and push the change to GitHub. The Native Android workflow is configured to build on pushes to `main` and `feat/native-android-kotlin` when native Android files change.

## Supported by the current native loader

- `capacity`: liquid units per jar (2–12)
- `colors`: unique numeric IDs, display names, and hex colors
- `defaultBoard`: bottom-to-top color IDs for each jar; empty arrays represent empty jars

The native app validates the schema when loading the asset. Invalid color references, duplicate IDs, invalid hex values, or over-capacity jars fail fast rather than silently creating a broken board.

## Important boundary

The current AI Studio app source under `src/` is React/Vite. React screens, TypeScript game logic, CSS, and component changes do **not** automatically become native Kotlin UI or Kotlin logic. This bridge covers only the JSON fields listed above. Any new gameplay rule, screen, animation, or interaction must also be implemented and tested in `native-android/` before it can ship in the native Android app.

## Release boundary

A GitHub push can trigger a native debug build. It does not by itself publish an update to installed phones. Production delivery still requires a signed release using the permanent app signing key, a versionCode increase, publication of the APK and update manifest on `rssapps.net`, and successful installation testing. Never commit signing keys or passwords.
