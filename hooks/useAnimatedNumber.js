// Creates one Animated.Value that lives as long as the component.
// (Same idea as React Native's useAnimatedValue, but also works on web.)
import { useState } from 'react';
import { Animated } from 'react-native';

export function useAnimatedNumber(initialValue = 0) {
  const [value] = useState(() => new Animated.Value(initialValue));
  return value;
}
