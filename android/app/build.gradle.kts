plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.neurocare.guardian"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.neurocare.guardian"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        // 에뮬레이터의 10.0.2.2는 호스트 PC의 127.0.0.1을 가리키는 특수 별칭이다 -
        // 로컬 개발 중인 보호자 웹앱(neurocare-guardian, 3001번 포트)을 가리킨다.
        // 실제 배포 후에는 배포된 주소로 바꾼다(환자 앱의 android/app/build.gradle.kts처럼).
        buildConfigField("String", "WEBAPP_BASE_URL", "\"http://10.0.2.2:3001\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
}
