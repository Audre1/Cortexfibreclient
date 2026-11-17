import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ColorTokens, spacing, typography } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { useColors } from '@/store/useSettingsStore';

export default function DemenagementScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const demenagements = useAppStore((s) => s.demenagements);

  if (demenagements.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Déménagement" />
        <View style={styles.content}>
          <Text style={[typography.caption as any, { color: c.muted }]}>Transfert de ligne (0)</Text>
          <View style={styles.illustration}>
            <Ionicons name="car-outline" size={44} color={c.primary} />
          </View>
          <Text style={[typography.h2 as any, styles.title]}>Aucun transfert de ligne</Text>
          <Text style={[typography.body as any, styles.subtitle]}>
            Vous n'avez pas de demande de déménagement ou de transfert de ligne en cours.
          </Text>
          <View style={{ width: '100%', marginTop: spacing.xl }}>
            <Button
              label="Faire une demande"
              icon="arrow-forward"
              iconPosition="right"
              onPress={() => router.push('/demenagement-nouvelle-demande')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Déménagement" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Transfert de ligne ({demenagements.length})</Text>

        {demenagements.map((d) => (
          <Card key={d.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="car" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.cardTitle}>Transfert de ligne</Text>
                <Text style={styles.cardDate}>{d.date}</Text>
              </View>
              <Badge
                label={d.statut === 'en_cours' ? 'En cours' : 'Terminé'}
                tone={d.statut === 'en_cours' ? 'warning' : 'success'}
              />
            </View>
            <View style={styles.adresseRow}>
              <Ionicons name="location-outline" size={15} color={c.muted} />
              <Text style={styles.adresseText}>Nouvelle adresse : {d.nouvelleAdresse}</Text>
            </View>
          </Card>
        ))}

        <View style={{ marginTop: spacing.md }}>
          <Button
            label="Faire une nouvelle demande"
            icon="add"
            variant="secondary"
            onPress={() => router.push('/demenagement-nouvelle-demande')}
          />
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    illustration: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: spacing.lg,
    },
    title: { textAlign: 'center', color: c.ink },
    subtitle: { textAlign: 'center', color: c.slate, marginTop: spacing.sm },
    scroll: { padding: spacing.lg },
    sectionTitle: { ...(typography.h3 as any), color: c.ink, marginBottom: spacing.md },
    card: { marginBottom: spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { fontSize: 14.5, fontWeight: '700', color: c.ink },
    cardDate: { fontSize: 12, color: c.muted, marginTop: 1 },
    adresseRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
    adresseText: { marginLeft: spacing.xs, fontSize: 13, color: c.slate, flex: 1 },
  });
}
