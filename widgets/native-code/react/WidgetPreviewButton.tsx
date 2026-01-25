import React from 'react'
import { View, Button, StyleSheet, NativeModules, Alert, Platform } from 'react-native'
import WidgetHelper from './WidgetHelper'

const { WidgetData } = NativeModules

// Debug: log module presence at load time
try {
  // eslint-disable-next-line no-console
  console.log('WidgetPreviewButton init - NativeModules.WidgetData ->', WidgetData)
} catch (e) {
  /* ignore */
}

export default function WidgetPreviewButton() {
  const seedAndOpen = async () => {
    // Debug: log module state when button pressed
    // eslint-disable-next-line no-console
    console.log('seedAndOpen - WidgetData =', WidgetData, 'setData type =', WidgetData?.setData ? typeof WidgetData.setData : 'undefined')

    // If native module is not available (Expo Go), show a helpful message and avoid errors
    if (!WidgetData || typeof WidgetData.setData !== 'function') {
      Alert.alert(
        'Widget preview unavailable',
        'Native widget module is not available in Expo Go. Please run a dev client build: `npx expo prebuild --platform android` then `npx expo run:android` and try again.'
      )
      // Still seed JS-side helper so developer can later run native flow after building
      try {
        WidgetHelper.setTodayWidgetData({
          bsDate: '2082/9/24',
          bsDateNepali: 'पौष २४, २०८२',
          tithi: 'शुक्ल पक्ष अष्टमी',
          sunrise: '06:45 AM',
          sunset: '05:30 PM'
        })
      } catch (e) {
        console.warn('Failed to set widget data JS-side', e)
      }
      return
    }

    // Seed the date_converter_widget required to unlock preview
    try {
      WidgetData.setData('date_converter_widget', JSON.stringify({ bsDate: '2060/03/24' }), () => {})
    } catch (e) {
      console.warn('setData failed', e)
    }

    // Seed today's widget sample data
    try {
      WidgetHelper.setTodayWidgetData({
        bsDate: '2082/9/24',
        bsDateNepali: 'पौष २४, २०८२',
        tithi: 'शुक्ल पक्ष अष्टमी',
        sunrise: '06:45 AM',
        sunset: '05:30 PM'
      })
    } catch (e) {
      console.warn('Failed to set today widget data', e)
    }

    // Open preview activity via native module (reliable)
    try {
      WidgetData.openPreview((res: any, err: any) => {
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
