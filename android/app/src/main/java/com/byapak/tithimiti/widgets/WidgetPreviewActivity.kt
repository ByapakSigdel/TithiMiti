package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.util.TypedValue
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RemoteViews
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.byapak.tithimiti.R
import org.json.JSONObject

/**
 * Developer preview: renders every widget's real RemoteViews (same builders the
 * providers use) at realistic sizes, toggling between light and dark theme, and
 * can pin live instances to the launcher. Gated behind the Date Converter
 * easter egg so it stays out of normal users' way.
 */
class WidgetPreviewActivity : AppCompatActivity() {

    private val TAG = "WidgetPreview"
    private var nightPreview = false

    // Never 0 — AppWidgetManager.INVALID_APPWIDGET_ID is 0, and the horoscope
    // toggle (rightly) ignores it. A real launcher never assigns this id.
    private val previewWidgetId = 999999

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.widget_preview_activity)

        val container = findViewById<LinearLayout>(R.id.preview_container)
        val lockedMessage = findViewById<TextView>(R.id.locked_message)

        findViewById<Button>(R.id.open_app_button).setOnClickListener {
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://(tabs)")))
            } catch (e: Exception) {
                Log.w(TAG, "Could not open app: ${e.message}")
            }
        }
        findViewById<Button>(R.id.refresh_button).setOnClickListener {
            renderPreview(container, lockedMessage)
        }
        findViewById<Button>(R.id.theme_button).setOnClickListener { button ->
            nightPreview = !nightPreview
            (button as Button).text = if (nightPreview) "Light" else "Dark"
            renderPreview(container, lockedMessage)
        }
        findViewById<Button>(R.id.pin_button).setOnClickListener { pinAllWidgets() }

        renderPreview(container, lockedMessage)
    }

    private fun isAccessAllowed(): Boolean {
        try {
            var dataString = getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
                .getString("date_converter_widget", "")
            if (dataString.isNullOrEmpty()) {
                dataString = getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                    .getString("date_converter_widget", "")
            }
            if (!dataString.isNullOrEmpty()) {
                return JSONObject(dataString).optString("bsDate", "") == "2060/03/24"
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking access: ${e.message}")
        }
        return false
    }

    /** Context whose resources resolve for the previewed theme. */
    private fun previewContext(): Context {
        val config = Configuration(resources.configuration)
        config.uiMode = (config.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or
            (if (nightPreview) Configuration.UI_MODE_NIGHT_YES else Configuration.UI_MODE_NIGHT_NO)
        return createConfigurationContext(config)
    }

    private fun dp(value: Float): Int = TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP, value, resources.displayMetrics
    ).toInt()

    private fun renderPreview(container: LinearLayout, lockedMessage: TextView) {
        container.removeAllViews()
        if (!isAccessAllowed()) {
            lockedMessage.visibility = View.VISIBLE
            return
        }
        lockedMessage.visibility = View.GONE

        val themed = previewContext()
        findViewById<View>(R.id.preview_root)
            .setBackgroundColor(themed.getColor(R.color.widget_background))

        fun addPreview(label: String, views: RemoteViews, widthDp: Float, heightDp: Float) {
            val caption = TextView(this)
            caption.text = label
            caption.setTextColor(themed.getColor(R.color.widget_text_secondary))
            caption.textSize = 12f
            val capParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
            capParams.topMargin = dp(18f)
            capParams.bottomMargin = dp(6f)
            container.addView(caption, capParams)

            try {
                val view = views.apply(themed, container)
                container.addView(view, LinearLayout.LayoutParams(dp(widthDp), dp(heightDp)))
            } catch (e: Exception) {
                Log.e(TAG, "Failed to render $label: ${e.message}")
            }
        }

        addPreview("Today · 2×3", buildTodayDateViews(this, previewWidgetId), 170f, 195f)
        addPreview("Next event · 2×1", buildEventsViews(this, previewWidgetId), 260f, 74f)
        addPreview("Gold & silver · 2×1", buildGoldSilverViews(this, previewWidgetId), 260f, 74f)
        addPreview("Horoscope · 3×3 (tap it, then Refresh, to flip)", buildHoroscopeViews(this, previewWidgetId), 230f, 230f)
    }

    /** Ask the launcher to pin one of each widget (Android 8+, needs a tap per dialog). */
    private fun pinAllWidgets() {
        val manager = AppWidgetManager.getInstance(this)
        if (!manager.isRequestPinAppWidgetSupported) {
            Toast.makeText(this, "Launcher doesn't support pinning", Toast.LENGTH_SHORT).show()
            return
        }
        val providers = listOf(
            TodayDateWidget::class.java,
            EventsWidget::class.java,
            GoldSilverWidget::class.java,
            HoroscopeWidget::class.java
        )
        for (provider in providers) {
            try {
                manager.requestPinAppWidget(ComponentName(this, provider), null, null)
            } catch (e: Exception) {
                Log.w(TAG, "Pin failed for ${provider.simpleName}: ${e.message}")
            }
        }
    }
}
