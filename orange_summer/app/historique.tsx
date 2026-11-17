import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { cleMois, construireDemandes, dateHeureCourte, Demande, grouper, libelleMois } from '@/services/listeDemandes';
import { useAppStore } from '@/store/useAppStore';
import { useColors } from '@/store/useSettingsStore';

type Vue = 'effectuees' | 'resolues';

// Historique : les demandes classées par mois. Dans chaque mois, les demandes non résolues, les résolues et les
// annulées sont dans des blocs séparés, pour qu'elles ne se mélangent jamais.
export default function HistoriqueScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const dossiers = useAppStore((s) => s.dossiers);
  const reclamations = useAppStore((s) => s.reclamations);
  const [vue, setVue] = useState<Vue>('effectuees');

  const demandes = useMemo(() => construireDemandes(dossiers, reclamations), [dossiers, reclamations]);
  const resolues = demandes.filter((d) => d.etat === 'resolue');
  const nonResolues = demandes.filter((d) => d.etat === 'en_cours');

  // Vue « effectuées » : par mois de dépôt. Vue « résolues » : par mois de résolution (la plus récente d'abord).
  const moisEffectuees = useMemo(() => grouper(demandes, (d) => d.creeLe, cleMois, libelleMois), [demandes]);
  const resoluesTriees = useMemo(
    () => [...resolues].sort((a, b) => (b.resolueLe ?? b.creeLe)?.getTime()! - (a.resolueLe ?? a.creeLe)?.getTime()!),
    [resolues]
  );
  const moisResolues = useMemo(
    () => grouper(resoluesTriees, (d) => d.resolueLe ?? d.creeLe, cleMois, libelleMois),
    [resoluesTriees]
  );

  function ouvrir(d: Demande) {
    router.push((d.genre === 'dossier' ? `/dossier/${d.id}` : `/reclamation/${d.id}`) as any);
  }

  function ligne(d: Demande, avecResolution: boolean) {
    return (
      <Pressable key={d.cle} style={styles.ligne} onPress={() => ouvrir(d)} accessibilityRole="button" accessibilityLabel={`${d.titre} ${d.reference}`}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titre} numberOfLines={2}>
            {d.titre}
          </Text>
          <Text style={styles.meta}>Réf. {d.reference}</Text>
          <Text style={styles.meta}>
            {d.creeLe ? `Déposée le ${dateHeureCourte(d.creeLe)}` : 'Date de dépôt non renseignée'}
          </Text>
          {avecResolution && (
            <Text style={[styles.meta, { color: c.success, fontWeight: '700' }]}>
              {d.resolueLe ? `Résolue le ${dateHeureCourte(d.resolueLe)}` : 'Date de résolution non renseignée'}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
          <Badge label={d.badge.label} tone={d.badge.tone} />
          <Ionicons name="chevron-forward" size={16} color={c.muted} />
        </View>
      </Pressable>
    );
  }

  function bloc(titre: string, icone: React.ComponentProps<typeof Ionicons>['name'], couleur: string, liste: Demande[], avecResolution = false) {
    if (liste.length === 0) return null;
    return (
      <View style={styles.bloc}>
        <View style={styles.blocTete}>
          <Ionicons name={icone} size={16} color={couleur} />
          <Text style={[styles.blocTitre, { color: couleur }]}>
            {titre} ({liste.length})
          </Text>
        </View>
        {liste.map((d) => ligne(d, avecResolution))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Historique" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.resume}>
          <View style={styles.resumeLigne}>
            <View style={styles.resumeCase}>
              <Text style={styles.resumeNombre}>{demandes.length}</Text>
              <Text style={styles.resumeLabel}>Demandes</Text>
            </View>
            <View style={styles.resumeCase}>
              <Text style={[styles.resumeNombre, { color: c.warning }]}>{nonResolues.length}</Text>
              <Text style={styles.resumeLabel}>Non résolues</Text>
            </View>
            <View style={styles.resumeCase}>
              <Text style={[styles.resumeNombre, { color: c.success }]}>{resolues.length}</Text>
              <Text style={styles.resumeLabel}>Résolues</Text>
            </View>
          </View>
        </Card>

        <View style={styles.segments}>
          {([
            ['effectuees', 'Demandes effectuées'],
            ['resolues', 'Demandes résolues'],
          ] as [Vue, string][]).map(([id, label]) => (
            <Pressable key={id} style={[styles.segment, vue === id && styles.segmentActif]} onPress={() => setVue(id)} accessibilityRole="button" accessibilityState={{ selected: vue === id }}>
              <Text style={[styles.segmentTexte, vue === id && styles.segmentTexteActif]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {vue === 'effectuees' ? (
          <>
            <Text style={styles.aide}>Les demandes que vous avez déposées, regroupées par mois de dépôt.</Text>
            {moisEffectuees.length === 0 ? (
              <Text style={styles.vide}>Aucune demande pour le moment.</Text>
            ) : (
              moisEffectuees.map((m) => {
                const nr = m.elements.filter((d) => d.etat === 'en_cours');
                const r = m.elements.filter((d) => d.etat === 'resolue');
                const an = m.elements.filter((d) => d.etat === 'annulee');
                return (
                  <View key={m.cle} style={styles.mois}>
                    <View style={styles.moisTete}>
                      <Text style={styles.moisTitre}>{m.libelle}</Text>
                      <Text style={styles.moisCompte}>
                        {m.elements.length} demande{m.elements.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                    {bloc('Non résolues', 'hourglass-outline', c.warning, nr)}
                    {bloc('Résolues', 'checkmark-circle-outline', c.success, r, true)}
                    {bloc('Annulées', 'close-circle-outline', c.muted, an)}
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            <Text style={styles.aide}>Les demandes réglées par Orange, regroupées par mois de résolution.</Text>
            {moisResolues.length === 0 ? (
              <Text style={styles.vide}>Aucune demande résolue pour le moment.</Text>
            ) : (
              moisResolues.map((m) => (
                <View key={m.cle} style={styles.mois}>
                  <View style={styles.moisTete}>
                    <Text style={styles.moisTitre}>{m.libelle}</Text>
                    <Text style={styles.moisCompte}>
                      {m.elements.length} résolue{m.elements.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  {bloc('Résolues', 'checkmark-circle-outline', c.success, m.elements, true)}
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: spacing.lg },
    resume: { marginBottom: spacing.lg },
    resumeLigne: { flexDirection: 'row', justifyContent: 'space-between' },
    resumeCase: { flex: 1, alignItems: 'center' },
    resumeNombre: { fontSize: 26, fontWeight: '800', color: c.ink, fontVariant: ['tabular-nums'] },
    resumeLabel: { fontSize: 12, color: c.muted, fontWeight: '600', marginTop: 2 },
    segments: { flexDirection: 'row', backgroundColor: c.border, borderRadius: radius.full, padding: 3, marginBottom: spacing.md },
    segment: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.full },
    segmentActif: { backgroundColor: c.surface },
    segmentTexte: { fontSize: 13, fontWeight: '700', color: c.slate },
    segmentTexteActif: { color: c.primaryDark },
    aide: { fontSize: 13, color: c.muted, marginBottom: spacing.md },
    vide: { fontSize: 14, color: c.muted, textAlign: 'center', marginTop: spacing.xl },
    mois: { marginBottom: spacing.xl },
    moisTete: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      borderBottomWidth: 2,
      borderBottomColor: c.primary,
      paddingBottom: spacing.xs,
      marginBottom: spacing.sm,
    },
    moisTitre: { ...(typography.h3 as any), color: c.ink },
    moisCompte: { fontSize: 12.5, color: c.muted, fontWeight: '700' },
    bloc: { marginTop: spacing.sm },
    blocTete: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
    blocTitre: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
    ligne: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    titre: { ...(typography.bodyBold as any), color: c.ink },
    meta: { fontSize: 12.5, color: c.muted, marginTop: 2 },
  });
}
