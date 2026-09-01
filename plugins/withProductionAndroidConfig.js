const fs = require('fs');
const path = require('path');
const {
	withGradleProperties,
	withAppBuildGradle,
	withDangerousMod,
	withAndroidManifest,
	withAndroidStyles,
	AndroidConfig,
} = require('expo/config-plugins');

const KEEP_RULES_MARKER = '# BEGIN BrainClean ProGuard rules';
const SIGNING_MARKER = '// BEGIN BrainClean release signing';

const KEEP_RULES = `
${KEEP_RULES_MARKER}
# Kotlin blocker module — referenced from JS via Expo Modules autolinking
-keep class expo.modules.blocker.** { *; }
-keep class expo.modules.kotlin.** { *; }
-keep class expo.modules.core.** { *; }

# Foreground service, boot receiver, notification listener, watchdog: declared in
# AndroidManifest.xml, looked up by name by the Android system.
-keep class expo.modules.blocker.BlockerService { *; }
-keep class expo.modules.blocker.BootReceiver { *; }
-keep class expo.modules.blocker.NotificationBlockerService { *; }
-keep class expo.modules.blocker.WellnessService { *; }
-keep class expo.modules.blocker.ServiceGuardReceiver { *; }
-keep class expo.modules.blocker.ScheduleAlarmReceiver { *; }

# Kotlin coroutines (used by BlockerService)
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }

# Google Auth module
-keep class expo.modules.googleauth.** { *; }

# Credential Manager + Google Identity
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
# END BrainClean ProGuard rules
`;

const RELEASE_SIGNING_CONFIG = `
        ${SIGNING_MARKER}
        release {
            if (project.hasProperty('BRAINCLEAN_UPLOAD_STORE_FILE')) {
                storeFile file(BRAINCLEAN_UPLOAD_STORE_FILE)
                storePassword BRAINCLEAN_UPLOAD_STORE_PASSWORD
                keyAlias BRAINCLEAN_UPLOAD_KEY_ALIAS
                keyPassword BRAINCLEAN_UPLOAD_KEY_PASSWORD
            } else {
                // Never silently ship a debug-signed "release" build. This
                // closure runs at configuration time for EVERY build, so only
                // fail when a release task was actually requested. EAS Build
                // injects remote credentials itself and is exempt.
                def wantsRelease = gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }
                if (wantsRelease && System.getenv('EAS_BUILD') == null) {
                    throw new GradleException('Release signing not configured: set BRAINCLEAN_UPLOAD_STORE_FILE and related properties in gradle.properties')
                }
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
        // END BrainClean release signing
`;

function setGradleProperty(properties, key, value) {
	const existing = properties.find((item) => item.type === 'property' && item.key === key);
	if (existing) {
		existing.value = value;
	} else {
		properties.push({ type: 'property', key, value });
	}
}

const withGradlePropertyFlags = (config) =>
	withGradleProperties(config, (cfg) => {
		setGradleProperty(cfg.modResults, 'android.enableMinifyInReleaseBuilds', 'true');
		setGradleProperty(cfg.modResults, 'android.enableShrinkResourcesInReleaseBuilds', 'true');
		setGradleProperty(
			cfg.modResults,
			'GOOGLE_WEB_CLIENT_ID',
			'492066566680-n051drfsfnnkm5ls4mdogfpfj4ori87c.apps.googleusercontent.com',
		);
		setGradleProperty(cfg.modResults, 'android.enableR8.fullMode', 'true');
		const deprecated = cfg.modResults.findIndex(
			(item) => item.type === 'property' && item.key === 'expo.edgeToEdgeEnabled',
		);
		if (deprecated !== -1) cfg.modResults.splice(deprecated, 1);
		return cfg;
	});

const withHermesCommandFix = (config) =>
	withAppBuildGradle(config, (cfg) => {
		// RN 0.81 bundles Hermes internally — the prebuild template's
		// hermes-compiler resolution fails because the package doesn't exist.
		cfg.modResults.contents = cfg.modResults.contents.replace(
			/^\s*hermesCommand\s*=.*hermes-compiler.*$/m,
			'    // hermesCommand removed — Hermes is bundled in react-native 0.81+',
		);
		return cfg;
	});

const withReleaseSigningConfig = (config) =>
	withAppBuildGradle(config, (cfg) => {
		let contents = cfg.modResults.contents;

		if (!contents.includes(SIGNING_MARKER)) {
			contents = contents.replace(
				/signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\}\s*\}/,
				(match) => match.replace(/\}\s*\}\s*$/, `}${RELEASE_SIGNING_CONFIG}    }`),
			);
		}

		contents = contents.replace(
			/release\s*\{\s*\/\/\s*Caution![\s\S]*?signingConfig\s+signingConfigs\.debug/,
			(match) => match.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release'),
		);

		cfg.modResults.contents = contents;
		return cfg;
	});

