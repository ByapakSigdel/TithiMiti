package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class EventsWidget : BaseWidgetProvider() {
    override fun render(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        updateEventsWidget(context, appWidgetManager, appWidgetId)
    }
}

/**
 * Builds the next-event RemoteViews. The JS side stores the full upcoming list;
 * this re-filters against the device clock and picks the earliest, so the
 * widget stays correct after midnight (the base provider's alarm re-renders it)
 * even when the app hasn't been opened.
 */
internal fun buildEventsViews(context: Context, appWidgetId: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.events_widget)
    views.setOnClickPendingIntent(
        R.id.widget_root,
        WidgetSupport.openAppIntent(context, appWidgetId, "tithimiti://(tabs)/events")
    )

    // Today at local midnight, for the upcoming filter and the "in N days" hint.
    val today = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    var earliest: JSONObject? = null
    var earliestIso = ""
    try {
        val events = WidgetSupport.readWidgetJson(context, "user_events_widget")
            ?.optJSONArray("events")
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
                // Upcoming = today or later; ISO strings compare chronologically.
                if (evMidnight.timeInMillis >= today.timeInMillis) {
                    if (earliestIso.isEmpty() || iso < earliestIso) {
                        earliest = ev
                        earliestIso = iso
                    }
                }
            }
        }
    } catch (e: Exception) {
        Log.w("Widget:Events", "Bad user_events_widget payload: ${e.message}")
    }

    if (earliest != null) {
        val d = try { parser.parse(earliestIso) } catch (e: Exception) { null }
        var isToday = false
        var dayNum = ""
        var monthShort = ""
        var dateLine = ""
        if (d != null) {
            val evMidnight = Calendar.getInstance().apply {
                time = d
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }
            val days = ((evMidnight.timeInMillis - today.timeInMillis) / 86400000L).toInt()
            isToday = days <= 0
            val relative = when {
                days <= 0 -> "Today"
                days == 1 -> "Tomorrow"
                else -> "in $days days"
            }
            dayNum = SimpleDateFormat("d", Locale.US).format(d)
            monthShort = SimpleDateFormat("MMM", Locale.US).format(d).uppercase(Locale.US)
            dateLine = "${SimpleDateFormat("MMM d", Locale.US).format(d)} · $relative"
        }

        views.setTextViewText(R.id.events_kicker, "NEXT EVENT")
        views.setTextViewText(R.id.next_event_title, earliest.optString("title", "Event"))
        views.setTextViewText(R.id.next_event_date, dateLine)

        // Date-box variants (normal / today / empty) are separate views so all
        // colors stay in XML and survive a system theme flip. The Fraunces day
        // numeral is drawn in-process (launchers can't load our fonts) and
        // tinted by each variant's XML tint.
        val dayBitmap = WidgetText.line(context, dayNum, R.font.fraunces_semibold, 19f, 12f, 40f)
        views.setViewVisibility(R.id.date_box_empty, View.GONE)
        if (isToday) {
            views.setImageViewBitmap(R.id.event_day_today, dayBitmap)
            views.setContentDescription(R.id.event_day_today, dayNum)
            views.setTextViewText(R.id.event_month_today, monthShort)
            views.setViewVisibility(R.id.date_box_today, View.VISIBLE)
            views.setViewVisibility(R.id.date_box, View.GONE)
        } else {
            views.setImageViewBitmap(R.id.event_day, dayBitmap)
            views.setContentDescription(R.id.event_day, dayNum)
            views.setTextViewText(R.id.event_month, monthShort)
            views.setViewVisibility(R.id.date_box, View.VISIBLE)
            views.setViewVisibility(R.id.date_box_today, View.GONE)
        }
    } else {
        views.setTextViewText(R.id.events_kicker, "MY EVENTS")
        views.setTextViewText(R.id.next_event_title, "No upcoming events")
        views.setTextViewText(R.id.next_event_date, "Tap to add one")
        views.setViewVisibility(R.id.date_box, View.GONE)
        views.setViewVisibility(R.id.date_box_today, View.GONE)
        views.setViewVisibility(R.id.date_box_empty, View.VISIBLE)
    }

    return views
}

internal fun updateEventsWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        appWidgetManager.updateAppWidget(appWidgetId, buildEventsViews(context, appWidgetId))
    } catch (e: Exception) {
        Log.e("Widget:Events", "Failed to update widget: ${e.message}")
    }
}
