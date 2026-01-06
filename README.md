# Tithi Miti — Nothing-style Dual Calendar

Minimal, monochrome, dot-matrix vibes. Dual AD/BS calendars with smooth micro-animations, Romanized Nepali labels, events, reminders, converter, and widget-first strategy.

## Get started

1. Install dependencies

   ```bash
   npm install
   npx expo install expo-notifications @react-native-async-storage/async-storage
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

### Key Screens & Components

- Tabs → Calendar: Month view with `AD/BS` toggle and `EN/Nep (Rom)` language control.
- Converter: AD ↔ BS date converter using API-backed logic.
- MonthGrid & DayCell: Nothing OS–inspired layout with subtle micro-animations.

### Architecture

- Domain: `src/domain/calendar/*` — types, AD/BS normalization, converter.
- Services: `src/services/*` — API client, caching, events storage, notifications.
- State: `src/state/appState.tsx` — calendar mode, language, selected date.
- UI Theme: `src/ui/theme/nothing.ts` — monochrome tokens.
- Widgets: `widgets/WidgetPreview.tsx` and `widgets/strategy.md`.

### Widgets

See `widgets/strategy.md` for Android Glance and iOS WidgetKit approach. Use `expo prebuild` to add native modules when ready. The in-app `WidgetPreview` mirrors OS widget UX.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
