const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidWidgetFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;
      const packageName = config.android.package.replace(/\./g, '/');
      
      // Source paths
      const widgetSourceDir = path.join(projectRoot, 'widgets', 'native-code', 'android');
      
      // Destination paths
      const resDir = path.join(platformRoot, 'app', 'src', 'main', 'res');
      const javaDir = path.join(platformRoot, 'app', 'src', 'main', 'java', packageName, 'widgets');
      
      // Ensure directories exist
      if (!fs.existsSync(path.join(resDir, 'layout'))) fs.mkdirSync(path.join(resDir, 'layout'), { recursive: true });
      if (!fs.existsSync(path.join(resDir, 'xml'))) fs.mkdirSync(path.join(resDir, 'xml'), { recursive: true });
      if (!fs.existsSync(javaDir)) fs.mkdirSync(javaDir, { recursive: true });

      // Copy files
      try {
        fs.copyFileSync(
            path.join(widgetSourceDir, 'EventsWidget.kt'),
            path.join(javaDir, 'EventsWidget.kt')
        );
        fs.copyFileSync(
            path.join(widgetSourceDir, 'res', 'layout', 'events_widget.xml'),
            path.join(resDir, 'layout', 'events_widget.xml')
        );
        fs.copyFileSync(
            path.join(widgetSourceDir, 'res', 'xml', 'events_widget_info.xml'),
            path.join(resDir, 'xml', 'events_widget_info.xml')
        );
      } catch (e) {
        console.error("Error copying widget files:", e);
        throw e;
      }

      return config;
    },
  ]);
};

const withAndroidWidgetManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Add receiver
    mainApplication.receiver = mainApplication.receiver || [];
    
    // Check if already exists to avoid duplicates
    const receiverExists = mainApplication.receiver.some(
      (r) => r.$['android:name'] === '.widgets.EventsWidget'
    );

    if (!receiverExists) {
      mainApplication.receiver.push({
        $: {
          'android:name': '.widgets.EventsWidget',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/events_widget_info',
            },
          },
        ],
      });
    }

    return config;
  });
};

module.exports = (config) => {
  config = withAndroidWidgetFiles(config);
  config = withAndroidWidgetManifest(config);
  return config;
};
