package com.byapak.tithimiti.widgets

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.byapak.tithimiti.R
import org.json.JSONObject

class WidgetPreviewActivity : AppCompatActivity() {

    private val TAG = "WidgetPreview"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.widget_preview_activity)

        val container = findViewById<FrameLayout>(R.id.preview_container)
        val lockedMessage = findViewById<TextView>(R.id.locked_message)
        val openAppButton = findViewById<Button>(R.id.open_app_button)
        val refreshButton = findViewById<Button>(R.id.refresh_button)

        openAppButton.setOnClickListener {
            // Open main app via deep link
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tithimiti://("))
            startActivity(intent)
        }

        refreshButton.setOnClickListener {
            renderPreview(container, lockedMessage)
        }

        renderPreview(container, lockedMessage)
    }

    private fun isAccessAllowed(): Boolean {
        try {
            val sharedPref = getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
            var dataString = sharedPref.getString("date_converter_widget", "")
            if (dataString.isNullOrEmpty()) {
                val altPref = getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                dataString = altPref.getString("date_converter_widget", "")
            }

            if (!dataString.isNullOrEmpty()) {
                val obj = JSONObject(dataString)
                val bsDate = obj.optString("bsDate", "")
                Log.d(TAG, "date_converter_widget bsDate=$bsDate")
                return bsDate == "2060/03/24"
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking access: ${e.message}")
        }
        return false
    }

    private fun renderPreview(container: FrameLayout, lockedMessage: TextView) {
        container.removeAllViews()
        if (!isAccessAllowed()) {
            lockedMessage.visibility = View.VISIBLE
            return
        }

        lockedMessage.visibility = View.GONE

        // Inflate the widget layout directly and populate fields using today_widget data
        val inflater = LayoutInflater.from(this)
        val widgetView = inflater.inflate(R.layout.today_date_widget, container, false)

        try {
            val sharedPref = getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
            var dataString = sharedPref.getString("today_widget", "")
            if (dataString.isNullOrEmpty()) {
                val altPref = getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                dataString = altPref.getString("today_widget", "")
            }

            var bsDate = "2082/9/24"
            var bsDateNepali = ""
            var tithi = "N/A"
            var sunrise = "--:--"
            var sunset = "--:--"

            if (!dataString.isNullOrEmpty()) {
                try {
                    val todayData = JSONObject(dataString)
                    bsDate = todayData.optString("bsDate", bsDate)
                    bsDateNepali = todayData.optString("bsDateNepali", "")
                    tithi = todayData.optString("tithi", tithi)
                    sunrise = todayData.optString("sunrise", sunrise)
                    sunset = todayData.optString("sunset", sunset)
                } catch (e: Exception) {
                    Log.w(TAG, "Malformed today_widget JSON: ${e.message}")
                }
            }

            val bsLarge = widgetView.findViewById<TextView>(R.id.bs_date_large)
            val bsNep = widgetView.findViewById<TextView>(R.id.bs_date_nepali)
            val adDate = widgetView.findViewById<TextView>(R.id.ad_date_text)
            val tithiTv = widgetView.findViewById<TextView>(R.id.tithi_text)
            val sunriseTv = widgetView.findViewById<TextView>(R.id.sunrise_time)
            val sunsetTv = widgetView.findViewById<TextView>(R.id.sunset_time)

            bsLarge.text = bsDate
            if (bsDateNepali.isNotEmpty()) bsNep.text = bsDateNepali

            // Use AD date from system
            val today = java.util.Date()
            val adDateFormat = java.text.SimpleDateFormat("MMMM dd, yyyy", java.util.Locale.getDefault())
            adDate.text = adDateFormat.format(today)

            tithiTv.text = tithi
            sunriseTv.text = sunrise
            sunsetTv.text = sunset

        } catch (e: Exception) {
            Log.e(TAG, "Error rendering preview: ${e.message}")
        }

        container.addView(widgetView)
    }
}
