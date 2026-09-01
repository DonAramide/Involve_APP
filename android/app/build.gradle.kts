import java.util.Properties
import java.text.SimpleDateFormat
import java.util.Date

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(keystorePropertiesFile.inputStream())
}

android {
    namespace = "com.invify.invoice_app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.invify.invoice_app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties.getProperty("keyAlias")
            keyPassword = keystoreProperties.getProperty("keyPassword")
            storeFile = keystoreProperties.getProperty("storeFile")?.let { file(it) }
            storePassword = keystoreProperties.getProperty("storePassword")
        }
    }

    buildTypes {
        release {
            // Fallback: If key.properties exists AND we haven't explicitly requested an unsigned build, sign with release.
            // Otherwise, if we requested 'unsigned' via Env Var, use no signingConfig (produces unsigned APK).
            // Else, fall back to debug signing for local testing.
            val buildUnsigned = System.getenv("BUILD_UNSIGNED") == "true"
            signingConfig = if (keystorePropertiesFile.exists() && !buildUnsigned) {
                signingConfigs.getByName("release")
            } else if (buildUnsigned) {
                null
            } else {
                signingConfigs.getByName("debug")
            }
            
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    applicationVariants.all {
        val variant = this
        val formattedDate = SimpleDateFormat("yyyy-MM-dd").format(Date())
        val vName = variant.versionName ?: "1.0.0"
        
        variant.outputs.all {
            val outputImpl = this as? com.android.build.gradle.internal.api.BaseVariantOutputImpl
            val newApkName = "invify-v${vName}-${variant.name}-${formattedDate}.apk"
            outputImpl?.outputFileName = newApkName
        }
        
        variant.assembleProvider.configure {
            doLast {
                val apkDir = layout.buildDirectory.dir("outputs/apk/${variant.name}").get().asFile
                val flutterApkDir = file("$rootDir/../build/app/outputs/flutter-apk")
                
                val versionedApkName = "invify-v${vName}-${formattedDate}.apk"
                val releaseApkName = "invify-v${vName}-${variant.name}-${formattedDate}.apk"
                
                if (flutterApkDir.exists()) {
                    val srcApk = file("$apkDir/$releaseApkName")
                    if (srcApk.exists()) {
                        srcApk.copyTo(file("$flutterApkDir/$versionedApkName"), overwrite = true)
                        srcApk.copyTo(file("$flutterApkDir/$releaseApkName"), overwrite = true)
                        println("[Invify Build] Generated versioned APK: ${flutterApkDir.path}/$versionedApkName")
                    }
                }
            }
        }
    }

    packaging {
        resources {
            excludes += listOf(
                "META-INF/DEPENDENCIES",
                "META-INF/versions/9/OSGI-INF/MANIFEST.MF"
            )
            pickFirsts += listOf(
                "META-INF/jdom-info.xml"
            )
        }
    }
}

flutter {
    source = "../.."
}

fun ensureAssetManifest(variantName: String) {
    val src = file("${layout.buildDirectory.get()}/intermediates/flutter/$variantName/flutter_assets/AssetManifest.bin")
    val dest = file("${layout.buildDirectory.get()}/intermediates/assets/$variantName/merge${variantName.replaceFirstChar { it.uppercase() }}Assets/flutter_assets/AssetManifest.bin")
    if (src.exists()) {
        dest.parentFile.mkdirs()
        src.copyTo(dest, overwrite = true)
        println("[Invify] Copied AssetManifest.bin into merge${variantName.replaceFirstChar { it.uppercase() }}Assets")
    }
}

afterEvaluate {
    listOf("debug", "release", "profile").forEach { variant ->
        val cap = variant.replaceFirstChar { it.uppercase() }
        tasks.matching { it.name == "compress${cap}Assets" }.configureEach {
            doFirst { ensureAssetManifest(variant) }
        }
        tasks.matching { it.name == "merge${cap}Assets" }.configureEach {
            doLast { ensureAssetManifest(variant) }
        }
    }
}

dependencies {
    implementation(project(":mpossdk"))
    implementation(project(":morefunsdk"))
}
