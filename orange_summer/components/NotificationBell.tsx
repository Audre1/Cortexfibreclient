import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ColorTokens } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { useColors } from '@/store/useSettingsStore';

interface Props {
  /** Couleur de l'icône (par défaut la couleur de texte du thème). */
  color?: string;
}

// Cloche de notifications avec pastille de compteur (nombre de non-lues).
export function NotificationBell({ color }: Props) {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const nonLues = useAppStore((s) => s.notifications.filter((n) => !n.lue).length);

  return (
    <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.wrap}>
      <Ionicons name="notifications-outline" size={22} color={color ?? c.ink} />
      {nonLues > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{nonLues > 9 ? '9+' : nonLues}</Text>
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    wrap: { padding: 4 },
    badge: {
      position: 'absolute',
      top: -3,
      right: -4,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: c.danger,
      borderWidth: 1.5,
      borderColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  });
}
