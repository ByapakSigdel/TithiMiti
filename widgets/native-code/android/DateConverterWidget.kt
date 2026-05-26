package com.byapak.tithimiti.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private const val ACTION_PREV = "com.byapak.tithimiti.action.DATE_PREV"
private const val ACTION_NEXT = "com.byapak.tithimiti.action.DATE_NEXT"
private const val ACTION_TODAY = "com.byapak.tithimiti.action.DATE_TODAY"
private const val PREF_OFFSET = "date_converter_offset"

class DateConverterWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateDateConverterWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
        val current = sharedPref.getInt(PREF_OFFSET, 0)
        when (intent.action) {
            ACTION_PREV -> sharedPref.edit().putInt(PREF_OFFSET, current - 1).apply()
            ACTION_NEXT -> sharedPref.edit().putInt(PREF_OFFSET, current + 1).apply()
            ACTION_TODAY -> sharedPref.edit().putInt(PREF_OFFSET, 0).apply()
            else -> return
        }
        val mgr = AppWidgetManager.getInstance(context)
        val ids = mgr.getAppWidgetIds(ComponentName(context, DateConverterWidget::class.java))
        for (id in ids) {
            updateDateConverterWidget(context, mgr, id)
        }
    }
}

private fun stepIntent(context: Context, action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, DateConverterWidget::class.java).apply {
        this.action = action
    }
    return PendingIntent.getBroadcast(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
}

internal fun updateDateConverterWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        val views = RemoteViews(context.packageName, R.layout.date_converter_widget)

        val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
        val offset = sharedPref.getInt(PREF_OFFSET, 0)

        // Compute the AD date for the offset
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, offset)
        val displayDateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.US)
        val isoFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val adDate = displayDateFormat.format(cal.time)
        val adIso = isoFormat.format(cal.time)

        // Look up BS date in the AD->BS map
        var bsDate = "—"
        var mapString = sharedPref.getString("date_converter_map", "")
        if (mapString.isNullOrEmpty()) {
            val altPref = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
            mapString = altPref.getString("date_converter_map", "")
        }
        if (!mapString.isNullOrEmpty()) {
            try {
                val map = JSONObject(mapString)
                bsDate = map.optString(adIso, "—")
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // Fallback: legacy single-bs-date entry for offset 0
        if (bsDate == "—" && offset == 0) {
            var legacy = sharedPref.getString("date_converter_widget", "")
            if (legacy.isNullOrEmpty()) {
                val altPref = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                legacy = altPref.getString("date_converter_widget", "")
            }
            if (!legacy.isNullOrEmpty()) {
                try {
                    bsDate = JSONObject(legacy).optString("bsDate", "—")
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        views.setTextViewText(R.id.ad_date, adDate)
        views.setTextViewText(R.id.bs_date, bsDate)

        // Wire up step buttons
        views.setOnClickPendingIntent(
            R.id.prev_button,
            stepIntent(context, ACTION_PREV, appWidgetId * 10 + 1)
        )
        views.setOnClickPendingIntent(
            R.id.next_button,
            stepIntent(context, ACTION_NEXT, appWidgetId * 10 + 2)
        )
        views.setOnClickPendingIntent(
            R.id.today_button,
            stepIntent(context, ACTION_TODAY, appWidgetId * 10 + 3)
        )

        // Open converter on root or open button click
        val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://(tabs)/converter"))
        openIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        val openPi = PendingIntent.getActivity(
            context,
            appWidgetId * 10 + 4,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.open_button, openPi)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: Exception) {
        e.printStackTrace()
        try {
            val fallbackViews = RemoteViews(context.packageName, R.layout.date_converter_widget)
            fallbackViews.setTextViewText(R.id.ad_date, "Error")
            fallbackViews.setTextViewText(R.id.bs_date, "Tap to open")
            appWidgetManager.updateAppWidget(appWidgetId, fallbackViews)
        } catch (ignored: Exception) {}
    }
}
