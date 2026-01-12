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
        val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
        val editor = sharedPref.edit()
        editor.putString(key, data)
        editor.apply()
        
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
        val sharedPref = context.getSharedPreferences("WIDGET_DATA", Context.MODE_PRIVATE)
        val data = sharedPref.getString(key, "")
        callback.invoke(data)
    }
}
