import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { Offre } from '@/data/types';
import { useColors } from '@/store/useSettingsStore';

interface OfferCardProps {
  offre: Offre;
  selected: boolean;
  onPress: () => void;
}

// Tuile d'offre : même motif que les tuiles « Services » de l'accueil (carré bordé, icône orange,
// libellé en dessous) ; l'offre choisie a un contour orange et une coche.
export function OfferCard({ offre, selected, onPress }: OfferCardProps) {
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${offre.nom}, ${offre.debit}, ${offre.prixFCFA} francs CFA par mois`}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={13} color={c.white} />
        </View>
      )}
      <Ionicons name={offre.icone as any} size={30} color={c.primary} />
      <Text style={styles.nom}>{offre.nom}</Text>
      <Text style={styles.debit}>{offre.debit}</Text>
      <Text style={styles.prix}>
        {offre.prixFCFA.toLocaleString('fr-FR')} <Text style={styles.prixUnit}>FCFA/mois</Text>
      </Text>
      {offre.avantages.slice(0, 2).map((a) => (
        <View key={a} style={styles.avantageRow}>
          <Ionicons name="checkmark-circle" size={13} color={c.success} />
          <Text style={styles.avantageText} numberOfLines={1}>
            {a}
          </Text>
        </View>
      ))}
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
      alignItems: 'flex-start',
      gap: 2,
    },
    cardSelected: { borderColor: c.primary, borderWidth: 2 },
    checkBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nom: { ...(typography.bodyBold as any), color: c.ink, marginTop: spacing.sm },
    debit: { fontSize: 12.5, color: c.muted, marginBottom: spacing.xs },
    prix: { fontSize: 16, fontWeight: '800', color: c.primaryDark },
    prixUnit: { fontSize: 11, fontWeight: '600', color: c.muted },
    avantageRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
    avantageText: { fontSize: 11.5, color: c.slate, marginLeft: 4, flexShrink: 1 },
  });
}
