# 02 — Debug Build

Fastest path: install on your own phone in ~5 minutes. Signed with Android's debug keystore (auto-generated, no setup). Not for Play Store, but perfect for personal testing and verifying the toolchain works.

## Steps

From the project root (`D:\rehan\GrayGuard`):

### 1. Regenerate the native android/ folder

```powershell
npx expo prebuild --platform android --clean
```

Wait until it finishes. This:
- Re-generates `android/` from `app.json`
- Runs your `withProductionAndroidConfig.js` plugin (injects ProGuard rules, release signing config, gradle properties)
- Autolinks the Kotlin `modules/blocker/` module

> The `--clean` flag wipes any local edits inside `android/`. Don't hand-edit files in there — put config in `app.json` or `plugins/withProductionAndroidConfig.js` instead.

### 2. Build the debug APK

```powershell
cd android
.\gradlew.bat assembleDebug
```

First run takes 5–15 minutes (downloads Gradle, AGP, dependencies). Subsequent builds are ~30–90 seconds.

### 3. Find the APK

```
D:\rehan\GrayGuard\android\app\build\outputs\apk\debug\app-debug.apk
```

### 4. Install on your phone

**Option A — USB cable** (phone with USB debugging enabled):

```powershell
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

`-r` reinstalls and keeps app data. Omit it for a fresh install.

**Option B — Manual transfer**:
- Copy `app-debug.apk` to your phone (Bluetooth, email, Drive, USB).
- Tap it in the phone's file manager.
- Allow "Install from unknown sources" if prompted.

## Re-building after code changes

JS / TS changes: just run `assembleDebug` again from `android/`. No need to re-prebuild.

Native Kotlin changes (anything in `modules/blocker/android/`): also just `assembleDebug` — the autolinker picks it up.

Changes to `app.json`, `plugins/withProductionAndroidConfig.js`, or any expo config plugin: **re-run prebuild**:

```powershell
cd ..
npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleDebug
```

## Quick verification

Install, open the app on your phone, and check:

- Login works (uses production API at `api.brainclean.app/api`)
- Permissions wizard shows up
- Creating + starting a task triggers the foreground service notification
- Opening a blocked app shows the overlay within ~250ms
- Marking task complete on web unblocks the phone within ~5s (TaskStatusChecker poll interval)

If something native fails (overlay doesn't show, monitor doesn't detect apps), check `adb logcat | findstr "BlockerService AppMonitor BlockerOverlay"` for stack traces.

---

Once this works, you're ready for release builds → `03-release-build.md`
