const fs = require('fs');
const path = require('path');
const {
	withGradleProperties,
	withAppBuildGradle,
	withDangerousMod,
} = require('expo/config-plugins');

const KEEP_RULES_MARKER = '# BEGIN BrainClean ProGuard rules';
const SIGNING_MARKER = '// BEGIN BrainClean release signing';

const KEEP_RULES = `
${KEEP_RULES_MARKER}
# Kotlin blocker module — referenced from JS via Expo Modules autolinking
-keep class expo.modules.blocker.** { *; }
-keep class expo.modules.kotlin.** { *; }
-keep class expo.modules.core.** { *; }

# Foreground service, boot receiver, notification listener: declared in
# AndroidManifest.xml, looked up by name by the Android system.
-keep class expo.modules.blocker.BlockerService { *; }
-keep class expo.modules.blocker.BootReceiver { *; }
-keep class expo.modules.blocker.NotificationBlockerService { *; }

# OkHttp (used by TaskStatusChecker for backend polling)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Kotlin coroutines (used by BlockerService)
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }
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

module.exports = function withProductionAndroidConfig(config) {
	config = withGradlePropertyFlags(config);
	config = withReleaseSigningConfig(config);
	config = withProguardKeepRules(config);
	return config;
};
