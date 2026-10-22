// Labelled text input with error message, optional icon/prefix and a
// show/hide toggle for passwords.
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/theme';

const TextField = forwardRef(function TextField({ label, error, helper, icon, prefix, secure = false, style, right, ...inputProps }, ref) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);
  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, { borderColor }, focused && styles.focused]}>
        {icon ? <Ionicons name={icon} size={19} color={focused ? colors.primary : colors.textMuted} /> : null}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          accessibilityLabel={label}
          {...inputProps}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
});

export default TextField;

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
  focused: { backgroundColor: '#FBFCFE' },
  prefix: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.md },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs + 2 },
  error: { fontSize: 13, color: colors.error, flex: 1 },
  helper: { ...typography.small, fontSize: 12, marginTop: spacing.xs + 2 },
});
