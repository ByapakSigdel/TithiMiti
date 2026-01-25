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

    // Open preview activity via native module (reliable)
    try {
      await WidgetData.openPreview((res: any, err: any) => {
        if (err) console.warn('openPreview failed', err)
      })
    } catch (e) {
      console.warn('openPreview exception', e)
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
