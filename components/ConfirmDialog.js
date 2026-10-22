// The Yes/No pop-up used in a web browser, where Alert.alert() does nothing.
// utils/alert.js sends the question here; on a phone the normal Alert is used.
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton';
import { colors, radius, spacing, typography } from '../constants/theme';

let showDialog = null;

export function openConfirmDialog(dialog) {
  if (showDialog) showDialog(dialog);
}

export default function ConfirmDialog() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    showDialog = setDialog;
    return () => {
      showDialog = null;
    };
  }, []);

  const press = (button) => {
    setDialog(null);
    button?.onPress?.();
  };

  const buttons = dialog?.buttons?.length ? dialog.buttons : [{ text: 'OK' }];

  return (
    <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
      <View style={styles.overlay}>
        <View style={styles.box} accessibilityRole="alert">
          <Text style={styles.title}>{dialog?.title}</Text>
          {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
          <View style={styles.buttons}>
            {buttons.map((b) => (
              <AppButton
                key={b.text}
                title={b.text}
                size="small"
                variant={b.style === 'destructive' ? 'danger' : b.style === 'cancel' ? 'secondary' : 'primary'}
                onPress={() => press(b)}
                style={styles.button}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  box: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xxl, width: '100%', maxWidth: 360, gap: spacing.sm },
  title: { ...typography.h3 },
  message: { ...typography.small },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  button: { minWidth: 90 },
});