const withProguardKeepRules = (config) =>
	withDangerousMod(config, [
		'android',
		async (cfg) => {
			const proguardPath = path.join(
				cfg.modRequest.platformProjectRoot,
				'app',
				'proguard-rules.pro',
			);
			if (!fs.existsSync(proguardPath)) return cfg;

			let contents = fs.readFileSync(proguardPath, 'utf8');
			if (!contents.includes(KEEP_RULES_MARKER)) {
				contents = contents.trimEnd() + '\n' + KEEP_RULES;
				fs.writeFileSync(proguardPath, contents);
			}
			return cfg;
		},
	]);

const withEdgeToEdgeStyles = (config) =>
	withDangerousMod(config, [
		'android',
		async (cfg) => {
			const stylesPath = path.join(
				cfg.modRequest.platformProjectRoot,
				'app',
				'src',
				'main',
				'res',
				'values',
				'styles.xml',
			);
			if (!fs.existsSync(stylesPath)) return cfg;

			let contents = fs.readFileSync(stylesPath, 'utf8');
			contents = contents.replace(
				/\s*<item name="android:statusBarColor">.*?<\/item>/g,
				'',
			);
			contents = contents.replace(
				/\s*<item name="android:enforceNavigationBarContrast"[^>]*>.*?<\/item>/g,
				'',
			);
			fs.writeFileSync(stylesPath, contents);
			return cfg;
		},
	]);

// The blocker/schedule SharedPreferences hold a plaintext auth token; they must
// never be uploaded via Android Auto Backup or device-to-device transfer.
// expo-secure-store's default rules only exclude its own prefs, so we replace
// them with rules that also exclude ours (SecureStore.xml stays excluded).
const BACKUP_EXCLUDES = [
	'SecureStore.xml',
	'brainclean_blocker_state.xml',
	'brainclean_schedule_state.xml',
];

const BACKUP_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
${BACKUP_EXCLUDES.map((p) => `  <exclude domain="sharedpref" path="${p}"/>`).join('\n')}
</full-backup-content>
`;

const DATA_EXTRACTION_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
${BACKUP_EXCLUDES.map((p) => `    <exclude domain="sharedpref" path="${p}"/>`).join('\n')}
  </cloud-backup>
  <device-transfer>
${BACKUP_EXCLUDES.map((p) => `    <exclude domain="sharedpref" path="${p}"/>`).join('\n')}
  </device-transfer>
</data-extraction-rules>
`;

const withBackupRules = (config) => {
	config = withDangerousMod(config, [
		'android',
		async (cfg) => {
			const xmlDir = path.join(
				cfg.modRequest.platformProjectRoot,
				'app',
				'src',
				'main',
				'res',
				'xml',
			);
			fs.mkdirSync(xmlDir, { recursive: true });
			fs.writeFileSync(path.join(xmlDir, 'brainclean_backup_rules.xml'), BACKUP_RULES_XML);
			fs.writeFileSync(
				path.join(xmlDir, 'brainclean_data_extraction_rules.xml'),
				DATA_EXTRACTION_RULES_XML,
			);
			return cfg;
		},
	]);

	// Runs after expo-secure-store's manifest mod (plugin order in app.json),
	// overriding its rules with ours.
	config = withAndroidManifest(config, (cfg) => {
		const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
		mainApplication.$['android:fullBackupContent'] = '@xml/brainclean_backup_rules';
		mainApplication.$['android:dataExtractionRules'] = '@xml/brainclean_data_extraction_rules';
		return cfg;
	});

	return config;
};

const SCHEDULE_RECEIVER_TAG = 'expo.modules.blocker.ScheduleAlarmReceiver';

const withScheduleReceiver = (config) =>
	withDangerousMod(config, [
		'android',
		async (cfg) => {
			const manifestPath = path.join(
				cfg.modRequest.platformProjectRoot,
				'app',
				'src',
				'main',
				'AndroidManifest.xml',
			);
			if (!fs.existsSync(manifestPath)) return cfg;

			let contents = fs.readFileSync(manifestPath, 'utf8');
			if (!contents.includes(SCHEDULE_RECEIVER_TAG)) {
				contents = contents.replace(
					'</application>',
					`    <receiver android:name="${SCHEDULE_RECEIVER_TAG}" android:exported="false"/>\n  </application>`,
				);
				fs.writeFileSync(manifestPath, contents);
			}
			return cfg;
		},
	]);

module.exports = function withProductionAndroidConfig(config) {
	config = withGradlePropertyFlags(config);
	config = withHermesCommandFix(config);
	config = withReleaseSigningConfig(config);
	config = withProguardKeepRules(config);
	config = withEdgeToEdgeStyles(config);
	config = withScheduleReceiver(config);
	config = withBackupRules(config);
	return config;
};
