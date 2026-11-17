import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/ConfirmModal';
import { StepperHorizontal } from '@/components/StepperHorizontal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { ColorTokens, spacing, typography } from '@/constants/theme';
import { libellesCategorieReclamation } from '@/data/mockData';
import { ReclamationCategorie } from '@/data/types';
import { reclamationModifiable } from '@/services/demandes';
import { dateHeure } from '@/services/formatage';
import { useAppStore } from '@/store/useAppStore';
import { useColors } from '@/store/useSettingsStore';

const LABEL_PAR_STATUT = { ouverte: 'Ouverte', en_traitement: 'En cours de traitement', resolue: 'Résolue' } as const;

const ICONES_RECLAMATION: Record<string, keyof typeof Ionicons.glyphMap> = {
  envoyee: 'document-text',
  analyse: 'search',
  info: 'chatbubble-ellipses',
};

export default function SuiviReclamationScreen() {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ id: string; modifier?: string }>();
  const router = useRouter();
  const reclamations = useAppStore((s) => s.reclamations);
  const ajouterInfoReclamation = useAppStore((s) => s.ajouterInfoReclamation);
  const modifierReclamation = useAppStore((s) => s.modifierReclamation);
  const supprimerReclamation = useAppStore((s) => s.supprimerReclamation);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [texteInfo, setTexteInfo] = useState('');
  const reclamation = reclamations.find((r) => r.id === params.id);
  const [edition, setEdition] = useState(params.modifier === '1');
  const [descriptionEdit, setDescriptionEdit] = useState<string | null>(null);
  const [categorieEdit, setCategorieEdit] = useState<ReclamationCategorie | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [confirmerSuppr, setConfirmerSuppr] = useState(false);
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);

  if (!reclamation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Suivi de mon signalement" />
        <View style={styles.empty}>
          <Text style={typography.body as any}>Signalement introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const modifiable = reclamationModifiable(reclamation);
  const depot = dateHeure(reclamation.creeLe) ?? reclamation.date;
  const description = descriptionEdit ?? reclamation.description;
  const categorie = categorieEdit ?? reclamation.categorie;

  async function enregistrer() {
    if (!reclamation) return;
    const modifs: { description?: string; categorie?: ReclamationCategorie } = {};
    if (description.trim() && description.trim() !== reclamation.description) modifs.description = description.trim();
    if (categorie !== reclamation.categorie) modifs.categorie = categorie;
    if (!modifs.description && !modifs.categorie) {
      setMessage({ texte: "Vous n'avez rien modifié.", ok: false });
      return;
    }
    setEnCours(true);
    const erreur = await modifierReclamation(reclamation.id, modifs);
    setEnCours(false);
    if (erreur) {
      setMessage({ texte: erreur, ok: false });
      return;
    }
    setMessage({ texte: 'Votre signalement a été modifié.', ok: true });
    setEdition(false);
    setDescriptionEdit(null);
    setCategorieEdit(null);
  }

  async function supprimer() {
    if (!reclamation) return;
    setEnCours(true);
    const erreur = await supprimerReclamation(reclamation.id);
    setEnCours(false);
    setConfirmerSuppr(false);
    if (erreur) {
      setMessage({ texte: erreur, ok: false });
      return;
    }
    router.replace('/mes-demandes');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Suivi de mon signalement" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {message ? (
          <View style={{ marginBottom: spacing.lg }}>
            <InfoBanner icon={message.ok ? 'checkmark-circle' : 'alert-circle'} text={message.texte} />
          </View>
        ) : null}
        <View style={styles.headerRow}>
          <Text style={typography.bodyBold as any}>Réf. {reclamation.numero}</Text>
          <Badge label={libellesCategorieReclamation[reclamation.categorie]} tone="neutral" />
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardLabel}>STATUT ACTUEL</Text>
          <Text style={typography.h3 as any}>{LABEL_PAR_STATUT[reclamation.statut]}</Text>
          {depot ? <Text style={styles.compDate}>Déposé le {depot}</Text> : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardLabel}>MON SIGNALEMENT</Text>
          <Text style={typography.body as any}>{reclamation.description}</Text>
        </Card>

        {edition && modifiable.ok ? (
          <Card style={styles.card}>
            <Text style={styles.cardLabel}>CATÉGORIE</Text>
            <View style={styles.chips}>
              {(Object.keys(libellesCategorieReclamation) as ReclamationCategorie[]).map((cat) => (
                <Pressable key={cat} style={[styles.chip, categorie === cat && styles.chipChoisi]} onPress={() => setCategorieEdit(cat)}>
                  <Text style={[styles.chipTexte, categorie === cat && { color: colors.primaryDark }]}>{libellesCategorieReclamation[cat]}</Text>
                </Pressable>
              ))}
            </View>
            <TextField label="Description" value={description} onChangeText={setDescriptionEdit} multiline maxLength={2000} />
            <Button label="Enregistrer les modifications" icon="checkmark" loading={enCours} onPress={enregistrer} />
            <View style={{ marginTop: spacing.sm }}>
              <Button label="Annuler" variant="ghost" onPress={() => { setEdition(false); setDescriptionEdit(null); setCategorieEdit(null); setMessage(null); }} />
            </View>
          </Card>
        ) : (
          <>
            {!modifiable.ok && (
              <View style={{ marginBottom: spacing.md }}>
                <InfoBanner icon="lock-closed" text={modifiable.raison ?? 'Ce signalement ne peut plus être modifié.'} />
              </View>
            )}
            <View style={styles.actionsRow}>
              <View style={{ flex: 1 }}>
                <Button label="Modifier" icon="create-outline" variant="secondary" disabled={!modifiable.ok} onPress={() => { setMessage(null); setEdition(true); }} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Supprimer" icon="trash-outline" variant="ghost" disabled={!modifiable.ok} onPress={() => setConfirmerSuppr(true)} />
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Historique du traitement</Text>
        <Card>
          <StepperHorizontal etapes={reclamation.etapes} icones={ICONES_RECLAMATION} />
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <InfoBanner
            icon="information-circle"
            text="Notre équipe d'experts analyse actuellement votre dossier. Nous vous tiendrons informé de son évolution."
          />
        </View>

        {reclamation.complements && reclamation.complements.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Informations ajoutées</Text>
            <Card>
              {reclamation.complements.map((comp, i) => (
                <View key={i} style={i > 0 ? styles.compItem : undefined}>
                  <Text style={typography.body as any}>{comp.texte}</Text>
                  <Text style={styles.compDate}>{comp.date}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {ajoutOuvert ? (
          <View style={{ marginTop: spacing.lg }}>
            <TextField
              label="Information complémentaire"
              value={texteInfo}
              onChangeText={setTexteInfo}
              placeholder="Ajoutez un détail utile à votre dossier..."
            />
            <Button
              label="Envoyer l'information"
              icon="send"
              disabled={!texteInfo.trim()}
              onPress={() => {
                ajouterInfoReclamation(reclamation.id, texteInfo);
                setTexteInfo('');
                setAjoutOuvert(false);
              }}
            />
            <View style={{ marginTop: spacing.sm }}>
              <Button label="Annuler" variant="ghost" onPress={() => { setTexteInfo(''); setAjoutOuvert(false); }} />
            </View>
          </View>
        ) : (
          <Pressable style={styles.addLink} onPress={() => setAjoutOuvert(true)}>
            <Text style={styles.addLinkText}>+ Ajouter une information</Text>
          </Pressable>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <ConfirmModal
        visible={confirmerSuppr}
        danger
        loading={enCours}
        title="Supprimer ce signalement ?"
        message={`Le signalement ${reclamation.numero} sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        onConfirm={supprimer}
        onCancel={() => setConfirmerSuppr(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  card: { marginBottom: spacing.xl },
  cardLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.5, marginBottom: 2 },
  sectionTitle: { ...(typography.h3 as any), marginBottom: spacing.md },
  addLink: { alignItems: 'center', marginTop: spacing.lg },
  addLinkText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.xs },
  chip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipChoisi: { borderColor: colors.primary },
  chipTexte: { fontSize: 13, fontWeight: '600', color: colors.ink },
  compItem: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  compDate: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
});
}