package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import org.json.JSONObject

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
    val views = RemoteViews(context.packageName, R.layout.gold_silver_widget)
    
    val prefs = context.getSharedPreferences("RCTAsyncLocalStorage_V1", Context.MODE_PRIVATE)
    val goldSilverDataKey = prefs.all.keys.find { it.contains("gold-silver-cache") }
    
    if (goldSilverDataKey != null) {
        val jsonString = prefs.getString(goldSilverDataKey, "{}")
        try {
            val data = JSONObject(jsonString ?: "{}")
            val goldTola = data.optString("goldHallmarkTola", "N/A")
            val silverTola = data.optString("silverTola", "N/A")
            val date = data.optString("date", "")
            
            views.setTextViewText(R.id.gold_price, "₨$goldTola")
            views.setTextViewText(R.id.silver_price, "₨$silverTola")
            views.setTextViewText(R.id.updated_date, date)
        } catch (e: Exception) {
            views.setTextViewText(R.id.gold_price, "N/A")
            views.setTextViewText(R.id.silver_price, "N/A")
        }
    } else {
        views.setTextViewText(R.id.gold_price, "Loading...")
        views.setTextViewText(R.id.silver_price, "Loading...")
    }
    
    appWidgetManager.updateAppWidget(appWidgetId, views)
}
