package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.graphics.BitmapFactory

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
    try {
        val views = RemoteViews(context.packageName, R.layout.horoscope_widget)
    
    // Deep linking intent (Open Tools tab)
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://(tabs)/converter"))
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
    val pendingIntent = PendingIntent.getActivity(
        context, 
        0, 
        intent, 
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

    // Read from SharedPreferences (like the blog shows)
    val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
    val dataString = sharedPref.getString("horoscope_widget", "")
    
    var zodiac = "Mesh"
    var horoscope = "Open app to see your horoscope"
    var imagePath = ""
    
    if (!dataString.isNullOrEmpty()) {
        try {
            val hData = org.json.JSONObject(dataString)
            zodiac = hData.optString("zodiac", "Mesh")
            horoscope = hData.optString("message", horoscope)
            imagePath = hData.optString("imagePath", "")
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    // Set background image if exists
    if (imagePath.isNotEmpty()) {
        try {
            val imgFile = java.io.File(imagePath)
            if (imgFile.exists()) {
                val bitmap = BitmapFactory.decodeFile(imgFile.absolutePath)
                views.setImageViewBitmap(R.id.widget_bg_image, bitmap)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    views.setTextViewText(R.id.zodiac_name, zodiac)
    views.setTextViewText(R.id.horoscope_text, horoscope)
    
        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: Exception) {
        e.printStackTrace()
        try {
            val fallbackViews = RemoteViews(context.packageName, R.layout.horoscope_widget)
            fallbackViews.setTextViewText(R.id.zodiac_name, "Error")
            fallbackViews.setTextViewText(R.id.horoscope_text, "Open app for horoscope")
            appWidgetManager.updateAppWidget(appWidgetId, fallbackViews)
        } catch (ignored: Exception) {}
    }
}
