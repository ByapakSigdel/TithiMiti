package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import android.widget.RemoteViews
import com.byapak.tithimiti.R

class GoldSilverWidget : BaseWidgetProvider() {
    override fun render(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        updateGoldSilverWidget(context, appWidgetManager, appWidgetId)
    }
}

/** Builds the metal-prices RemoteViews from the cached payload. */
internal fun buildGoldSilverViews(context: Context, appWidgetId: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.gold_silver_widget)
    views.setOnClickPendingIntent(
        R.id.widget_root,
        WidgetSupport.openAppIntent(context, appWidgetId, "tithimiti://(tabs)/converter")
    )

    var goldTola = ""
    var silverTola = ""
    WidgetSupport.readWidgetJson(context, "gold_silver_widget")?.let { prices ->
        goldTola = prices.optString("goldHallmarkTola", "")
        silverTola = prices.optString("silverTola", "")
    }

    // A real price is a non-empty numeric string greater than 0 (allowing commas/dots).
    fun isRealPrice(s: String): Boolean {
        if (s.isEmpty()) return false
        val digits = s.replace(",", "").replace(".", "")
        if (digits.isEmpty() || !digits.all { it.isDigit() }) return false
        return (digits.toLongOrNull() ?: 0L) > 0L
    }

    // Drop a trailing ".00"/".0" so the row stays clean.
    fun tidy(s: String): String = s.removeSuffix(".00").removeSuffix(".0")

    if (isRealPrice(goldTola) && isRealPrice(silverTola)) {
        views.setTextViewText(R.id.gold_price, "Rs. ${tidy(goldTola)}")
        views.setTextViewText(R.id.silver_price, "Rs. ${tidy(silverTola)}")
    } else {
        views.setTextViewText(R.id.gold_price, "—")
        views.setTextViewText(R.id.silver_price, "—")
    }

    return views
}

internal fun updateGoldSilverWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        appWidgetManager.updateAppWidget(appWidgetId, buildGoldSilverViews(context, appWidgetId))
    } catch (e: Exception) {
        Log.e("Widget:GoldSilver", "Failed to update widget: ${e.message}")
    }
}
