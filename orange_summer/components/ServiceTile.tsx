import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ColorTokens, radius, spacing } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

interface ServiceTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /**
   * 'carte'  : carré bordé qui contient l'icône ET le libellé (rangée « Services »).
   * 'icone'  : carré plein avec l'icône seule, libellé dessous (rangées « Ma box… » et « Besoin d'aide ? »).
   */
  variante?: 'carte' | 'icone';
}

// Tuile d'une grille de 4 par ligne (la largeur est donnée par le parent : flex: 1 dans une rangée).
export function ServiceTile({ icon, label, onPress, variante = 'carte' }: ServiceTileProps) {
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  if (variante === 'icone') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.iconeWrap, pressed && styles.pressed]} accessibilityLabel={label}>
        <View style={styles.iconeCarre}>
          <Ionicons name={icon} size={30} color={c.primary} />
        </View>
        <Text style={styles.iconeLabel} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.carte, pressed && styles.pressed]} accessibilityLabel={label}>
      <Ionicons name={icon} size={30} color={c.primary} />
      <Text style={styles.carteLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    pressed: { opacity: 0.7 },
    carte: {
      flex: 1,
      minHeight: 104,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      gap: spacing.sm,
    },
    carteLabel: { fontSize: 12.5, fontWeight: '600', color: c.ink, textAlign: 'center' },
    iconeWrap: { flex: 1, alignItems: 'center' },
    iconeCarre: {
      width: '100%',
      aspectRatio: 1,
      maxWidth: 92,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconeLabel: { fontSize: 12.5, fontWeight: '600', color: c.ink, textAlign: 'center', marginTop: spacing.sm },
  });
}
