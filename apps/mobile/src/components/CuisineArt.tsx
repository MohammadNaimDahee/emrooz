import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { hashString } from '@emrooz/core';
import { CUISINE_PALETTES } from '../theme/tokens';

export function paletteFor(key: string): [string, string, string] {
  const i = hashString(key) % CUISINE_PALETTES.length;
  return CUISINE_PALETTES[i]!;
}

/**
 * Decorative gradient thumbnail for recipe cards. Deterministic per `seed`
 * so the same recipe always looks the same, and no imagery required.
 */
export function CuisineArt({
  seed,
  height,
  radius = 0,
  style,
}: {
  seed: string;
  height: number;
  radius?: number;
  style?: object;
}) {
  const [c1, c2, c3] = paletteFor(seed);
  const seedNum = hashString(seed);
  const angle = 20 + (seedNum % 60);
  const cos = Math.cos((angle * Math.PI) / 180);
  const sin = Math.sin((angle * Math.PI) / 180);

  return (
    <View style={[{ height, borderRadius: radius, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[c1, c2, c3]}
        start={{ x: 0.5 - cos / 2, y: 0.5 - sin / 2 }}
        end={{ x: 0.5 + cos / 2, y: 0.5 + sin / 2 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.35)', 'transparent']}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.6, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
