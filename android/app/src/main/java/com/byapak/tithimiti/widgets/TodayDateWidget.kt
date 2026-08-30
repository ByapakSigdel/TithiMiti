package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import java.text.SimpleDateFormat
import java.util.*
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.view.View
import org.json.JSONObject
import android.util.Log

class TodayDateWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateTodayDateWidget(context, appWidgetManager, appWidgetId)
        }
    }
}

internal fun updateTodayDateWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    val TAG = "Widget:TodayDate"
    // Deep linking intent (Open Calendar tab). Request code = appWidgetId so
    // this PendingIntent can never collide with another widget's.
    fun openAppIntent(): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://(tabs)"))
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        return PendingIntent.getActivity(
            context,
            appWidgetId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
    try {
        Log.d(TAG, "Updating TodayDate widget id=$appWidgetId")
        val views = RemoteViews(context.packageName, R.layout.today_date_widget)
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent())

        // Get current AD date
        val today = Date()
        val adDateFormat = SimpleDateFormat("MMMM dd, yyyy", Locale.getDefault())
        val adDate = adDateFormat.format(today)

        // Read from SharedPreferences for BS date, tithi, sunrise/sunset
        var dataString: String? = null
        try {
            val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
            dataString = sharedPref.getString("today_widget", "")
            if (dataString.isNullOrEmpty()) {
                val altPref = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                dataString = altPref.getString("today_widget", "")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error reading shared prefs: ${e.message}")
        }

        var bsDate = "Loading..."
        var bsDateNepali = ""
        var tithi = "Open app to load"
        var sunrise = "--:--"
        var sunset = "--:--"
        var todayEvent = ""

        if (!dataString.isNullOrEmpty()) {
            try {
                val todayData = org.json.JSONObject(dataString)
                bsDate = todayData.optString("bsDate", bsDate)
                bsDateNepali = todayData.optString("bsDateNepali", "")
                tithi = todayData.optString("tithi", tithi)
                sunrise = todayData.optString("sunrise", sunrise)
                sunset = todayData.optString("sunset", sunset)
                todayEvent = todayData.optString("todayEvent", "")
                Log.d(TAG, "Loaded today_widget data=$dataString")
            } catch (e: Exception) {
                Log.e(TAG, "Malformed today_widget JSON: ${e.message}")
            }
        } else {
            Log.d(TAG, "No cached today_widget data found, using defaults")
        }

        // Weekday pill: e.g. "MON · TODAY"
        val weekdayFormat = SimpleDateFormat("EEE", Locale.US)
        val weekday = weekdayFormat.format(today).uppercase(Locale.US)
        views.setTextViewText(R.id.weekday_pill, "$weekday · TODAY")

        views.setTextViewText(R.id.bs_date_large, bsDate)
        // Collapse the Nepali date line when absent — an empty TextView still
        // measures a line and pushes the bottom rows past the 2x2 cell height.
        if (bsDateNepali.isNotEmpty()) {
            views.setTextViewText(R.id.bs_date_nepali, bsDateNepali)
            views.setViewVisibility(R.id.bs_date_nepali, View.VISIBLE)
        } else {
            views.setViewVisibility(R.id.bs_date_nepali, View.GONE)
        }
        views.setTextViewText(R.id.ad_date_text, adDate)
        views.setTextViewText(R.id.tithi_text, tithi)
        views.setTextViewText(R.id.sunrise_time, sunrise)
        views.setTextViewText(R.id.sunset_time, sunset)
        views.setTextViewText(
            R.id.today_event_text,
            if (todayEvent.isNotEmpty()) todayEvent else "No event today"
        )
        // Highlight a real event in the brand accent; muted grey when there's none.
        views.setTextColor(
            R.id.today_event_text,
            if (todayEvent.isNotEmpty()) 0xFFE2606C.toInt() else 0xFF9AA0A8.toInt()
        )

        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(TAG, "TodayDate widget updated successfully")
    } catch (e: Exception) {
        Log.e("Widget:TodayDate", "Failed to update widget: ${e.message}")
        try {
            val fallbackViews = RemoteViews(context.packageName, R.layout.today_date_widget)
            fallbackViews.setTextViewText(R.id.bs_date_large, "—")
            fallbackViews.setTextViewText(R.id.ad_date_text, "Tap to open app")
            fallbackViews.setTextViewText(R.id.tithi_text, "")
            // Keep the widget tappable in the error state — it says "Tap to
            // open app", so it must actually open the app.
            fallbackViews.setOnClickPendingIntent(R.id.widget_root, openAppIntent())
            appWidgetManager.updateAppWidget(appWidgetId, fallbackViews)
        } catch (ignored: Exception) {
            // Last resort: do nothing
        }
    }
}
