package com.neurocare.guardian

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.neurocare.guardian.emergency.EmergencyNotifier

/**
 * 이 앱은 마이크/음성 기능이 없는 보호자용 래퍼다 - 화면은 전부 기존 Next.js 보호자
 * 웹앱(neurocare-guardian)이 WebView 안에서 담당하고, 여기서는 그 웹앱을 띄우는 것과
 * 긴급 알림을 잠금화면 위로 즉시 보여주는 것만 다룬다.
 */
class MainActivity : AppCompatActivity() {

    private companion object {
        const val TAG = "GuardianWebView"
    }

    private lateinit var webView: WebView

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            // 결과와 무관하게 웹앱은 그대로 띄운다 - 알림은 부가 기능이라 거부해도 앱 사용엔 지장 없다.
            webView.loadUrl(BuildConfig.WEBAPP_BASE_URL)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        EmergencyNotifier.createChannel(this)
        // 안드로이드 14+는 전체화면 알림 권한이 기본 꺼짐 상태라, 없으면 긴급 알림이 와도
        // 화면이 자동으로 안 뜬다. 한 번 켜두면 계속 유지된다.
        EmergencyNotifier.ensureFullScreenIntentPermission(this)

        // 전체화면 알림은 잠금화면에서만 자동으로 앱을 띄운다 - 화면이 켜져 있고 다른 앱을
        // 쓰는 중이거나 홈화면일 땐 배너만 뜨고 자동으로 안 열린다. "다른 앱 위에 그리기"
        // 권한이 있으면 그 제약이 풀려 어느 상황에서든 바로 뜬다.
        if (!Settings.canDrawOverlays(this)) {
            startActivity(
                Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")),
            )
        }

        webView = WebView(this)
        setContentView(webView)
        setupWebView()

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            },
        )

        ensurePermissionsThenStart()
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // WebView 안에서 난 오류는 밖에서 보이지 않는다. 화면이 빈 채로 멈췄을 때 원인을
        // 바로 알 수 있도록 로딩 실패와 JS 오류를 토스트와 logcat 양쪽에 드러낸다.
        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?,
            ) {
                val detail = "로딩 실패: ${error?.description} (${request?.url})"
                Log.e(TAG, detail)
                showError(detail)
            }

            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest?,
                errorResponse: WebResourceResponse?,
            ) {
                val statusCode = errorResponse?.statusCode
                // 401은 "로그인 안 됨"일 뿐이라 실제 버그가 아니다 - 매번 토스트로 놀라게 하지 않는다.
                if (statusCode != 401) showError("HTTP $statusCode: ${request?.url}")
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                if (message.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    Log.e(TAG, "JS 오류: ${message.message()} (${message.sourceId()}:${message.lineNumber()})")
                }
                return true
            }
        }
    }

    private var lastShownError: String? = null

    private fun showError(detail: String) {
        if (detail == lastShownError) return
        lastShownError = detail
        runOnUiThread { Toast.makeText(this, detail.take(300), Toast.LENGTH_LONG).show() }
    }

    private fun ensurePermissionsThenStart() {
        val needsNotificationPermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            android.content.pm.PackageManager.PERMISSION_GRANTED

        if (needsNotificationPermission) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            webView.loadUrl(BuildConfig.WEBAPP_BASE_URL)
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }
}
