import React from 'react'
import { View, Button, StyleSheet, NativeModules } from 'react-native'
import WidgetHelper from './WidgetHelper'

const { WidgetData } = NativeModules

export default function WidgetPreviewButton() {
  const seedAndOpen = async () => {
    // Seed the date_converter_widget required to unlock preview
    try {
      await WidgetData.setData('date_converter_widget', JSON.stringify({ bsDate: '2060/03/24' }), () => {})
    } catch (e) {
      console.warn('setData failed', e)
    }

    // Seed today's widget sample data
    WidgetHelper.setTodayWidgetData({
      bsDate: '2082/9/24',
      bsDateNepali: 'पौष २४, २०८२',
      tithi: 'शुक्ल पक्ष अष्टमी',
      sunrise: '06:45 AM',
      sunset: '05:30 PM'
    })

    // Open preview activity via intent
    const packageName = 'com.byapak.tithimiti'
    const intent = `intent:#Intent;component=${packageName}/.widgets.WidgetPreviewActivity;end;`
    try {
      // Linking can open intents, but on Android we can use Intent url
      // React Native Linking may not accept this pattern across all versions; instead, use a deep link that native Activity handles
      // We'll attempt to open via Linking first
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Linking } = require('react-native')
      Linking.openURL(`intent://widgets_preview#Intent;component=${packageName}/.widgets.WidgetPreviewActivity;end`)
    } catch (e) {
      console.warn('Failed to open preview via Linking', e)
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Open Widget Preview" onPress={seedAndOpen} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { margin: 12 }
})
