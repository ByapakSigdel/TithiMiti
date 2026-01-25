// Example helper to write widget data from React Native
import { NativeModules } from 'react-native'

const { WidgetData } = NativeModules

// Write JSON string to shared prefs and notify widgets
export function setTodayWidgetData(payload) {
  // payload should be a plain object with keys:
  // { bsDate, bsDateNepali, tithi, sunrise, sunset }
  try {
    const json = JSON.stringify(payload)
    WidgetData.setData('today_widget', json, (res) => {
      console.log('WidgetData.setData ->', res)
    })
  } catch (e) {
    console.warn('Failed to set widget data', e)
  }
}

// Example usage:
// setTodayWidgetData({ bsDate: '2082/9/24', bsDateNepali: 'पौष २४, २०८२', tithi: 'शुक्ल पक्ष अष्टमी', sunrise: '06:45 AM', sunset: '05:30 PM' })

export default {
  setTodayWidgetData,
}
