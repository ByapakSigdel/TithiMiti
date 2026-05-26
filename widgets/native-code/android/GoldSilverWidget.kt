package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import org.json.JSONObject
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri

class GoldSilverWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateGoldSilverWidget(context, appWidgetManager, appWidgetId)
        }
    }
}

internal fun updateGoldSilverWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        val views = RemoteViews(context.packageName, R.layout.gold_silver_widget)
    
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

    // Read from SharedPreferences
    val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
    var dataString = sharedPref.getString("gold_silver_widget", "")
    if (dataString.isNullOrEmpty()) {
        val altPref = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
        dataString = altPref.getString("gold_silver_widget", "")
    }
    var goldTola = ""
    var silverTola = ""
    var date = ""

    if (!dataString.isNullOrEmpty()) {
        try {
            val prices = JSONObject(dataString)
            goldTola = prices.optString("goldHallmarkTola", "")
            silverTola = prices.optString("silverTola", "")
            date = prices.optString("date", "")
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // A real price is a non-empty numeric string greater than 0 (allowing commas/dots)
    fun isRealPrice(s: String): Boolean {
        if (s.isEmpty()) return false
        val digits = s.replace(",", "").replace(".", "")
        if (digits.isEmpty() || !digits.all { it.isDigit() }) return false
        return (digits.toLongOrNull() ?: 0L) > 0L
    }

    if (isRealPrice(goldTola) && isRealPrice(silverTola)) {
        views.setTextViewText(R.id.gold_price, "Rs. $goldTola")
        views.setTextViewText(R.id.silver_price, "Rs. $silverTola")
        views.setTextViewText(R.id.updated_date, if (date.isNotEmpty()) date else "Updated")
    } else {
        views.setTextViewText(R.id.gold_price, "—")
        views.setTextViewText(R.id.silver_price, "—")
        views.setTextViewText(R.id.updated_date, "Open Tools to sync")
    }
    
        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: Exception) {
        e.printStackTrace()
        try {
            val fallbackViews = RemoteViews(context.packageName, R.layout.gold_silver_widget)
            fallbackViews.setTextViewText(R.id.gold_price, "Error")
            fallbackViews.setTextViewText(R.id.silver_price, "Error")
            fallbackViews.setTextViewText(R.id.updated_date, "Open app")
            appWidgetManager.updateAppWidget(appWidgetId, fallbackViews)
        } catch (ignored: Exception) {}
    }
}
