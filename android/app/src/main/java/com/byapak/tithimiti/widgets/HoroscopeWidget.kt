package com.byapak.tithimiti.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.widget.RemoteViews
import com.byapak.tithimiti.R
import org.json.JSONObject

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
}

// Mood -> bundled gradient, used as the backdrop until a real Met painting
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

        views.setTextViewText(R.id.zodiac_name, zodiac)
        views.setTextViewText(R.id.horoscope_text, message)

        // Backdrop: the downloaded Met painting if present, else the mood gradient.
        val painting = decodePainting(imagePath)
        if (painting != null) {
            views.setImageViewBitmap(R.id.art_row, painting)
        } else {
            views.setImageViewResource(R.id.art_row, artResForMood(mood))
        }

        // Tapping the widget opens the Tools/converter screen. Target MainActivity
        // directly (it handles the tithimiti:// deep link).
        val clickIntent = Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://(tabs)/converter"))
        clickIntent.setClassName(context, "com.byapak.tithimiti.MainActivity")
        clickIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        val pi = PendingIntent.getActivity(
            context,
            appWidgetId,
            clickIntent,
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
        // Stored as a file:// URI (expo documentDirectory); File needs a plain path.
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
