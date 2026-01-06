package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import org.json.JSONObject

class EventsWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Enter relevant functionality for when the first widget is created
    }

    override fun onDisabled(context: Context) {
        // Enter relevant functionality for when the last widget is disabled
    }
}

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    // Construct the RemoteViews object
    val views = RemoteViews(context.packageName, R.layout.events_widget)
    
    // Fetch data from SharedPreferences (shared with React Native)
    val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
    val jsonString = prefs.getString("events_data", "{}")
    val data = JSONObject(jsonString ?: "{}")

    val dateText = data.optString("date", "Loading...")
    val eventText = data.optString("event", "No events")

    views.setTextViewText(R.id.appwidget_date, dateText)
    views.setTextViewText(R.id.appwidget_event, eventText)

    // Instruct the widget manager to update the widget
    appWidgetManager.updateAppWidget(appWidgetId, views)
}
