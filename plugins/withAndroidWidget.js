const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
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
      if (!fs.existsSync(path.join(resDir, 'values'))) fs.mkdirSync(path.join(resDir, 'values'), { recursive: true });
      if (!fs.existsSync(javaDir)) fs.mkdirSync(javaDir, { recursive: true });

      // Copy strings.xml
      try {
        fs.copyFileSync(
          path.join(widgetSourceDir, 'res', 'values', 'strings.xml'),
          path.join(resDir, 'values', 'widget_strings.xml')
        );
      } catch (e) {
        console.error("Error copying strings.xml:", e);
      }

      // Copy widget files
      const widgets = [
        'EventsWidget',
        'GoldSilverWidget',
        'HoroscopeWidget',
        'DateConverterWidget',
        'TodayDateWidget'
      ];

      // Copy native module files
      try {
        fs.copyFileSync(
          path.join(widgetSourceDir, 'WidgetUpdateModule.kt'),
          path.join(javaDir, 'WidgetUpdateModule.kt')
        );
        fs.copyFileSync(
          path.join(widgetSourceDir, 'WidgetPackage.kt'),
          path.join(javaDir, 'WidgetPackage.kt')
        );
        fs.copyFileSync(
          path.join(widgetSourceDir, 'WidgetUpdatePackage.kt'),
          path.join(javaDir, 'WidgetUpdatePackage.kt')
        );
        // Copy preview activity so developer preview is available
        try {
          fs.copyFileSync(
            path.join(widgetSourceDir, 'WidgetPreviewActivity.kt'),
            path.join(javaDir, 'WidgetPreviewActivity.kt')
          );
        } catch (e) {
          // ignore if not present
        }
      } catch (e) {
        console.error("Error copying native module files:", e);
      }

      try {
        for (const widget of widgets) {
          fs.copyFileSync(
            path.join(widgetSourceDir, `${widget}.kt`),
            path.join(javaDir, `${widget}.kt`)
          );
          
          const layoutName = widget.replace(/([A-Z])/g, '_$1').toLowerCase().substring(1);
          fs.copyFileSync(
            path.join(widgetSourceDir, 'res', 'layout', `${layoutName}.xml`),
            path.join(resDir, 'layout', `${layoutName}.xml`)
          );
          
          fs.copyFileSync(
            path.join(widgetSourceDir, 'res', 'xml', `${layoutName}_info.xml`),
            path.join(resDir, 'xml', `${layoutName}_info.xml`)
          );
        }
        // Copy preview layout and strings if present
        try {
          fs.copyFileSync(
            path.join(widgetSourceDir, 'res', 'layout', 'widget_preview_activity.xml'),
            path.join(resDir, 'layout', 'widget_preview_activity.xml')
          );
          fs.copyFileSync(
            path.join(widgetSourceDir, 'res', 'values', 'strings_preview.xml'),
            path.join(resDir, 'values', 'strings_preview.xml')
          );
        } catch (e) {
          // ignore if preview files not present
        }
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

    // Add receivers for all widgets
    mainApplication.receiver = mainApplication.receiver || [];
    
    const widgets = [
      { name: 'EventsWidget', resource: 'events_widget_info' },
      { name: 'GoldSilverWidget', resource: 'gold_silver_widget_info' },
      { name: 'HoroscopeWidget', resource: 'horoscope_widget_info' },
      { name: 'DateConverterWidget', resource: 'date_converter_widget_info' },
      { name: 'TodayDateWidget', resource: 'today_date_widget_info' }
    ];

    for (const widget of widgets) {
      const receiverExists = mainApplication.receiver.some(
        (r) => r.$['android:name'] === `.widgets.${widget.name}`
      );

      if (!receiverExists) {
        mainApplication.receiver.push({
          $: {
            'android:name': `.widgets.${widget.name}`,
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
                'android:resource': `@xml/${widget.resource}`,
              },
            },
          ],
        });
      }
    }

    // Add debug preview activity entry
    const activityExists = mainApplication.activity && mainApplication.activity.some(
      (a) => a.$ && a.$['android:name'] === '.widgets.WidgetPreviewActivity'
    );
    if (!activityExists) {
      mainApplication.activity = mainApplication.activity || [];
      mainApplication.activity.push({
        $: {
          'android:name': '.widgets.WidgetPreviewActivity',
          'android:exported': 'false'
        }
      });
    }

    return config;
  });
};

const withWidgetNativeModule = (config) => {
  return withMainApplication(config, async (config) => {
    const { modResults } = config;
    let { contents } = modResults;
    
    // Add import for WidgetPackage (not WidgetUpdatePackage)
    const importStatement = 'import com.byapak.tithimiti.widgets.WidgetPackage';
    if (!contents.includes(importStatement)) {
      // Add after other imports
      contents = contents.replace(
        /import com\.facebook\.react\.defaults\.DefaultReactNativeHost/,
        `import com.facebook.react.defaults.DefaultReactNativeHost\n${importStatement}`
      );
    }
    
    // Add package to getPackages() - Kotlin style
    const packageStatement = 'packages.add(WidgetPackage())';
    if (!contents.includes(packageStatement)) {
      // Find getPackages() method and add our package
      contents = contents.replace(
        /(override fun getPackages\(\): List<ReactPackage> \{[\s\S]*?val packages = PackageList\(this\)\.packages)/,
        `$1\n            ${packageStatement}`
      );
    }
    
    config.modResults.contents = contents;
    return config;
  });
};

module.exports = (config) => {
  config = withAndroidWidgetFiles(config);
  config = withAndroidWidgetManifest(config);
  config = withWidgetNativeModule(config);
  return config;
};
