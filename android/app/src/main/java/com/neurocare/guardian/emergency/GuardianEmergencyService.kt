package com.neurocare.guardian.emergency

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.webkit.CookieManager
import androidx.core.app.NotificationCompat
import com.neurocare.guardian.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject
import kotlin.concurrent.thread

/**
 * 앱이 잠금화면 상태이거나 다른 앱을 사용하는 백그라운드 상태에서도
 * 실시간으로 /api/emergency를 폴링하여 SOS 신호 발생 시
 * 상단 배너 알림이 아닌 전체화면(EmergencyAlertActivity) SOS 창을 즉시 팝업하는 서비스.
 */
class GuardianEmergencyService : Service() {

    companion object {
        private const val TAG = "GuardianEmergencySvc"
        private const val SERVICE_CHANNEL_ID = "guardian_service_channel"
        private const val NOTIFICATION_ID = 9999
        private const val POLL_INTERVAL_MS = 1500L

        fun start(context: Context) {
            val intent = Intent(context, GuardianEmergencyService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    private var isRunning = false
    private var lastHandledEventId: String? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification())
        startPolling()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                SERVICE_CHANNEL_ID,
                "보호자 긴급 감지 서비스",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "실시간 SOS 감지 및 전체화면 긴급 팝업"
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): android.app.Notification {
        return NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("뉴로케어 긴급 SOS 감지 중")
            .setContentText("백그라운드/잠금화면에서 실시간 SOS를 감지합니다.")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun startPolling() {
        if (isRunning) return
        isRunning = true

        thread {
            while (isRunning) {
                try {
                    checkEmergency()
                } catch (e: Exception) {
                    Log.e(TAG, "Emergency check failed: ${e.message}")
                }
                try {
                    Thread.sleep(POLL_INTERVAL_MS)
                } catch (e: InterruptedException) {
                    break
                }
            }
        }
    }

    private fun checkEmergency() {
        val url = URL("${BuildConfig.WEBAPP_BASE_URL}/api/emergency")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 3000
        conn.readTimeout = 3000
        conn.useCaches = false

        val cookie = CookieManager.getInstance().getCookie(BuildConfig.WEBAPP_BASE_URL)
        if (!cookie.isNullOrEmpty()) {
            conn.setRequestProperty("Cookie", cookie)
        }

        if (conn.responseCode == 200) {
            val text = conn.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(text)
            val events = json.optJSONArray("events")
            if (events != null && events.length() > 0) {
                val firstEvent = events.getJSONObject(0)
                val eventId = firstEvent.optString("id")
                val patientObj = firstEvent.optJSONObject("patient")
                val patientName = patientObj?.optString("name") ?: "환자"

                if (eventId != lastHandledEventId && eventId.isNotEmpty()) {
                    lastHandledEventId = eventId
                    Log.w(TAG, "DETECTED OPEN EMERGENCY EVENT: $eventId")

                    // 상단 알림 배너가 아닌 전체화면 SOS 창(EmergencyAlertActivity)을 즉시 팝업!
                    EmergencyNotifier.showEmergencyAlert(
                        this,
                        eventId,
                        "$patientName 어르신 긴급 SOS!",
                        "위급 상황 신호가 접수되었습니다."
                    )
                }
            } else {
                lastHandledEventId = null
            }
        }
        conn.disconnect()
    }

    override fun onDestroy() {
        isRunning = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
