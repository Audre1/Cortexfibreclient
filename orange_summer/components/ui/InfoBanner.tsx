import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

interface InfoBannerProps {
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'info' | 'warning';
}

export function InfoBanner({ text, icon = 'information-circle', tone = 'info' }: InfoBannerProps) {
  const c = useColors();
  const t = tone === 'warning' ? { bg: c.warningSoft, fg: c.warning } : { bg: c.infoSoft, fg: c.info };

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <Ionicons name={icon} size={18} color={t.fg} style={styles.icon} />
      <Text style={[typography.caption as any, styles.text, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  icon: { marginRight: spacing.sm, marginTop: 1 },
  text: { flex: 1, lineHeight: 18 },
});
