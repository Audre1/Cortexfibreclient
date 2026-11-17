import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NotificationBell } from '@/components/NotificationBell';
import { ColorTokens, spacing, typography } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  showNotifications?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  showBack = true,
  rightAction,
  showNotifications = false,
}: ScreenHeaderProps) {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/accueil')))}
            hitSlop={12}
            style={styles.backButton}
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={22} color={c.ink} />
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
        <View style={styles.titleWrap}>
          <Text style={[typography.h2 as any, { color: c.ink }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.caption as any, styles.subtitle]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightSlot}>
          {rightAction}
          {showNotifications && !rightAction && <NotificationBell />}
        </View>
      </View>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center' },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
      marginRight: spacing.sm,
    },
    backButtonPlaceholder: { width: 36, marginRight: spacing.sm },
    titleWrap: { flex: 1 },
    subtitle: { marginTop: 2, color: c.muted },
    rightSlot: { minWidth: 36, alignItems: 'flex-end' },
    bellButton: { padding: 4 },
    bellDot: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.danger,
      borderWidth: 1.5,
      borderColor: c.surface,
    },
  });
}
