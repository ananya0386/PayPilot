// Alert.alert() does nothing in a web browser, so on the web we show our own
// pop-up (components/ConfirmDialog.js) instead. On a phone it is the normal Alert.
import { Alert, Platform } from 'react-native';
import { openConfirmDialog } from '../components/ConfirmDialog';

export function showAlert(title, message, buttons = []) {
  if (Platform.OS === 'web') {
    openConfirmDialog({ title, message, buttons });
  } else {
    Alert.alert(title, message, buttons);
  }
}
