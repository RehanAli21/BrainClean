# Local Build — BrainClean

Build BrainClean's Android APK / AAB locally on your Windows machine. No EAS, no cloud queue, no concurrency limit.

## What you can build

| Output | Use case | Signed with | Doc |
|---|---|---|---|
| **Debug APK** | Sideload on your own phone for testing | Android debug keystore (auto) | `02-debug-build.md` |
| **Release APK** | Sideload a production build, share via link | Your upload keystore | `03-release-build.md` |
| **Release AAB** | Upload to Google Play Store | Your upload keystore | `03-release-build.md` |

## Order of operations

1. **One-time setup** — install JDK 17 + Android SDK → `01-prerequisites.md`
2. **First build** — try the debug path to confirm your toolchain works → `02-debug-build.md`
3. **Release builds** — set up your keystore, build signed AAB → `03-release-build.md`
4. **Stuck?** → `04-troubleshooting.md`

## What's already wired up for you

- `plugins/withProductionAndroidConfig.js` already injects the release `signingConfig` into `android/app/build.gradle` during prebuild. It reads four Gradle properties:
  - `BRAINCLEAN_UPLOAD_STORE_FILE`
  - `BRAINCLEAN_UPLOAD_STORE_PASSWORD`
  - `BRAINCLEAN_UPLOAD_KEY_ALIAS`
  - `BRAINCLEAN_UPLOAD_KEY_PASSWORD`
  - If these are missing, it falls back to the debug keystore (safe for local testing).
- ProGuard / R8 rules for the Kotlin blocker module are also injected by the same plugin.
- The Kotlin native module (`modules/blocker/`) is autolinked via Expo Modules — nothing extra to configure.

## Important: keystore choice

You have a keystore already on EAS that signed your previous Play Store uploads. If you ever uploaded a build via EAS to Play Console, **you must keep using that same keystore** — Play Store rejects mismatched signatures.

Two options, pick one and never switch:

- **Reuse EAS keystore (recommended if you've already published)** — download with `eas credentials`. See `03-release-build.md`.
- **Generate a fresh one (only if you've never published to Play Store)** — see `03-release-build.md`.

## Environment variable

Your production build needs `EXPO_PUBLIC_API_BASE_URL=https://api.brainclean.app/api`. Set it before `prebuild` so it gets baked into the JS bundle:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "https://api.brainclean.app/api"
```

If unset, `constants/config.ts` falls back to the same URL — but be explicit for production builds.

---

Start with `01-prerequisites.md`.
