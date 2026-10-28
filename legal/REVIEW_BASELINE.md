# Legal docs — review baseline

Tracks how far `privacy.html` and `terms.html` have been reconciled against the
codebase, so a future review only has to look at what changed since.

| Field                | Value                                      |
| -------------------- | ------------------------------------------ |
| **Baseline commit**  | `b19fc2d0dc397950c62d91aa7a9a82d6a4c3da54` + schedules-removal change |
| Short SHA            | `b19fc2d` ("Now user can put custom message for each feature") |
| Reviewed on          | 28 October 2026                            |
| Docs "Last updated"  | 28 October 2026                            |

Both documents describe the app as of the baseline commit above, with the
scheduled-tasks feature removed (that removal was uncommitted at review time;
replace the SHA above with the commit that lands it).

## How to do the next review

```sh
git diff b19fc2d..HEAD --stat        # what changed
git log --oneline b19fc2d..HEAD      # why it changed
```

Then update whichever docs are affected, bump the `Last updated` date in both
files, and replace the baseline commit in this file with the new `HEAD`.

Things worth checking on every pass, since each has bitten us before:

- **New or changed permissions** — `android/app/src/main/AndroidManifest.xml`
  and `modules/blocker/android/src/main/AndroidManifest.xml`. Every declared
  permission needs a row in the privacy policy's section 4 table.
- **New foreground services / notification channels** — privacy section 6 quotes
  the actual notification strings, so they drift when the Kotlin changes.
- **Anything new that leaves the device** — new files under `services/api/`, or
  Kotlin making its own HTTP calls (`TaskStatusChecker`).
  Data that reaches the server has to be disclosed in section 2.
- **New on-device state** — `store/uiStore.ts` and any `*State.kt`
  SharedPreferences wrapper feed privacy section 5.1.
- **Scope changes to an existing feature** — e.g. notification blocking growing
  from "blocked apps" to "all apps". These are easy to miss because no new file
  appears; only a mode or condition changes.
- **Subscription / pricing changes** — `constants/config.ts` and the paywall
  drive terms section 10.

## History

| Commit    | Date         | What the review covered                                                                                              |
| --------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `5116c56` | 15 July 2026 | Google Sign-In, wellness features (Eye Blinker / Doom Scroll Breaker), Play Billing, subscription pricing wording.     |
| `8b2e5f7` | 18 July 2026 | Feedback form, schedules (auto-started tasks + alarms), notification blocking modes incl. "All Apps", token retention. |
| `083bca8` | 1 Sept 2026  | First-party analytics (docs edited in this commit; baseline above was not bumped at the time).                       |
| `b19fc2d`+ | 28 Oct 2026 | Schedules feature removed (privacy 2.6, alarms row, notification, token retention; terms 6.2). Custom block-screen messages (local only). Fixed 5.1: preferences moved from SecureStore to app-private AsyncStorage on 19 July. |
