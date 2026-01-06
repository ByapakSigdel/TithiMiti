# Widget Implementation Strategy (Nothing OS aesthetic)

This project is widget-first. The in-app `WidgetPreview` mirrors intended functionality and visual style. For real OS widgets:

- Android: Implement a Glance App Widget using a lightweight Kotlin module. Recommended library: `react-native-android-widget` in a bare/Prebuild RN or Expo config plugin flow. Bind data via a shared storage (AsyncStorage + `SharedPreferences` bridge) and update via a daily `WorkManager` job.
- iOS: Create a WidgetKit extension (Swift) reading data from an `App Group` container. Use background `Timeline` updates daily, and push updates on event addition/reminder changes.

Expo Managed Path:

1. Use `expo prebuild` to generate native projects.
2. Add platform modules:
   - Android: Glance widget composable views; bridge JS → native via `TurboModule` or a small module.
   - iOS: WidgetKit target and App Group configuration.
3. Share widget data contract via compact JSON structure (today ISO, tithi romanized, next events).
4. Schedule daily update at local midnight using platform-specific schedulers.

Design Notes:

- Monochrome palette, dot-matrix typography cues.
- First page: BS date + tithi + today's events.
- Second page: compact AD week view.
