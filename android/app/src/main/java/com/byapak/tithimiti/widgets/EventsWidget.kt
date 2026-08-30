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
import java.util.Calendar
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
}

internal fun updateEventsWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    // Tapping opens the Events tab. Request code = appWidgetId so this
    // PendingIntent can never collide with another widget's.
    fun openEventsIntent(): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://(tabs)/events"))
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        return PendingIntent.getActivity(
            context,
            appWidgetId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
    try {
        val views = RemoteViews(context.packageName, R.layout.events_widget)
        views.setOnClickPendingIntent(R.id.widget_root, openEventsIntent())

        // Read the cached custom events (written by the JS side).
        val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
        var dataString = sharedPref.getString("user_events_widget", "")
        if (dataString.isNullOrEmpty()) {
            val altPref = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
            dataString = altPref.getString("user_events_widget", "")
        }

        var title = "No upcoming events"
        var dateLine = ""

        // Today at local midnight, used for the "in N days" hint and the upcoming filter.
        val today = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }
        val parser = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US)

        if (!dataString.isNullOrEmpty()) {
            try {
                val events = JSONObject(dataString).optJSONArray("events")
                var earliest: JSONObject? = null
                var earliestIso = ""
                if (events != null) {
                    for (i in 0 until events.length()) {
                        val ev = events.getJSONObject(i)
                        val iso = ev.optString("adDateISO", "")
                        if (iso.isEmpty()) continue
                        val d = try { parser.parse(iso) } catch (e: Exception) { null } ?: continue
                        val evMidnight = Calendar.getInstance().apply {
                            time = d
                            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                            set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                        }
                        // Upcoming = today or later. adDateISO is YYYY-MM-DD so the
                        // string compare picks the chronologically earliest one.
                        if (evMidnight.timeInMillis >= today.timeInMillis) {
                            if (earliestIso.isEmpty() || iso < earliestIso) {
                                earliest = ev
                                earliestIso = iso
                            }
                        }
                    }
                }

                if (earliest != null) {
                    title = earliest.optString("title", "Event")
                    val d = parser.parse(earliestIso)
                    if (d != null) {
                        val evMidnight = Calendar.getInstance().apply {
                            time = d
                            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                            set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                        }
                        val days = ((evMidnight.timeInMillis - today.timeInMillis) / 86400000L).toInt()
                        val relative = when {
                            days <= 0 -> "Today"
                            days == 1 -> "Tomorrow"
                            else -> "in $days days"
                        }
                        val shortDate = java.text.SimpleDateFormat("MMM d", Locale.US).format(d)
                        dateLine = "$shortDate · $relative"
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        views.setTextViewText(R.id.next_event_title, title)
        views.setTextViewText(R.id.next_event_date, dateLine)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: Exception) {
        e.printStackTrace()
        try {
            val fallbackViews = RemoteViews(context.packageName, R.layout.events_widget)
            fallbackViews.setTextViewText(R.id.next_event_title, "Open app to load events")
            fallbackViews.setTextViewText(R.id.next_event_date, "")
            // Keep the widget tappable in the error state — it tells the user
            // to open the app, so the tap must work.
            fallbackViews.setOnClickPendingIntent(R.id.widget_root, openEventsIntent())
            appWidgetManager.updateAppWidget(appWidgetId, fallbackViews)
        } catch (ignored: Exception) {}
    }
}
