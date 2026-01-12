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
import org.json.JSONObject

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
    try {
        val views = RemoteViews(context.packageName, R.layout.today_date_widget)
    
    // Deep linking intent (Open Calendar tab)
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://(tabs)"))
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
    val pendingIntent = PendingIntent.getActivity(
        context, 
        0, 
        intent, 
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

    // Get current AD date
    val today = Date()
    val adDateFormat = SimpleDateFormat("MMMM dd, yyyy", Locale.US)
    val adDate = adDateFormat.format(today)
    
    // Read from SharedPreferences for BS date, tithi, sunrise/sunset
    val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
    val dataString = sharedPref.getString("today_widget", "")
    var bsDate = "2082/9/24"
    var tithi = "N/A"
    var sunrise = "06:45 AM"
    var sunset = "05:30 PM"
    
    if (!dataString.isNullOrEmpty()) {
        try {
            val todayData = org.json.JSONObject(dataString)
            bsDate = todayData.optString("bsDate", bsDate)
            tithi = todayData.optString("tithi", tithi)
            sunrise = todayData.optString("sunrise", sunrise)
            sunset = todayData.optString("sunset", sunset)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    views.setTextViewText(R.id.bs_date_large, bsDate)
    views.setTextViewText(R.id.ad_date_text, adDate)
    views.setTextViewText(R.id.tithi_text, tithi)
    views.setTextViewText(R.id.sunrise_time, sunrise)
    views.setTextViewText(R.id.sunset_time, sunset)
    
        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: Exception) {
        e.printStackTrace()
        // Create fallback simple view
        try {
            val fallbackViews = RemoteViews(context.packageName, R.layout.today_date_widget)
            fallbackViews.setTextViewText(R.id.bs_date_large, "Error")
            fallbackViews.setTextViewText(R.id.ad_date_text, "Tap to open app")
            appWidgetManager.updateAppWidget(appWidgetId, fallbackViews)
        } catch (ignored: Exception) {
            // Last resort: do nothing
        }
    }
}
