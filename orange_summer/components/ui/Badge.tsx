import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ColorTokens, radius, spacing } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

function tones(c: ColorTokens): Record<Tone, { bg: string; text: string }> {
  return {
    success: { bg: c.successSoft, text: c.success },
    warning: { bg: c.warningSoft, text: c.warning },
    danger: { bg: c.dangerSoft, text: c.danger },
    info: { bg: c.infoSoft, text: c.info },
    neutral: { bg: c.background, text: c.slate },
  };
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const c = useColors();
  const t = tones(c)[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700' },
});
