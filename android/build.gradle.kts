allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    project.afterEvaluate {
        val android = project.extensions.findByName("android") as? com.android.build.gradle.BaseExtension
        android?.apply {
            compileOptions {
                sourceCompatibility = JavaVersion.VERSION_17
                targetCompatibility = JavaVersion.VERSION_17
            }
        }
        project.tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
            compilerOptions {
                jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
            }
        }
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

subprojects {
    fun applyNamespace() {
        try {
            val android = project.extensions.findByName("android") as? com.android.build.gradle.BaseExtension
            if (android != null && android.namespace == null) {
                val manifestFile = project.file("src/main/AndroidManifest.xml")
                if (manifestFile.exists()) {
                    val manifestText = manifestFile.readText()
                    val match = Regex("package\\s*=\\s*[\"']([^\"']+)[\"']").find(manifestText)
                    if (match != null) {
                        val packageName = match.groupValues[1]
                        android.namespace = packageName
                        println("Fixed missing namespace for ${project.name} using package: $packageName")
                    }
                }
            }
        } catch (e: Exception) {
            // Ignore if android extension is not found or other errors
        }
    }

    if (project.state.executed) {
        applyNamespace()
    } else {
        project.afterEvaluate { applyNamespace() }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
