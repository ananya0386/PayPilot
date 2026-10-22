// Small "toast" banner for success/error feedback, e.g. "Subscription saved".
// Any screen can call:  const toast = useToast(); toast.show('Saved', 'success');
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow } from '../constants/theme';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: 'checkmark-circle', color: colors.success },
  error: { icon: 'alert-circle', color: colors.error },
  info: { icon: 'information-circle', color: colors.info },
};

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const opacity = useAnimatedNumber(0);
  const timer = useRef(null);

  const show = useCallback(
    (message, tone = 'success') => {
      clearTimeout(timer.current);
      setToast({ message, tone, key: Date.now() });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2600);
    },
    [opacity]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show }), [show]);
  const tone = toast ? TONES[toast.tone] || TONES.info : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              top: insets.top + spacing.sm,
              opacity,
              transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
            },
          ]}
          accessibilityLiveRegion="polite"
        >
          <View style={[styles.bar, { backgroundColor: tone.color }]} />
          <Ionicons name={tone.icon} size={20} color={tone.color} />
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
    elevation: 6,
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  text: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
});
