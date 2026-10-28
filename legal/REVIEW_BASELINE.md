# Legal docs — review baseline

Tracks how far `privacy.html` and `terms.html` have been reconciled against the
codebase, so a future review only has to look at what changed since.

| Field                | Value                                      |
| -------------------- | ------------------------------------------ |
| **Baseline commit**  | `fe0d517b49c85847077958db4849ba0530b9dd62` + no-login change |
| Short SHA            | `fe0d517` ("schedule task removed")        |
| Reviewed on          | 28 October 2026                            |
| Docs "Last updated"  | 28 October 2026                            |

Both documents describe the app as of the baseline commit above, plus the
removal of login, accounts, server-side tasks and the subscription (that change
was uncommitted at review time; replace the SHA above with the commit that
lands it).

## How to do the next review

```sh
git diff fe0d517..HEAD --stat        # what changed
git log --oneline fe0d517..HEAD      # why it changed
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
  any HTTP call from Kotlin (there are none today). Today only feedback and
  anonymous analytics reach the server; anything else has to be disclosed in
  privacy section 2.
  Data that reaches the server has to be disclosed in section 2.
- **New on-device state** — `store/uiStore.ts` and any `*State.kt`
  SharedPreferences wrapper feed privacy section 5.1.
- **Scope changes to an existing feature** — e.g. notification blocking growing
  from "blocked apps" to "all apps". These are easy to miss because no new file
  appears; only a mode or condition changes.
- **Paid features** — the App is free (terms section 10). Adding any purchase,
  account, or sign-in reverses large parts of both documents.

## History

| Commit    | Date         | What the review covered                                                                                              |
| --------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `5116c56` | 15 July 2026 | Google Sign-In, wellness features (Eye Blinker / Doom Scroll Breaker), Play Billing, subscription pricing wording.     |
| `8b2e5f7` | 18 July 2026 | Feedback form, schedules (auto-started tasks + alarms), notification blocking modes incl. "All Apps", token retention. |
| `083bca8` | 1 Sept 2026  | First-party analytics (docs edited in this commit; baseline above was not bumped at the time).                       |
| `b19fc2d`+ | 28 Oct 2026 | Schedules feature removed (privacy 2.6, alarms row, notification, token retention; terms 6.2). Custom block-screen messages (local only). Fixed 5.1: preferences moved from SecureStore to app-private AsyncStorage on 19 July. |
| `fe0d517`+ | 28 Oct 2026 | Login, accounts, Google Sign-In, server-side tasks and subscription removed: tasks on-device only, anonymous mobile analytics, legacy accounts already deleted. Privacy 2/4/5/7/8/9/10 and terms 3/6/7/9/10/14/18 rewritten. |
