# 01 — Prerequisites

One-time setup. Skip any section if you already have it.

## 1. Node + npm

You already have these (you've been running `npm start`). Confirm:

```powershell
node --version    # need v20.x or newer
npm --version
```

## 2. JDK 17

React Native 0.81 + AGP 8 require JDK 17. Not 11, not 21.

```powershell
java --version
```

If it says 17.x, skip ahead. Otherwise:

1. Download **Eclipse Temurin 17 (LTS)** for Windows x64: https://adoptium.net/temurin/releases/?version=17
2. Install the `.msi`. During install, tick:
   - "Set JAVA_HOME variable"
   - "Add to PATH"
3. Open a new PowerShell window and verify:
   ```powershell
   java --version
   $env:JAVA_HOME
   ```

## 3. Android SDK

Two ways. Pick one.

### Option A — Android Studio (easier, ~3 GB)

1. Download Android Studio: https://developer.android.com/studio
2. Install with default options. Launch it once and let the setup wizard install the latest SDK + Build Tools.
3. Open **More Actions → SDK Manager** and make sure these are installed:
   - **SDK Platforms** tab: `Android 15.0 (API 35)` — that's the target SDK for Expo SDK 54.
   - **SDK Tools** tab: `Android SDK Build-Tools 35.x`, `Android SDK Platform-Tools`, `Android SDK Command-line Tools`.
4. Note the SDK install path (something like `C:\Users\rehan\AppData\Local\Android\Sdk`).

### Option B — Command-line SDK only (~700 MB, no IDE)

1. Download "Command line tools only" from https://developer.android.com/studio (bottom of page).
2. Extract to `C:\Android\Sdk\cmdline-tools\latest\` (the `latest` folder name matters).
3. Open PowerShell:
   ```powershell
   $env:ANDROID_HOME = "C:\Android\Sdk"
   $env:Path += ";$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools"
   sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
   ```
4. Accept licenses:
   ```powershell
   sdkmanager --licenses
   ```

## 4. Environment variables (permanent)

Make sure these are set in your Windows System Environment Variables (not just the current PowerShell session):

| Variable | Value (example) |
|---|---|
| `JAVA_HOME` | `C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot` |
| `ANDROID_HOME` | `C:\Users\rehan\AppData\Local\Android\Sdk` (or wherever your SDK lives) |
| `Path` (append) | `%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin` |

To set permanently via PowerShell (run as Administrator):
```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot", "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\rehan\AppData\Local\Android\Sdk", "User")
```

Then **close and reopen PowerShell** so the new env vars are picked up.

## 5. Verify everything

Open a fresh PowerShell and run:

```powershell
java --version           # should print 17.x
echo $env:JAVA_HOME      # should point to JDK 17
echo $env:ANDROID_HOME   # should point to SDK
adb --version            # should print Android Debug Bridge
```

If `adb` is not recognized, your `Path` doesn't include `%ANDROID_HOME%\platform-tools` yet — fix that and reopen the shell.

---

Next → `02-debug-build.md`
