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
import java.util.Locale

class EventsWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateEventsWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Enter relevant functionality for when the first widget is created
    }

    override fun onDisabled(context: Context) {
        // Enter relevant functionality for when the last widget is disabled
    }
}

internal fun updateEventsWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        // Construct the RemoteViews object
        val views = RemoteViews(context.packageName, R.layout.events_widget)
    
    // Deep linking intent (Open Events tab)
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://(tabs)/events"))
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
    val dataString = sharedPref.getString("user_events_widget", "")
    var eventCount = 0
    var nextEventTitle = "No upcoming events"
    var nextEventDate = ""
    val currentTime = System.currentTimeMillis()

    if (!dataString.isNullOrEmpty()) {
        try {
            val data = JSONObject(dataString)
            val userEvents = data.optJSONArray("events")
            
            // Filter for upcoming events only
            val upcomingEvents = mutableListOf<JSONObject>()
            if (userEvents != null) {
                for (i in 0 until userEvents.length()) {
                    val event = userEvents.getJSONObject(i)
                    val dateStr = event.optString("adDateISO", "")
                    if (dateStr.isNotEmpty()) {
                        try {
                            val eventDate = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(dateStr)
                            if (eventDate != null && eventDate.time >= currentTime - 86400000) { // Include today
                                upcomingEvents.add(event)
                            }
                        } catch (e: Exception) {
                            // Invalid date, skip
                        }
                    }
                }
            }
            
            eventCount = upcomingEvents.size
            if (upcomingEvents.isNotEmpty()) {
                val firstEvent = upcomingEvents[0]
                nextEventTitle = firstEvent.optString("title", "Event")
                nextEventDate = firstEvent.optString("adDateISO", "")
                // Format date nicely
                if (nextEventDate.isNotEmpty()) {
                    try {
                        val dateFormat = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US)
                        val displayFormat = java.text.SimpleDateFormat("MMM dd, yyyy", Locale.US)
                        val date = dateFormat.parse(nextEventDate)
                        if (date != null) {
                            nextEventDate = displayFormat.format(date)
                        }
                    } catch (e: Exception) {
                        // Keep original format
                    }
                }
            } else {
                nextEventTitle = "No upcoming events"
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    views.setTextViewText(R.id.event_count, eventCount.toString())
    views.setTextViewText(R.id.next_event_title, nextEventTitle)
    views.setTextViewText(R.id.next_event_date, nextEventDate)

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: Exception) {
        e.printStackTrace()
        try {
            val fallbackViews = RemoteViews(context.packageName, R.layout.events_widget)
            fallbackViews.setTextViewText(R.id.event_count, "0")
            fallbackViews.setTextViewText(R.id.next_event_title, "Error loading events")
            fallbackViews.setTextViewText(R.id.next_event_date, "Tap to open app")
            appWidgetManager.updateAppWidget(appWidgetId, fallbackViews)
        } catch (ignored: Exception) {}
    }
}
