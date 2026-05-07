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
}

internal fun updateDateConverterWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        val views = RemoteViews(context.packageName, R.layout.date_converter_widget)
    
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
    val displayDateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.US)
    val today = Date()
    val adDate = displayDateFormat.format(today)

    // Read from SharedPreferences
    val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
    var dataString = sharedPref.getString("date_converter_widget", "")
    if (dataString.isNullOrEmpty()) {
        val altPref = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
        dataString = altPref.getString("date_converter_widget", "")
    }
    var bsDate = "Open app to load"
    
    if (!dataString.isNullOrEmpty()) {
        try {
            val data = JSONObject(dataString)
            bsDate = data.optString("bsDate", bsDate)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    views.setTextViewText(R.id.ad_date, adDate)
    views.setTextViewText(R.id.bs_date, bsDate)
    
        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: Exception) {
        e.printStackTrace()
        try {
            val fallbackViews = RemoteViews(context.packageName, R.layout.date_converter_widget)
            fallbackViews.setTextViewText(R.id.ad_date, "Error loading")
            fallbackViews.setTextViewText(R.id.bs_date, "Tap to open app")
            appWidgetManager.updateAppWidget(appWidgetId, fallbackViews)
        } catch (ignored: Exception) {}
    }
}
