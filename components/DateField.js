// Date input that opens the phone's native date picker.
// Stores the date as "YYYY-MM-DD", the format the app saves.
// On web, falls back to a plain HTML date input since the native picker is unsupported.
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/theme';
import { formatDate, parseDate, toDateString } from '../utils/format';

// Only import the native picker on non-web platforms to avoid bundling issues.
let DateTimePicker = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function DateField({ label, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const date = value ? parseDate(value) : new Date();

  const handleChange = (event, selected) => {
    // Android shows a dialog that closes itself; iOS shows an inline picker.
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && selected) onChange(toDateString(selected));
  };

  // Web: use a native HTML date input for full keyboard + calendar support.
  const handleWebChange = (e) => {
    const picked = e.target.value; // already "YYYY-MM-DD"
    if (picked) onChange(picked);
  };

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {Platform.OS === 'web' ? (
        /* ── Web-specific date input ── */
        <View style={[styles.box, { borderColor: error ? colors.error : colors.border }]}>
          <Ionicons name="calendar-outline" size={19} color={colors.textMuted} />
          <input
            type="date"
            value={value || ''}
            onChange={handleWebChange}
            aria-label={`${label}: ${value ? formatDate(value) : 'not set'}. Choose a date.`}
            style={{
              flex: 1,
              fontSize: 16,
              color: value ? colors.text : colors.textMuted,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              padding: 0,
              cursor: 'pointer',
            }}
          />
        </View>
      ) : (
        /* ── Native (iOS / Android) picker ── */
        <>
          <Pressable
            onPress={() => setOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value ? formatDate(value) : 'not set'}. Tap to choose a date.`}
            style={[styles.box, { borderColor: error ? colors.error : colors.border }]}
          >
            <Ionicons name="calendar-outline" size={19} color={colors.textMuted} />
            <Text style={[styles.value, !value && styles.placeholder]}>{value ? formatDate(value) : 'Choose a date'}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>
          {open && DateTimePicker ? (
            <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={handleChange} />
          ) : null}
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.smallStrong, marginBottom: spacing.xs + 2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md + 2,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  value: { flex: 1, fontSize: 16, color: colors.text },
  placeholder: { color: colors.textMuted },
  error: { fontSize: 13, color: colors.error, marginTop: spacing.xs + 2 },
});
