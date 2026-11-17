import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { ApiError } from '@/services/apiClient';
import { rechargeApi } from '@/services/backendService';
import { useAppStore } from '@/store/useAppStore';
import { useEspaceReelStore } from '@/store/useEspaceReelStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors } from '@/store/useSettingsStore';

const DUREES = [1, 3, 6, 12];

export default function RechargeScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const modeReel = useSessionStore((s) => s.mode === 'reel');
  const idClient = useSessionStore((s) => s.idClient);
  const client = useAppStore((s) => s.client);
  const ligne = useEspaceReelStore((s) => s.ligneActive);

  const [duree, setDuree] = useState(1);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [resultat, setResultat] = useState<{ reference: string; montant: number; statut: string } | null>(null);

  const prixMensuel = ligne?.offre?.prixFCFA ?? null;

  async function demander() {
    if (!idClient || !ligne) return;
    setEnvoi(true);
    setErreur('');
    try {
      const { recharge } = await rechargeApi.creer({ id_client: idClient, id_ligne: ligne.idLigne, duree_mois: duree, moyen: 'Orange Money' });
      setResultat({ reference: recharge.reference_transaction, montant: recharge.montant_fcfa, statut: recharge.statut });
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : "La demande n'a pas pu être enregistrée.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!modeReel) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Rechargement" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <InfoBanner tone="warning" icon="flask-outline" text="Le rechargement n'est disponible qu'avec un compte connecté (code de box et téléphone), pas en mode démonstration." />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Rechargement" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.ligneLabel}>LIGNE SÉLECTIONNÉE</Text>
          <Text style={[typography.h3 as any, { color: c.ink }]}>{ligne?.numeroBox || client.telephone}</Text>
          <Text style={typography.caption as any}>
            {ligne?.offre ? `${ligne.offre.nom} · ${ligne.offre.debit}` : "Aucune offre active sur cette ligne"}
          </Text>
        </Card>

        {prixMensuel === null ? (
          <View style={{ marginTop: spacing.lg }}>
            <InfoBanner tone="warning" icon="alert-circle" text="Cette ligne n'a pas d'offre active à recharger." />
          </View>
        ) : resultat ? (
          <>
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={[typography.h3 as any, { color: c.ink }]}>Demande enregistrée</Text>
              <Text style={[typography.body as any, { color: c.slate, marginTop: spacing.sm }]}>
                Référence {resultat.reference} · {resultat.montant.toLocaleString('fr-FR')} FCFA.
              </Text>
            </Card>
            <View style={{ marginTop: spacing.md }}>
              <InfoBanner
                tone="warning"
                icon="alert-circle"
                text="Le paiement en ligne n'est pas encore branché : cette demande est « en attente » et votre ligne n'est PAS rechargée tant qu'un paiement n'est pas confirmé. Rapprochez-vous d'une agence Orange ou du 3900."
              />
            </View>
            <View style={{ marginTop: spacing.lg }}>
              <Button label="Terminer" onPress={() => router.back()} />
            </View>
          </>
        ) : (
          <>
            <Text style={[typography.h3 as any, styles.sectionTitle]}>Durée du rechargement</Text>
            <View style={styles.grid}>
              {DUREES.map((d) => (
                <Pressable key={d} style={[styles.option, duree === d && styles.optionActive]} onPress={() => setDuree(d)}>
                  {duree === d && (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={11} color={c.white} />
                    </View>
                  )}
                  <Text style={[typography.bodyBold as any, { color: duree === d ? c.primaryDark : c.ink }]}>
                    {d} mois
                  </Text>
                  <Text style={[styles.prix, duree === d && { color: c.primaryDark }]}>
                    {(d * prixMensuel).toLocaleString('fr-FR')} FCFA
                  </Text>
                </Pressable>
              ))}
            </View>
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={styles.recapLabel}>Montant (durée × prix mensuel de votre offre)</Text>
              <Text style={styles.total}>{(duree * prixMensuel).toLocaleString('fr-FR')} FCFA</Text>
              <Text style={typography.caption as any}>Moyen de paiement : Orange Money</Text>
            </Card>
            {!!erreur && (
              <View style={{ marginTop: spacing.md }}>
                <InfoBanner tone="warning" icon="alert-circle" text={erreur} />
              </View>
            )}
            <View style={{ marginTop: spacing.lg }}>
              <Button label="Demander le rechargement" icon="card-outline" loading={envoi} onPress={demander} />
            </View>
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
    scroll: { padding: spacing.lg },
    ligneLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: c.muted, marginBottom: spacing.xs },
    sectionTitle: { color: c.ink, marginTop: spacing.xl, marginBottom: spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    option: {
      width: '47%',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.border,
      padding: spacing.lg,
    },
    optionActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
    check: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    prix: { ...(typography.caption as any), color: c.slate, marginTop: spacing.xs },
    recapLabel: { ...(typography.caption as any), color: c.muted },
    total: { fontSize: 24, fontWeight: '800', color: c.ink, marginVertical: spacing.xs },
  });
}
