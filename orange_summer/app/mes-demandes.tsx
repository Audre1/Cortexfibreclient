import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/ConfirmModal';
import { QuickAction } from '@/components/QuickAction';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { cleJour, construireDemandes, Demande, grouper, heureCourte, libelleJour } from '@/services/listeDemandes';
import { useAppStore } from '@/store/useAppStore';
import { useColors } from '@/store/useSettingsStore';

type Filtre = 'en_cours' | 'resolue' | 'annulee' | 'toutes';

const FILTRES: { id: Filtre; label: string }[] = [
  { id: 'en_cours', label: 'Non résolues' },
  { id: 'resolue', label: 'Résolues' },
  { id: 'annulee', label: 'Annulées' },
  { id: 'toutes', label: 'Toutes' },
];

// Mes demandes : classées par jour (le plus récent d'abord) puis par heure. Le filtre sépare les demandes
// non résolues des résolues pour qu'elles ne se mélangent pas.
export default function MesDemandesScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const dossiers = useAppStore((s) => s.dossiers);
  const reclamations = useAppStore((s) => s.reclamations);
  const annulerDossier = useAppStore((s) => s.annulerDossier);
  const supprimerReclamation = useAppStore((s) => s.supprimerReclamation);
  const [filtre, setFiltre] = useState<Filtre>('en_cours');
  const [aSupprimer, setASupprimer] = useState<Demande | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const demandes = useMemo(() => construireDemandes(dossiers, reclamations), [dossiers, reclamations]);
  const compte = (f: Filtre) => (f === 'toutes' ? demandes.length : demandes.filter((d) => d.etat === f).length);
  const visibles = demandes.filter((d) => filtre === 'toutes' || d.etat === filtre);
  const jours = useMemo(() => grouper(visibles, (d) => d.creeLe, cleJour, (d) => libelleJour(d)), [visibles]);

  function ouvrir(d: Demande, modifier = false) {
    const route = d.genre === 'dossier' ? `/dossier/${d.id}` : `/reclamation/${d.id}`;
    router.push((modifier ? `${route}?modifier=1` : route) as any);
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    setSuppressionEnCours(true);
    const message =
      aSupprimer.genre === 'dossier' ? await annulerDossier(aSupprimer.id) : await supprimerReclamation(aSupprimer.id);
    setSuppressionEnCours(false);
    setASupprimer(null);
    setErreur(message);
  }

  function carte(d: Demande) {
    return (
      <Card key={d.cle} style={styles.card}>
        <Pressable onPress={() => ouvrir(d)}>
          <View style={styles.rowBetween}>
            <View style={styles.heure}>
              <Ionicons name="time-outline" size={14} color={c.primaryDark} />
              <Text style={styles.heureTexte}>{d.creeLe ? heureCourte(d.creeLe) : '--:--'}</Text>
            </View>
            <Badge label={d.badge.label} tone={d.badge.tone} />
          </View>
          <View style={styles.titreWrap}>
            <Ionicons name={d.icone} size={17} color={c.primaryDark} />
            <Text style={styles.titre} numberOfLines={2}>
              {d.titre}
            </Text>
          </View>
          <Text style={styles.meta}>Réf. {d.reference}</Text>
          {d.resume ? (
            <Text style={styles.resume} numberOfLines={2}>
              {d.resume}
            </Text>
          ) : null}
        </Pressable>

        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => ouvrir(d)}>
            <Ionicons name="eye-outline" size={17} color={c.ink} />
            <Text style={styles.actionTexte}>Détails</Text>
          </Pressable>
          {d.etat === 'en_cours' && d.genre === 'dossier' && (
            <Pressable style={styles.action} onPress={() => router.push('/(tabs)/suivi')}>
              <Ionicons name="navigate-outline" size={17} color={c.ink} />
              <Text style={styles.actionTexte}>Suivre</Text>
            </Pressable>
          )}
          {d.etat === 'en_cours' && (
            <>
              <Pressable
                style={[styles.action, !d.modifiable && styles.actionInactive]}
                onPress={() => (d.modifiable ? ouvrir(d, true) : setErreur(d.raisonVerrou ?? 'Modification impossible.'))}
              >
                <Ionicons name="create-outline" size={17} color={c.ink} />
                <Text style={styles.actionTexte}>Modifier</Text>
              </Pressable>
              <Pressable
                style={[styles.action, !d.modifiable && styles.actionInactive]}
                onPress={() => (d.modifiable ? setASupprimer(d) : setErreur(d.raisonVerrou ?? 'Suppression impossible.'))}
              >
                <Ionicons name="trash-outline" size={17} color={c.danger} />
                <Text style={[styles.actionTexte, { color: c.danger }]}>Supprimer</Text>
              </Pressable>
            </>
          )}
        </View>
      </Card>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Mes demandes" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[typography.caption as any, styles.intro]}>
          Vos demandes sont classées par jour, de la plus récente à la plus ancienne, avec l'heure de dépôt. Vous pouvez les
          consulter, les modifier ou les supprimer tant que le technicien n'est pas parti.
        </Text>

        {erreur ? (
          <View style={{ marginBottom: spacing.lg }}>
            <InfoBanner icon="alert-circle" text={erreur} />
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Nouvelle demande</Text>
        <View style={styles.grid}>
          <QuickAction icon="add-circle-outline" label="Nouvel abonnement" onPress={() => router.push('/eligibilite')} />
          <QuickAction icon="car-outline" label="Déménagement" onPress={() => router.push('/demenagement')} />
          <QuickAction icon="alert-circle-outline" label="Signalement" onPress={() => router.push('/reclamation')} />
        </View>

        <Text style={styles.sectionTitle}>Mes demandes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtres} style={styles.filtresZone}>
          {FILTRES.map((f) => {
            const actif = filtre === f.id;
            return (
              <Pressable key={f.id} style={[styles.filtre, actif && styles.filtreActif]} onPress={() => setFiltre(f.id)} accessibilityRole="button" accessibilityState={{ selected: actif }}>
                <Text style={[styles.filtreTexte, actif && styles.filtreTexteActif]}>
                  {f.label} ({compte(f.id)})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {visibles.length === 0 ? (
          <Card style={styles.card}>
            <Text style={styles.resume}>
              {filtre === 'en_cours'
                ? 'Aucune demande non résolue.'
                : filtre === 'resolue'
                  ? 'Aucune demande résolue.'
                  : filtre === 'annulee'
                    ? 'Aucune demande annulée.'
                    : 'Aucune demande pour le moment.'}
            </Text>
          </Card>
        ) : (
          jours.map((j) => (
            <View key={j.cle}>
              <View style={styles.jourTete}>
                <Ionicons name="calendar-outline" size={16} color={c.primaryDark} />
                <Text style={styles.jourTitre}>{j.libelle}</Text>
                <Text style={styles.jourNombre}>
                  {j.elements.length} demande{j.elements.length > 1 ? 's' : ''}
                </Text>
              </View>
              {j.elements.map(carte)}
            </View>
          ))
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <ConfirmModal
        visible={!!aSupprimer}
        danger
        loading={suppressionEnCours}
        title="Supprimer cette demande ?"
        message={
          aSupprimer?.genre === 'dossier'
            ? `La demande ${aSupprimer.reference} sera annulée et retirée de vos demandes en cours. Orange en conserve la trace dans votre historique.`
            : `Le signalement ${aSupprimer?.reference ?? ''} sera définitivement supprimé.`
        }
        confirmLabel="Supprimer"
        onConfirm={confirmerSuppression}
        onCancel={() => setASupprimer(null)}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: spacing.lg },
    intro: { marginTop: spacing.xs, marginBottom: spacing.lg, color: c.muted },
    sectionTitle: { ...(typography.h3 as any), color: c.ink, marginBottom: spacing.md, marginTop: spacing.sm },
    card: { marginBottom: spacing.md },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    heure: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.primarySoft,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
    },
    heureTexte: { fontSize: 14, fontWeight: '800', color: c.primaryDark, fontVariant: ['tabular-nums'] },
    titreWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
    titre: { flex: 1, ...(typography.bodyBold as any), color: c.ink },
    meta: { fontSize: 12.5, color: c.muted, marginTop: 4 },
    resume: { fontSize: 13.5, color: c.slate, marginTop: spacing.sm },
    filtresZone: { flexGrow: 0, marginBottom: spacing.md },
    filtres: { gap: spacing.sm, paddingRight: spacing.lg },
    filtre: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8 },
    filtreActif: { borderColor: c.primary, backgroundColor: c.primarySoft },
    filtreTexte: { fontSize: 13, fontWeight: '700', color: c.slate },
    filtreTexteActif: { color: c.primaryDark },
    jourTete: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.sm },
    jourTitre: { flex: 1, fontSize: 14, fontWeight: '800', color: c.ink },
    jourNombre: { fontSize: 12, color: c.muted, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.md },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    actionInactive: { opacity: 0.45 },
    actionTexte: { fontSize: 13, fontWeight: '700', color: c.ink },
  });
}
