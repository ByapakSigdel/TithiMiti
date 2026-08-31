package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class TodayDateWidget : BaseWidgetProvider() {
    override fun render(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        updateTodayDateWidget(context, appWidgetManager, appWidgetId)
    }
}

/**
 * Builds the Today widget's RemoteViews from the cached payload. The JS side
 * writes a `days` map (ISO date -> that day's BS data) covering a window ahead,
 * so this can render the *device's* current date at every refresh — the BS
 * date, tithi and event roll over at midnight without the app running. Older
 * payloads carried only a single day's fields; those are honored when they're
 * verifiably for today (`forDate`), otherwise the widget degrades to an honest
 * "open the app" state instead of showing yesterday's date.
 */
internal fun buildTodayDateViews(context: Context, appWidgetId: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.today_date_widget)
    views.setOnClickPendingIntent(
        R.id.widget_root,
        WidgetSupport.openAppIntent(context, appWidgetId, "tithimiti://(tabs)")
    )

    // Native, always-correct pieces: weekday + AD date from the device clock.
    val now = Date()
    val weekday = SimpleDateFormat("EEE", Locale.US).format(now).uppercase(Locale.US)
    val adShort = SimpleDateFormat("MMM d", Locale.US).format(now).uppercase(Locale.US)
    views.setTextViewText(R.id.kicker_label, "TODAY")
    views.setTextViewText(R.id.ad_date_label, "$weekday · $adShort")

    val todayIso = WidgetSupport.todayIso()
    val payload = WidgetSupport.readWidgetJson(context, "today_widget")

    // Prefer today's entry from the multi-day map; fall back to legacy
    // single-day fields only when they aren't provably stale.
    var day = payload?.optJSONObject("days")?.optJSONObject(todayIso)
    if (day == null && payload != null) {
        val forDate = payload.optString("forDate", "")
        if (forDate.isEmpty() || forDate == todayIso) {
            day = payload
        }
    }
    // An entry with no BS date carries nothing worth rendering — treat it as
    // missing so the honest fallback below shows instead of a bare "—" card.
    if (day != null && day.optString("bsDate", "").isEmpty()) {
        day = null
    }

    // The hero is Fraunces drawn in-process (launchers can't load our font
    // resources), auto-sized to this instance's width minus the card padding.
    val heroWidthDp = WidgetSupport.widgetWidthDp(context, appWidgetId, 180f) - 34f
    fun setHero(text: String) {
        views.setImageViewBitmap(
            R.id.bs_date_large,
            WidgetText.line(context, text, R.font.fraunces_semibold, 25f, 15f, heroWidthDp)
        )
        views.setContentDescription(R.id.bs_date_large, text)
    }

    if (day != null) {
        val bsDate = day.optString("bsDate", "")
        val bsDateNepali = day.optString("bsDateNepali", "")
        val tithi = day.optString("tithi", "")
        val sunrise = day.optString("sunrise", "")
        val sunset = day.optString("sunset", "")
        val event = day.optString("event", day.optString("todayEvent", ""))

        setHero(WidgetSupport.formatBsDateHero(bsDate))
        // Collapse the Nepali line when absent — an empty TextView still
        // measures a line and pushes the bottom rows down.
        if (bsDateNepali.isNotEmpty()) {
            views.setTextViewText(R.id.bs_date_nepali, bsDateNepali)
            views.setViewVisibility(R.id.bs_date_nepali, View.VISIBLE)
        } else {
            views.setViewVisibility(R.id.bs_date_nepali, View.GONE)
        }

        if (tithi.isNotEmpty()) {
            views.setTextViewText(R.id.tithi_text, tithi)
            views.setViewVisibility(R.id.tithi_row, View.VISIBLE)
        } else {
            views.setViewVisibility(R.id.tithi_row, View.GONE)
        }

        // The API phrases sun times in Nepali ("बिहानको ५:४२" — "morning 5:42").
        // The icons already say sunrise/sunset, so keep just the clock reading.
        fun tidyTime(raw: String): String = raw
            .replace("बिहानको", "").replace("साँझको", "")
            .replace("बिहान", "").replace("साँझ", "")
            .trim()

        val sunriseTidy = tidyTime(sunrise)
        val sunsetTidy = tidyTime(sunset)
        views.setTextViewText(R.id.sunrise_time, if (sunriseTidy.isNotEmpty()) sunriseTidy else "--:--")
        views.setTextViewText(R.id.sunset_time, if (sunsetTidy.isNotEmpty()) sunsetTidy else "--:--")

        if (event.isNotEmpty()) {
            views.setTextViewText(R.id.today_event_text, event)
            views.setViewVisibility(R.id.event_row, View.VISIBLE)
            views.setViewVisibility(R.id.no_event_text, View.GONE)
        } else {
            views.setViewVisibility(R.id.event_row, View.GONE)
            views.setTextViewText(R.id.no_event_text, "Nothing on today")
            views.setViewVisibility(R.id.no_event_text, View.VISIBLE)
        }
    } else {
        // No usable data for today: never show a wrong BS date. The AD side
        // above stays correct, and the card asks for one open to refresh.
        setHero("Namaste")
        views.setViewVisibility(R.id.bs_date_nepali, View.GONE)
        views.setViewVisibility(R.id.tithi_row, View.GONE)
        views.setTextViewText(R.id.sunrise_time, "--:--")
        views.setTextViewText(R.id.sunset_time, "--:--")
        views.setViewVisibility(R.id.event_row, View.GONE)
        views.setTextViewText(R.id.no_event_text, "Open TithiMiti to load today")
        views.setViewVisibility(R.id.no_event_text, View.VISIBLE)
    }

    return views
}

internal fun updateTodayDateWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        appWidgetManager.updateAppWidget(appWidgetId, buildTodayDateViews(context, appWidgetId))
    } catch (e: Exception) {
        Log.e("Widget:TodayDate", "Failed to update widget: ${e.message}")
    }
}
