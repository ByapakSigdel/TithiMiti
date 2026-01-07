package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.byapak.tithimiti.R

class HoroscopeWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateHoroscopeWidget(context, appWidgetManager, appWidgetId)
        }
    }
}

internal fun updateHoroscopeWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    val views = RemoteViews(context.packageName, R.layout.horoscope_widget)
    
    val prefs = context.getSharedPreferences("RCTAsyncLocalStorage_V1", Context.MODE_PRIVATE)
    val zodiacKey = prefs.all.keys.find { it.contains("selected-zodiac") }
    
    var zodiac = "Mesh"
    var horoscope = "Open app to see your horoscope"
    
    if (zodiacKey != null) {
        zodiac = prefs.getString(zodiacKey, "Mesh") ?: "Mesh"
    }
    
    // Get daily horoscope from cache
    val horoscopeKey = prefs.all.keys.find { it.contains("daily-horoscope") }
    if (horoscopeKey != null) {
        horoscope = prefs.getString(horoscopeKey, horoscope) ?: horoscope
    }
    
    views.setTextViewText(R.id.zodiac_name, zodiac)
    views.setTextViewText(R.id.horoscope_text, horoscope)
    
    appWidgetManager.updateAppWidget(appWidgetId, views)
}
