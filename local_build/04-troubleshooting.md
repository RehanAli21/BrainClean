# 04 — Troubleshooting

## "JAVA_HOME is not set" / wrong JDK version

```powershell
java --version
$env:JAVA_HOME
```

If it shows JDK 21 or 11, you have the wrong default. Fix `JAVA_HOME` in System Environment Variables to point at JDK 17, then reopen PowerShell.

To test without touching system vars:
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

## "SDK location not found"

Create `android\local.properties` with:

```properties
sdk.dir=C\:\\Users\\rehan\\AppData\\Local\\Android\\Sdk
```

Note the double backslashes (Gradle properties format). Or set `ANDROID_HOME` permanently.

Prebuild usually creates `local.properties` for you — if it's missing, prebuild may have failed silently.

## "Could not find expo-modules-autolinking" / weird module errors

You changed something in `modules/blocker/` or installed/removed an npm package. Re-prebuild:

```powershell
npx expo prebuild --platform android --clean
```

## "Gradle build daemon disappeared unexpectedly"

Out of memory. Increase Gradle's heap. Edit `android\gradle.properties` (or your global one):

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

## "Keystore was tampered with, or password was incorrect"

The password in `gradle.properties` doesn't match the keystore. Two likely causes:
- Typo in `BRAINCLEAN_UPLOAD_STORE_PASSWORD`
- Store password and key password differ — make sure both are set correctly

Test the keystore manually:
```powershell
keytool -list -keystore android\app\your-keystore-file.keystore
```

## Signing report shows debug keystore, not release

`gradle.properties` isn't being picked up. Check:

1. The four `BRAINCLEAN_UPLOAD_*` vars are in `android\gradle.properties` (not `~\.gradle\gradle.properties` only — though that should also work).
2. After editing, the build hasn't been re-run. `assembleRelease` / `bundleRelease` reads them fresh each time.
3. The plugin actually injected the signing block. Open `android\app\build.gradle` and search for `BEGIN BrainClean release signing` — should be there. If not, prebuild didn't run the plugin (try `--clean`).

## "Play Store rejects upload: signature does not match previously signed APKs"

You're using a different keystore than the one used for your previous upload. Two options:

- Recover the original keystore (from EAS via `eas credentials`, or wherever you stored it).
- If truly lost: use [Play Console → Setup → App integrity → Request signing key reset](https://support.google.com/googleplay/android-developer/answer/9842756) (Google has to approve; takes days).

## "Duplicate class" / version mismatch errors

Something in `node_modules` is out of sync with the prebuilt `android/`. Nuke and re-run:

```powershell
Remove-Item -Recurse -Force android
Remove-Item -Recurse -Force node_modules
npm install
npx expo prebuild --platform android --clean
cd android; .\gradlew.bat assembleDebug
```

## R8/ProGuard removed something the app needs at runtime

Symptom: release build crashes on startup but debug works fine.

Add a `-keep` rule to the keep-rules section in `plugins/withProductionAndroidConfig.js` (look for `KEEP_RULES` near the top), or temporarily test with R8 disabled by adding to `android\gradle.properties`:

```properties
android.enableMinifyInReleaseBuilds=false
```

If the release build works with this disabled, the issue is R8 stripping code. Find what's missing in `adb logcat` (look for `ClassNotFoundException` or `NoSuchMethodError`), then add a matching `-keep` rule.

## Build is incredibly slow

First build is always slow (downloads Gradle 8.x, AGP 8.x, all deps, ~1–2 GB). Subsequent builds should be much faster.

If still slow:
- Use Gradle daemon: add to `gradle.properties` → `org.gradle.daemon=true` (usually default)
- Parallel builds: `org.gradle.parallel=true`
- Configure-on-demand: `org.gradle.configureondemand=true`
- Build only the variant you need: `.\gradlew.bat :app:assembleDebug` (not full `assemble`)

## adb doesn't see my phone

```powershell
adb devices
```

If empty:
1. Enable Developer Options on phone (tap "Build number" 7 times in Settings → About).
2. Enable USB Debugging in Developer Options.
3. Reconnect cable. Approve the RSA fingerprint prompt on the phone.
4. Try a different USB cable — many cheap cables are power-only.

## Native crash / blocker module not behaving

```powershell
adb logcat -c                                                          # clear log
adb logcat | findstr /R "BlockerService AppMonitor TaskStatusChecker BlockerOverlay"
```

Reproduce the issue and watch the output. The Kotlin code logs important state transitions at `Log.i` and `Log.e` level.

## "EAS Build concurrency limit reached" (you'll never see this again)

That was the whole point of moving to local builds. You're done with EAS for builds. You can still use EAS for:
- Managing keystores (`eas credentials`)
- OTA updates (`eas update`) — if you ever set those up
- Submitting to stores (`eas submit`) — but at this point you might as well upload AABs manually too

You can leave `eas.json` in the repo or delete it. It does nothing unless you run an `eas` command.
