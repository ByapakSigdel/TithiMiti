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

5. In your React Native code, use a library like `react-native-shared-group-preferences` or `expo-file-system` to write data to SharedPreferences named "widget_data" with key "events_data".
