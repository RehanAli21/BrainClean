package expo.modules.googleauth

import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import java.security.MessageDigest
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicReference

class GoogleAuthModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("GoogleAuthModule")

        AsyncFunction("signInWithGoogle") {
            val activity = appContext.currentActivity
                ?: throw CodedException("NO_ACTIVITY", "No activity available", null)

            val webClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID
            if (webClientId.isBlank()) {
                throw CodedException("NO_CLIENT_ID", "GOOGLE_WEB_CLIENT_ID not configured", null)
            }

            val packageName = activity.packageName
            val sha1 = getSigningSha1(activity.packageManager, packageName)
            Log.i(TAG, "Package: $packageName | SHA-1: $sha1 | ServerClientId: $webClientId")

            val signInOption = GetSignInWithGoogleOption.Builder(webClientId)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(signInOption)
                .build()

            val credentialManager = CredentialManager.create(activity)
            val resultRef = AtomicReference<String?>(null)
            val errorRef = AtomicReference<Exception?>(null)
            val latch = CountDownLatch(1)

            CoroutineScope(Dispatchers.Main).launch {
                try {
                    val result = credentialManager.getCredential(activity, request)
                    val googleCred = GoogleIdTokenCredential.createFrom(result.credential.data)
                    Log.i(TAG, "Google sign-in successful, got ID token")
                    resultRef.set(googleCred.idToken)
                } catch (e: GetCredentialCancellationException) {
                    Log.e(TAG, "Cancellation exception: type=${e.type}, message=${e.message}", e)
                    errorRef.set(CodedException("SIGN_IN_CANCELLED", "User cancelled Google sign-in", e))
                } catch (e: Exception) {
                    Log.e(TAG, "Google sign-in failed", e)
                    errorRef.set(CodedException("SIGN_IN_FAILED", e.message ?: "Google sign-in failed", e))
                } finally {
                    latch.countDown()
                }
            }

            latch.await()

            val error = errorRef.get()
            if (error != null) throw error

            return@AsyncFunction resultRef.get()
        }
    }

    private fun getSigningSha1(pm: PackageManager, packageName: String): String {
        return try {
            val signingInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val info = pm.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
                info.signingInfo?.apkContentsSigners?.firstOrNull()?.toByteArray()
            } else {
                @Suppress("DEPRECATION")
                val info = pm.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
                @Suppress("DEPRECATION")
                info.signatures?.firstOrNull()?.toByteArray()
            }
            if (signingInfo == null) return "UNKNOWN"
            val digest = MessageDigest.getInstance("SHA-1").digest(signingInfo)
            digest.joinToString(":") { "%02X".format(it) }
        } catch (e: Exception) {
            "ERROR: ${e.message}"
        }
    }

    companion object {
        private const val TAG = "GoogleAuthModule"
    }
}
