package com.byapak.tithimiti.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import org.json.JSONObject

private const val ACTION_TOGGLE = "com.byapak.tithimiti.action.HOROSCOPE_TOGGLE"
private const val STATE_PREFS = "horoscope_widget_ui"
private fun stateKey(appWidgetId: Int) = "show_text_$appWidgetId"

class HoroscopeWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateHoroscopeWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle
    ) {
        updateHoroscopeWidget(context, appWidgetManager, appWidgetId)
    }

    // Tapping the widget sends ACTION_TOGGLE here: flip this widget's page state
    // and re-render. super.onReceive still dispatches APPWIDGET_UPDATE -> onUpdate.
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
    }
}

// Mood -> bundled gradient, used as the painting until a real Met painting
// has downloaded.
internal fun artResForMood(mood: String): Int = when (mood) {
    "fiery" -> R.drawable.horoscope_art_fiery
    "earthy" -> R.drawable.horoscope_art_earthy
    "watery" -> R.drawable.horoscope_art_watery
    "stormy" -> R.drawable.horoscope_art_stormy
    "radiant" -> R.drawable.horoscope_art_radiant
    else -> R.drawable.horoscope_art_airy
}

internal fun updateHoroscopeWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    try {
        val views = RemoteViews(context.packageName, R.layout.horoscope_widget)

        // Read the cached horoscope (written by the JS side). Try both shared-prefs
        // names to be resilient to a casing mismatch (WIDGET_DATA vs widget_data).
        var zodiac = "Mesh"
        var message = "Open Tools to load your horoscope"
        var mood = "airy"
        var imagePath = ""
        try {
            var dataString = context
                .getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
                .getString("horoscope_widget", "")
            if (dataString.isNullOrEmpty()) {
                dataString = context
                    .getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                    .getString("horoscope_widget", "")
            }
            if (!dataString.isNullOrEmpty()) {
                val obj = JSONObject(dataString)
                zodiac = obj.optString("zodiac", zodiac)
                message = obj.optString("message", message)
                mood = obj.optString("theme", obj.optString("mood", mood))
                imagePath = obj.optString("imagePath", "")
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Fill both pages.
        val painting = decodePainting(imagePath)
        if (painting != null) {
            views.setImageViewBitmap(R.id.painting_image, painting)
        } else {
            views.setImageViewResource(R.id.painting_image, artResForMood(mood))
        }
        views.setTextViewText(R.id.zodiac_label, "$zodiac · DAILY")
        views.setTextViewText(R.id.horoscope_text, message)

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

        appWidgetManager.updateAppWidget(appWidgetId, views)
    } catch (e: Exception) {
        e.printStackTrace()
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
        e.printStackTrace()
        null
    }
}
