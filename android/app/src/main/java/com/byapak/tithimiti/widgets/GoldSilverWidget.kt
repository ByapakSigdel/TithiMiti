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

        // Tapping opens the Tools tab.
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://(tabs)/converter"))
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        // Read prices from SharedPreferences (written by the JS side).
        val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
        var dataString = sharedPref.getString("gold_silver_widget", "")
        if (dataString.isNullOrEmpty()) {
            val altPref = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
            dataString = altPref.getString("gold_silver_widget", "")
        }
        var goldTola = ""
        var silverTola = ""
        if (!dataString.isNullOrEmpty()) {
            try {
                val prices = JSONObject(dataString)
                goldTola = prices.optString("goldHallmarkTola", "")
                silverTola = prices.optString("silverTola", "")
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // A real price is a non-empty numeric string greater than 0 (allowing commas/dots).
        fun isRealPrice(s: String): Boolean {
            if (s.isEmpty()) return false
            val digits = s.replace(",", "").replace(".", "")
            if (digits.isEmpty() || !digits.all { it.isDigit() }) return false
            return (digits.toLongOrNull() ?: 0L) > 0L
        }

        // Drop a trailing ".00"/".0" so the minimal card stays clean.
        fun tidy(s: String): String = s.removeSuffix(".00").removeSuffix(".0")

        if (isRealPrice(goldTola) && isRealPrice(silverTola)) {
            views.setTextViewText(R.id.gold_price, "Rs. ${tidy(goldTola)}")
            views.setTextViewText(R.id.silver_price, "Rs. ${tidy(silverTola)}")
        } else {
            views.setTextViewText(R.id.gold_price, "—")
            views.setTextViewText(R.id.silver_price, "—")
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
