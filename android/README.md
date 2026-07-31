# 뉴로케어 보호자 Android (WebView 래퍼)

웹앱(`../app`)은 그대로 두고, 긴급 알림을 잠금화면 위로 즉시 띄우는 동작만 네이티브로
추가한 프로젝트다. 실제 화면은 새로 만들지 않고 WebView로 기존 Next.js 보호자 앱을
그대로 띄운다 - 환자 앱의 `../../Neurocare/android`와 같은 구조이지만, 마이크/웨이크워드가
없는 훨씬 단순한 버전이다.

## 구조

- `MainActivity` — WebView 1개로 구성. `BuildConfig.WEBAPP_BASE_URL`(보호자 웹앱 주소)을
  로드한다. 마이크 권한 처리가 없다 - 이 앱은 음성 기능을 쓰지 않는다.
- `emergency/EmergencyNotifier` — 전체화면 인텐트 알림을 만든다. Android 14+의 전체화면
  알림 권한과 "다른 앱 위에 그리기" 권한을 앱 시작 시 요청한다.
- `emergency/EmergencyAlertActivity` — 알림을 탭하거나 잠금화면에서 자동으로 열리는 화면.
  별도 UI 없이 보호자 웹앱의 `/emergency/[eventId]` 확인 화면을 WebView로 띄운다.

**아직 안 된 것**: 서버의 긴급 이벤트(Neurocare의 `app/api/emergency`)가 이 앱까지
실시간으로 전달되게 하려면 FCM(Firebase Cloud Messaging) 연동이 필요하다 - 팀 고유
Firebase 프로젝트의 `google-services.json`이 있어야 하는 부분이라 이 저장소에는 포함하지
않았다. `EmergencyNotifier.showEmergencyAlert()`는 이미 구현되어 있으니, FCM 서비스의
`onMessageReceived`에서 이 함수를 호출하면 된다.

## 빌드/실행

Android Studio의 내장 JBR(OpenJDK 21)을 쓰도록 `gradle.properties`의
`org.gradle.java.home`이 고정 경로로 지정되어 있다 - 다른 PC에서 쓰려면 이 값을 수정한다.

```bash
./gradlew assembleDebug
```

에뮬레이터(예: `Pixel_10` AVD)에서 테스트:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell pm grant com.neurocare.guardian android.permission.POST_NOTIFICATIONS
adb shell am start -n com.neurocare.guardian/.MainActivity
```

`app/build.gradle.kts`의 `WEBAPP_BASE_URL`은 에뮬레이터 전용 특수 별칭인
`10.0.2.2`(호스트 PC의 127.0.0.1)로 보호자 웹앱(3001번 포트)을 가리킨다. 실행 전에
호스트에서 서버가 떠 있어야 한다:

```bash
# ../ (Neurocaremam 루트)에서
npm run dev   # Next.js, 127.0.0.1:3001
```

실기기 배포 시에는 `WEBAPP_BASE_URL`을 실제 배포 주소로 바꾼다(환자 앱과 동일한 패턴).

## 확인된 것 / 확인 안 된 것

- ✅ Gradle 빌드(`compileDebugKotlin`, `assembleDebug`) 성공, APK 생성 확인
- ⚠️ 에뮬레이터/실기기에 설치해 WebView 렌더링, 알림 권한 플로우, 전체화면 인텐트가 실제
  잠금화면 위로 뜨는지는 이 환경(브라우저 기반 세션)에서 검증하지 못했다 - Android
  Studio나 실기기에서 직접 확인이 필요하다.
- FCM 미연동이라, 지금은 `EmergencyNotifier.showEmergencyAlert()`를 실제로 호출해줄
  트리거가 없다(코드는 준비되어 있고 호출부만 없는 상태).
