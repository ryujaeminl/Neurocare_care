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
        versionCode = 30
        versionName = "2.21"

        // 배포된 Vercel 사이트(neurocare-guardian). 로컬 개발로 되돌리려면
        // 에뮬레이터 기준 10.0.2.2:3001(호스트 PC의 127.0.0.1 별칭)로 바꾼다.
        buildConfigField("String", "WEBAPP_BASE_URL", "\"https://neurocare-care.vercel.app\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
        debug {
            signingConfig = signingConfigs.getByName("debug")
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
