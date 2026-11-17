import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/ConfirmModal';
import { VerificationCodeModal } from '@/components/VerificationCodeModal';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ColorTokens, radius, shadow, spacing, typography } from '@/constants/theme';
import { DEMO_SEUL } from '@/constants/envDemo';
import { trouverProfilDemoParCode } from '@/data/mockData';
import { connecterReel, renvoyerCodeReel, restaurerEtatDemo, verifierCodeReel } from '@/services/modeReel';
import { useAppStore } from '@/store/useAppStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors, useT } from '@/store/useSettingsStore';

export default function ConnexionScreen() {
  const router = useRouter();
  const c = useColors();
  const t = useT();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const chargerProfilDemo = useAppStore((s) => s.chargerProfilDemo);
  const definirCodeBox = useAppStore((s) => s.definirCodeBox);

  // Le client ne s'inscrit pas depuis l'app : il est enregistré en base par
  // un technicien. En démo, 4 codes de box incarnent 4 utilisateurs type.
  const [login, setLogin] = useState('');
  const [telephone, setTelephone] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  // Première connexion : code de vérification envoyé par SMS (voir POST /api/auth/connexion).
  const [verif, setVerif] = useState<{ idCompte: number; telephoneMasque?: string; codeTest?: string } | null>(null);
  const [erreurCode, setErreurCode] = useState('');

  const estDemo = !!trouverProfilDemoParCode(login);
  const codeSaisi = login.trim().length >= 6;
  // Le téléphone est toujours demandé ; il n'est obligatoire que pour un vrai code de box
  // (les 4 codes de démonstration n'en ont pas besoin).
  const telephoneValide = telephone.replace(/\D/g, '').length >= 8;
  const connexionValide = codeSaisi && (estDemo || telephoneValide);

  async function onContinuer() {
    if (!connexionValide || enCours) return;
    setErreur('');

    const profil = trouverProfilDemoParCode(login);
    if (profil) {
      // Mode démo : données d'exemple, aucune donnée réelle, assistant IA désactivé.
      restaurerEtatDemo();
      useSessionStore.getState().ouvrirModeDemo();
      chargerProfilDemo(profil);
      router.replace(profil.route as never);
      return;
    }

    if (DEMO_SEUL) {
      setErreur("Cette version de test n'accepte que les codes de démonstration : BOX-CI-10001, BOX-CI-10002, BOX-CI-10003 ou BOX-CI-10004.");
      return;
    }

    setEnCours(true);
    const resultat = await connecterReel(login.trim().toUpperCase(), telephone.trim());
    setEnCours(false);
    if (resultat.succes) {
      definirCodeBox(login);
      router.replace('/(tabs)/accueil');
    } else if (resultat.code === 'VERIFICATION_REQUISE' && resultat.idCompte) {
      setErreurCode('');
      setVerif({ idCompte: resultat.idCompte, telephoneMasque: resultat.telephoneMasque, codeTest: resultat.codeTest });
    } else {
      setErreur(resultat.message ?? 'Connexion impossible.');
    }
  }

  async function onValiderCode(code: string) {
    if (!verif) return;
    setEnCours(true);
    setErreurCode('');
    try {
      await verifierCodeReel(verif.idCompte, code, login.trim().toUpperCase());
      setVerif(null);
      definirCodeBox(login);
      router.replace('/(tabs)/accueil');
    } catch (e) {
      setErreurCode(e instanceof Error ? e.message : 'Code incorrect.');
    } finally {
      setEnCours(false);
    }
  }

  async function onRenvoyerCode() {
    if (!verif) return;
    try {
      const r = await renvoyerCodeReel(verif.idCompte);
      setVerif({ ...verif, telephoneMasque: r.telephoneMasque ?? verif.telephoneMasque, codeTest: r.codeTest });
      setErreurCode('');
    } catch (e) {
      setErreurCode(e instanceof Error ? e.message : "Impossible de renvoyer le code.");
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Visuel du projet : s'adapte à la place disponible au-dessus du formulaire */}
          <View style={styles.top}>
            <Image source={require('../assets/images/connexion.jpg')} style={styles.visuel} resizeMode="contain" accessibilityLabel="Cortex Fiber" />
          </View>

          <View style={styles.card}>
            <Text style={[typography.h2 as any, styles.title]}>{t('welcome.title')}</Text>

            <View style={{ marginTop: spacing.md }}>
              <TextField
                label={t('welcome.codeLabel')}
                value={login}
                onChangeText={setLogin}
                placeholder="BOX-CI-77492"
                autoCapitalize="characters"
                maxLength={14}
                icon="hardware-chip-outline"
              />
              {/* Seule la version de test partagée garde une indication : elle liste les codes de démonstration. */}
              {DEMO_SEUL && <Text style={styles.hint}>Version de test : utilisez BOX-CI-10001, 10002, 10003 ou 10004.</Text>}
              <TextField
                label="Numéro de téléphone"
                value={telephone}
                onChangeText={setTelephone}
                placeholder="07 07 12 34 56"
                keyboardType="phone-pad"
                maxLength={14}
                icon="call-outline"
              />
            </View>

            <Button
              label={t('welcome.connect')}
              icon="arrow-forward"
              iconPosition="right"
              disabled={!connexionValide}
              loading={enCours && !verif}
              onPress={onContinuer}
            />

            <Text style={styles.linkIntro}>{t('welcome.pasClient')}</Text>
            <View style={{ marginTop: spacing.sm }}>
              <Button
                label={t('welcome.creerCompte')}
                icon="search"
                variant="secondary"
                onPress={() => router.push('/eligibilite')}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Message d'erreur en fenêtre : code de box ou téléphone qui ne correspondent pas, serveur injoignable… */}
      <ConfirmModal
        visible={!!erreur}
        danger
        title="Connexion impossible"
        message={erreur}
        confirmLabel="Réessayer"
        cancelLabel="Fermer"
        onConfirm={() => setErreur('')}
        onCancel={() => setErreur('')}
      />

      <VerificationCodeModal
        visible={!!verif}
        telephoneMasque={verif?.telephoneMasque}
        codeTest={verif?.codeTest}
        erreur={erreurCode}
        loading={enCours}
        onValider={onValiderCode}
        onRenvoyer={onRenvoyerCode}
        onFermer={() => setVerif(null)}
      />
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    flex: { flex: 1 },
    // Le visuel a un fond blanc cassé uniforme (#FAFAFA) : le fond de l'écran a la même couleur, quel que soit le thème.
    container: { flex: 1, overflow: 'hidden', backgroundColor: '#FAFAFA' },
    top: { flex: 1, minHeight: 150, backgroundColor: '#FAFAFA' },
    visuel: { width: '100%', height: '100%' },
    card: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.border,
      ...shadow.floating,
      padding: spacing.lg,
      paddingBottom: spacing.lg + spacing.sm,
    },
    title: { textAlign: 'center', color: c.ink },
    subtitle: { textAlign: 'center', marginTop: spacing.sm, color: c.muted },
    linkIntro: { textAlign: 'center', fontSize: 13, color: c.slate, marginTop: spacing.lg },
    hint: { fontSize: 12, color: c.muted, marginTop: -spacing.xs, marginBottom: spacing.xs },
  });
}
