import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ColorTokens } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

interface AvatarProps {
  initiales: string;
  size?: number;
  background?: string;
  color?: string;
}

export function Avatar({ initiales, size = 48, background, color }: AvatarProps) {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background ?? colors.primary },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36, color: color ?? colors.white }]}>{initiales}</Text>
    </View>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
});
}