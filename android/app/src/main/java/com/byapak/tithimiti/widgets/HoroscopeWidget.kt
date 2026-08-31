package com.byapak.tithimiti.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import java.util.Locale

private const val ACTION_TOGGLE = "com.byapak.tithimiti.action.HOROSCOPE_TOGGLE"
private const val STATE_PREFS = "horoscope_widget_ui"
private fun stateKey(appWidgetId: Int) = "show_text_$appWidgetId"

class HoroscopeWidget : BaseWidgetProvider() {
    override fun render(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        updateHoroscopeWidget(context, appWidgetManager, appWidgetId)
    }

    // Tapping the widget sends ACTION_TOGGLE here: flip this widget's page state
    // and re-render. super (BaseWidgetProvider) still handles the update and
    // clock-change actions.
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_TOGGLE) {
            val appWidgetId = intent.getIntExtra(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            )
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                val prefs = context.getSharedPreferences(STATE_PREFS, Context.MODE_PRIVATE)
                val showText = prefs.getBoolean(stateKey(appWidgetId), false)
                prefs.edit().putBoolean(stateKey(appWidgetId), !showText).apply()
                updateHoroscopeWidget(context, AppWidgetManager.getInstance(context), appWidgetId)
            }
        }
        super.onReceive(context, intent)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences(STATE_PREFS, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        for (id in appWidgetIds) editor.remove(stateKey(id))
        editor.apply()
        super.onDeleted(context, appWidgetIds)
    }
}

// Mood -> bundled gradient, used as the painting until a real Met painting
// for today's mood has downloaded.
internal fun artResForMood(mood: String): Int = when (mood) {
    "fiery" -> R.drawable.horoscope_art_fiery
    "earthy" -> R.drawable.horoscope_art_earthy
    "watery" -> R.drawable.horoscope_art_watery
    "stormy" -> R.drawable.horoscope_art_stormy
    "radiant" -> R.drawable.horoscope_art_radiant
    else -> R.drawable.horoscope_art_airy
}

/**
 * Builds the horoscope RemoteViews. The JS side precomputes the coming days'
 * readings into a `byDate` map (the generator is deterministic and local), so
 * the reading rolls over at midnight without the app running. The downloaded
 * painting is only shown while it still matches today's date + mood; otherwise
 * the bundled mood gradient stands in until the app refreshes the art.
 */
internal fun buildHoroscopeViews(context: Context, appWidgetId: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.horoscope_widget)

    var zodiac = "Mesh"
    var message = "Open Tools to load your horoscope"
    var mood = "airy"
    var imagePath = ""
    var imageDate = ""
    var imageMood = ""

    val todayIso = WidgetSupport.todayIso()
    WidgetSupport.readWidgetJson(context, "horoscope_widget")?.let { obj ->
        zodiac = obj.optString("zodiac", zodiac)
        imagePath = obj.optString("imagePath", "")
        imageDate = obj.optString("imageDate", "")
        imageMood = obj.optString("imageMood", "")

        val day = obj.optJSONObject("byDate")?.optJSONObject(todayIso)
        if (day != null) {
            message = day.optString("message", message)
            mood = day.optString("mood", mood)
        } else {
            message = obj.optString("message", message)
            mood = obj.optString("theme", obj.optString("mood", mood))
        }
    }

    // The painting: only trust a downloaded image that matches today's mood.
    // Legacy payloads carry no imageDate/imageMood — keep their old behavior.
    val imageIsCurrent = (imageDate.isEmpty() && imageMood.isEmpty()) ||
        (imageDate == todayIso && imageMood == mood)
    val painting = if (imageIsCurrent) decodePainting(imagePath) else null
    if (painting != null) {
        views.setImageViewBitmap(R.id.painting_image, painting)
    } else {
        views.setImageViewResource(R.id.painting_image, artResForMood(mood))
    }

    views.setTextViewText(R.id.zodiac_pill_text, zodiac.uppercase(Locale.US))
    views.setTextViewText(R.id.zodiac_label, "$zodiac · DAILY")

    // The reading is Fraunces drawn in-process (launchers can't load our font
    // resources), auto-sized to this instance's page area. The chrome around it
    // (padding, kicker, margins, hint) totals ~74dp of the widget's height.
    val readingWidthDp = WidgetSupport.widgetWidthDp(context, appWidgetId, 200f) - 36f
    val readingHeightDp = WidgetSupport.widgetHeightDp(context, appWidgetId, 200f) - 74f
    views.setImageViewBitmap(
        R.id.horoscope_text,
        WidgetText.paragraph(
            context, message, R.font.fraunces_regular,
            readingWidthDp, readingHeightDp.coerceAtLeast(40f),
            21f, 11f, 4f
        )
    )
    views.setContentDescription(R.id.horoscope_text, message)

    // Show whichever page this widget is currently flipped to.
    val showText = context
        .getSharedPreferences(STATE_PREFS, Context.MODE_PRIVATE)
        .getBoolean(stateKey(appWidgetId), false)
    views.setViewVisibility(R.id.painting_page, if (showText) View.GONE else View.VISIBLE)
    views.setViewVisibility(R.id.text_page, if (showText) View.VISIBLE else View.GONE)

    // Tapping anywhere flips the page. Broadcast explicitly back to this
    // provider; the unique data URI keeps each widget's intent distinct.
    val toggleIntent = Intent(context, HoroscopeWidget::class.java).apply {
        action = ACTION_TOGGLE
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        data = Uri.parse("tithimiti://horoscope/$appWidgetId")
    }
    val pi = PendingIntent.getBroadcast(
        context,
        appWidgetId,
        toggleIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    views.setOnClickPendingIntent(R.id.widget_root, pi)

    return views
}

internal fun updateHoroscopeWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        appWidgetManager.updateAppWidget(appWidgetId, buildHoroscopeViews(context, appWidgetId))
    } catch (e: Exception) {
        Log.e("Widget:Horoscope", "Failed to update widget: ${e.message}")
    }
}

// Decode the downloaded Met painting (if any) into a modest bitmap. Kept small
// (RGB_565, capped dimension) so it stays well under the RemoteViews bitmap
// transaction limit.
private fun decodePainting(imagePath: String): Bitmap? {
    if (imagePath.isEmpty()) return null
    return try {
        val cleanPath = if (imagePath.startsWith("file://")) {
            Uri.parse(imagePath).path ?: imagePath.removePrefix("file://")
        } else {
            imagePath
        }
        val imgFile = java.io.File(cleanPath)
        if (!imgFile.exists()) return null

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(imgFile.absolutePath, bounds)
        val maxDim = 512
        var sample = 1
        while (bounds.outWidth / sample > maxDim || bounds.outHeight / sample > maxDim) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.RGB_565
        }
        BitmapFactory.decodeFile(imgFile.absolutePath, opts)
    } catch (e: Exception) {
        null
    }
}
