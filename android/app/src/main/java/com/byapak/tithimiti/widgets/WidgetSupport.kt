package com.byapak.tithimiti.widgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Shared plumbing for the home-screen widgets: SharedPreferences payloads
 * written by the JS side, BS date formatting, deep-link intents, and the
 * self-rescheduling midnight refresh that keeps date-derived content honest
 * even when the app hasn't been opened.
 */
internal object WidgetSupport {

    const val ACTION_MIDNIGHT_TICK = "com.byapak.tithimiti.action.WIDGET_MIDNIGHT_TICK"

    val BS_MONTHS_ROMANIZED = arrayOf(
        "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
        "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
    )

    /** Read a widget payload, tolerating the historical prefs-name casing split. */
    fun readWidgetJson(context: Context, key: String): JSONObject? {
        return try {
            var raw = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
                .getString(key, "")
            if (raw.isNullOrEmpty()) {
                raw = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                    .getString(key, "")
            }
            if (raw.isNullOrEmpty()) null else JSONObject(raw)
        } catch (e: Exception) {
            null
        }
    }

    /** Local-time YYYY-MM-DD for "today" — matches the JS side's getTodayISO. */
    fun todayIso(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    /** "2083/5/15" (or "2083-5-15") -> Triple(2083, 5, 15), or null. */
    fun parseBsDate(bsDate: String): Triple<Int, Int, Int>? {
        val parts = bsDate.trim().split('/', '-')
        if (parts.size != 3) return null
        val y = parts[0].toIntOrNull() ?: return null
        val m = parts[1].toIntOrNull() ?: return null
        val d = parts[2].toIntOrNull() ?: return null
        if (m !in 1..12 || d !in 1..32) return null
        return Triple(y, m, d)
    }

    /** "2083/5/15" -> "15 Bhadra 2083"; falls back to the raw string. */
    fun formatBsDateHero(bsDate: String): String {
        val parsed = parseBsDate(bsDate) ?: return bsDate
        val (y, m, d) = parsed
        return "$d ${BS_MONTHS_ROMANIZED[m - 1]} $y"
    }

    /**
     * This instance's current width in dp (portrait), for sizing bitmap text.
     * Falls back when the host hasn't reported options (e.g. the dev preview).
     */
    fun widgetWidthDp(context: Context, appWidgetId: Int, fallback: Float): Float = try {
        val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId)
        val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        if (width > 0) width.toFloat() else fallback
    } catch (e: Exception) {
        fallback
    }

    /** This instance's current height in dp (portrait). */
    fun widgetHeightDp(context: Context, appWidgetId: Int, fallback: Float): Float = try {
        val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId)
        val height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT)
        if (height > 0) height.toFloat() else fallback
    } catch (e: Exception) {
        fallback
    }

    /** Deep-link PendingIntent into the app; requestCode keeps instances distinct. */
    fun openAppIntent(context: Context, requestCode: Int, deepLink: String): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * Arm an inexact alarm shortly after the next local midnight that broadcasts
     * back to the provider, so day-dependent content (BS date, tithi, "in N
     * days", the daily reading) rolls over without the app running. Re-armed on
     * every render; inexact is fine — the widget only needs to be right when
     * the user next looks at it.
     */
    fun scheduleMidnightTick(context: Context, providerClass: Class<*>) {
        try {
            val alarm = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, providerClass).apply { action = ACTION_MIDNIGHT_TICK }
            val pi = PendingIntent.getBroadcast(
                context,
                providerClass.name.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val next = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, 1)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 1)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            alarm.set(AlarmManager.RTC, next.timeInMillis, pi)
        } catch (e: Exception) {
            // Widgets still refresh on the hourly updatePeriodMillis tick.
        }
    }

    fun cancelMidnightTick(context: Context, providerClass: Class<*>) {
        try {
            val alarm = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, providerClass).apply { action = ACTION_MIDNIGHT_TICK }
            val pi = PendingIntent.getBroadcast(
                context,
                providerClass.name.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarm.cancel(pi)
        } catch (e: Exception) {
            // ignore
        }
    }
}

/**
 * Base class for all TithiMiti widget providers: renders every instance on
 * update, keeps a midnight refresh armed, and re-renders on the clock events
 * the system still delivers to manifest receivers (time set, timezone change,
 * boot — which also restores the midnight alarm lost on reboot).
 */
abstract class BaseWidgetProvider : AppWidgetProvider() {

    /** Render one widget instance. Implementations must not throw. */
    abstract fun render(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int)

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            render(context, appWidgetManager, appWidgetId)
        }
        WidgetSupport.scheduleMidnightTick(context, javaClass)
    }

    // Re-render on resize: bitmap text (see WidgetText) is sized to the
    // instance's reported dimensions.
    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle
    ) {
        render(context, appWidgetManager, appWidgetId)
    }

    protected fun updateAllInstances(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, javaClass))
        if (ids.isNotEmpty()) onUpdate(context, manager, ids)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            WidgetSupport.ACTION_MIDNIGHT_TICK,
            Intent.ACTION_DATE_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_BOOT_COMPLETED -> updateAllInstances(context)
        }
    }

    override fun onDisabled(context: Context) {
        WidgetSupport.cancelMidnightTick(context, javaClass)
        super.onDisabled(context)
    }
}
