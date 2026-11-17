import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ColorTokens, radius, shadow, spacing, typography } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'neutral';
}

export function QuickAction({ icon, label, onPress, tone = 'neutral' }: QuickActionProps) {
  const isPrimary = tone === 'primary';
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, isPrimary && styles.cardPrimary, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, isPrimary && styles.iconWrapPrimary]}>
        <Ionicons name={icon} size={22} color={isPrimary ? c.white : c.primary} />
      </View>
      <Text style={[typography.bodyBold as any, styles.label, isPrimary && styles.labelPrimary]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    card: {
      flexBasis: '48%',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...shadow.card,
    },
    cardPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm + 2,
    },
    iconWrapPrimary: { backgroundColor: 'rgba(255,255,255,0.2)' },
    label: { fontSize: 14, color: c.ink },
    labelPrimary: { color: c.white },
  });
}
