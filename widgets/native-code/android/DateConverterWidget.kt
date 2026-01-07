package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import java.text.SimpleDateFormat
import java.util.*

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
    val views = RemoteViews(context.packageName, R.layout.date_converter_widget)
    
    val prefs = context.getSharedPreferences("RCTAsyncLocalStorage_V1", Context.MODE_PRIVATE)
    val todayBSKey = prefs.all.keys.find { it.contains("today-bs-date") }
    
    // Get current AD date
    val adDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val displayDateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.US)
    val today = Date()
    val adDate = displayDateFormat.format(today)
    
    var bsDate = "Loading..."
    if (todayBSKey != null) {
        bsDate = prefs.getString(todayBSKey, "N/A") ?: "N/A"
    }
    
    views.setTextViewText(R.id.ad_date, adDate)
    views.setTextViewText(R.id.bs_date, bsDate)
    
    appWidgetManager.updateAppWidget(appWidgetId, views)
}
