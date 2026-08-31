package com.byapak.tithimiti.widgets

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import androidx.core.content.res.ResourcesCompat
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

/**
 * Renders text set in the bundled Fraunces faces into white-on-transparent
 * bitmaps for RemoteViews.
 *
 * Why: a home-screen widget's layout is inflated in the *launcher's* process,
 * which cannot load `@font/` resources from this app's APK — `fontFamily`
 * silently falls back to Roboto out there (the in-app preview looked right
 * because it inflates in our own process). So every piece of display-serif
 * text is drawn here, in our process, and shipped as a bitmap. The bitmaps are
 * pure white so the layout can tint them with theme-aware `@color/widget_*`
 * tokens — the launcher re-resolves the tint when the system theme flips, and
 * the text recolors without a re-render.
 */
internal object WidgetText {

    private fun font(context: Context, fontRes: Int): Typeface = try {
        ResourcesCompat.getFont(context, fontRes) ?: Typeface.SERIF
    } catch (e: Exception) {
        Typeface.SERIF
    }

    /**
     * A single line, auto-sized down from [maxSp] until it fits [maxWidthDp]
     * (never below [minSp]; hard-clipped at the bitmap edge past that).
     */
    fun line(
        context: Context,
        text: String,
        fontRes: Int,
        maxSp: Float,
        minSp: Float,
        maxWidthDp: Float
    ): Bitmap {
        val dm = context.resources.displayMetrics
        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            typeface = font(context, fontRes)
        }
        val maxWidthPx = maxWidthDp * dm.density
        var sp = maxSp
        while (sp > minSp) {
            paint.textSize = sp * dm.scaledDensity
            if (paint.measureText(text) <= maxWidthPx) break
            sp -= 1f
        }
        paint.textSize = sp * dm.scaledDensity

        val fm = paint.fontMetricsInt
        val width = ceil(min(paint.measureText(text), maxWidthPx).toDouble()).toInt().coerceAtLeast(1)
        val height = (fm.descent - fm.ascent).coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        bitmap.density = dm.densityDpi
        Canvas(bitmap).drawText(text, 0f, -fm.ascent.toFloat(), paint)
        return bitmap
    }

    /**
     * A multi-line paragraph, auto-sized down from [maxSp] until it fits the
     * given box; ellipsized at [minSp] if it still overflows.
     */
    fun paragraph(
        context: Context,
        text: String,
        fontRes: Int,
        widthDp: Float,
        heightDp: Float,
        maxSp: Float,
        minSp: Float,
        lineSpacingExtraDp: Float
    ): Bitmap {
        val dm = context.resources.displayMetrics
        val widthPx = (widthDp * dm.density).toInt().coerceAtLeast(1)
        val heightPx = (heightDp * dm.density).toInt().coerceAtLeast(1)
        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            typeface = font(context, fontRes)
        }
        val extraPx = lineSpacingExtraDp * dm.density

        fun build(maxLines: Int?): StaticLayout {
            val builder = StaticLayout.Builder
                .obtain(text, 0, text.length, paint, widthPx)
                .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                .setLineSpacing(extraPx, 1f)
                .setIncludePad(false)
            if (maxLines != null) {
                builder.setMaxLines(maxLines).setEllipsize(TextUtils.TruncateAt.END)
            }
            return builder.build()
        }

        var sp = maxSp
        paint.textSize = sp * dm.scaledDensity
        var layout = build(null)
        while (sp > minSp && layout.height > heightPx) {
            sp -= 1f
            paint.textSize = sp * dm.scaledDensity
            layout = build(null)
        }
        if (layout.height > heightPx && layout.lineCount > 1) {
            val lineHeight = layout.height / layout.lineCount
            layout = build(max(1, heightPx / max(1, lineHeight)))
        }

        val bitmapHeight = min(layout.height, heightPx).coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(widthPx, bitmapHeight, Bitmap.Config.ARGB_8888)
        bitmap.density = dm.densityDpi
        layout.draw(Canvas(bitmap))
        return bitmap
    }
}
