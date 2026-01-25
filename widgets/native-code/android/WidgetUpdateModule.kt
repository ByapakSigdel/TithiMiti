package com.byapak.tithimiti.widgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback

class WidgetUpdateModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "WidgetData"
    }

    @ReactMethod
    fun setData(key: String, data: String, callback: Callback) {
        val context: Context = reactApplicationContext
        // Write to both names to be resilient to casing mismatch (WIDGET_DATA vs widget_data)
        val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
        val altPref = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
        val editor = sharedPref.edit()
        editor.putString(key, data)
        editor.apply()
        try {
            val altEditor = altPref.edit()
            altEditor.putString(key, data)
            altEditor.apply()
        } catch (e: Exception) {
            // ignore
        }
        
        // Trigger widget updates
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val widgets = listOf(
            EventsWidget::class.java,
            GoldSilverWidget::class.java,
            HoroscopeWidget::class.java,
            DateConverterWidget::class.java,
            TodayDateWidget::class.java
        )
        
        for (widgetClass in widgets) {
            val ids = appWidgetManager.getAppWidgetIds(ComponentName(context, widgetClass))
            if (ids.isNotEmpty()) {
                val intent = Intent(context, widgetClass)
                intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                context.sendBroadcast(intent)
            }
        }
        
        callback.invoke("Success")
    }
    
    @ReactMethod
    fun getData(key: String, callback: Callback) {
        val context: Context = reactApplicationContext
        var data: String? = ""
        try {
            val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
            data = sharedPref.getString(key, "")
            if (data.isNullOrEmpty()) {
                val altPref = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
                data = altPref.getString(key, "")
            }
        } catch (e: Exception) {
            data = ""
        }
        callback.invoke(data)
    }
}
