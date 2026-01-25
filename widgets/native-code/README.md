# Native Widget Setup

To use these native widgets, you need to run `npx expo prebuild` to generate the `android` folder.

1. Copy `android/EventsWidget.kt` to `android/app/src/main/java/com/tithimiti/widgets/EventsWidget.kt` (create package folder if needed).
2. Copy `android/res/layout/events_widget.xml` to `android/app/src/main/res/layout/events_widget.xml`.
3. Copy `android/res/xml/events_widget_info.xml` to `android/app/src/main/res/xml/events_widget_info.xml`.
4. Add the receiver to `android/app/src/main/AndroidManifest.xml`:

```xml
<receiver android:name=".widgets.EventsWidget" android:exported="false">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/events_widget_info" />
</receiver>
```

5. In your React Native code, use the provided native module `WidgetData` (registered by `WidgetUpdatePackage`) to write data to SharedPreferences named `WIDGET_DATA` using keys like `today_widget`, `user_events_widget`, etc. Example helper: `widgets/native-code/react/WidgetHelper.js`.

Important notes:
- The widgets look for SharedPreferences named exactly `WIDGET_DATA` (uppercase). If you're using a different name (like `widget_data`) update the widgets or write to both names.
- Ensure `WidgetUpdatePackage` is registered in your app's `MainApplication` so `NativeModules.WidgetData` is available.

6. Debug preview activity
 - I added a debug `WidgetPreviewActivity` that renders the TodayDate widget inside the app for fast iteration. The activity is defined at `widgets/native-code/android/WidgetPreviewActivity.kt` and layout at `res/layout/widget_preview_activity.xml`.
 - For safety, the preview is locked unless the `date_converter_widget` SharedPreferences key contains `bsDate` equal to `2060/03/24`. This ensures you only enter the preview after entering that exact BS date in your Date Converter screen.
 - Use the RN helper `WidgetHelper.setTodayWidgetData(...)` to seed `today_widget` data for the preview.
