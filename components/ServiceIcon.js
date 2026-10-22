// Rounded square "logo" for a subscription: the service's first letter on its
// brand colour (or the category colour for unknown services).
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_COLORS, CATEGORY_META } from '../constants/categories';

function brandColor(name = '') {
  const lower = name.toLowerCase();
  const key = Object.keys(BRAND_COLORS).find((brand) => lower.includes(brand));
  return key ? BRAND_COLORS[key] : null;
}

export default function ServiceIcon({ name, category, size = 44 }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.Other;
  const brand = brandColor(name);
  const box = { width: size, height: size, borderRadius: size * 0.3 };

  if (brand) {
    return (
      <View style={[styles.box, box, { backgroundColor: brand }]} accessibilityElementsHidden importantForAccessibility="no">
        <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{name.trim().charAt(0).toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.box, box, { backgroundColor: `${meta.color}1F` }]} accessibilityElementsHidden importantForAccessibility="no">
      <Ionicons name={meta.icon} size={size * 0.48} color={meta.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#FFFFFF', fontWeight: '800' },
});
