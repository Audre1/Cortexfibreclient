import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/ConfirmModal';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ColorTokens, spacing, typography } from '@/constants/theme';
import { deconnecterReel } from '@/services/modeReel';
import { useAppStore } from '@/store/useAppStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors, useT } from '@/store/useSettingsStore';

interface RowItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  c: ColorTokens;
}

function MenuRow({ icon, label, value, onPress, danger, c }: RowItem) {
  const styles = React.useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? c.danger : c.primaryDark} />
      </View>
      <Text style={[typography.body as any, styles.rowLabel, { color: danger ? c.danger : c.ink }]}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      )}
    </Pressable>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const c = useColors();
  const t = useT();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const client = useAppStore((s) => s.client);
  const dossiers = useAppStore((s) => s.dossiers);
  const codeBox = useAppStore((s) => s.codeBox);
  const [supprimerVisible, setSupprimerVisible] = React.useState(false);
  const modeReel = useSessionStore((s) => s.mode === 'reel');

  // Déconnexion : en mode réel, on ferme aussi la session et on efface les données du client de l'appareil.
  function seDeconnecter() {
    deconnecterReel();
    useSessionStore.getState().fermerSession();
    router.replace('/connexion');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[typography.h1 as any, { color: c.ink }]}>{t('profil.title')}</Text>

        <View style={styles.profileCard}>
          <Avatar initiales={`${client.prenom.charAt(0)}${client.nom.charAt(0)}`} size={64} />
          <Text style={[typography.h3 as any, styles.profileNom]}>
            {client.prenom.toUpperCase()} {client.nom.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('profil.infosPerso')}</Text>
        <Card padded={false}>
          <MenuRow c={c} icon="person" label={t('profil.nom')} value={`${client.prenom} ${client.nom}`} />
          <View style={styles.divider} />
          <MenuRow c={c} icon="call" label={t('profil.numero')} value={client.telephone} />
          <View style={styles.divider} />
          <MenuRow c={c} icon="hardware-chip" label={t('profil.codeBox')} value={codeBox} />
          <View style={styles.divider} />
          <MenuRow c={c} icon="business" label={t('profil.ville')} value={client.adresse.ville} />
          <View style={styles.divider} />
          <MenuRow c={c} icon="location" label={t('profil.adresse')} value={`${client.adresse.rue.split(',')[0]}`} />
        </Card>

        <Text style={styles.sectionTitle}>{t('profil.abonnements')}</Text>
        <Card padded={false}>
          <MenuRow c={c} icon="wifi" label={t('profil.mesLignes')} value={`${dossiers.length} ${t('profil.lignes')}`} />
          <View style={styles.divider} />
          <MenuRow c={c} icon="hardware-chip-outline" label={t('profil.appareils')} onPress={() => router.push('/gerer-wifi')} />
        </Card>

        <Text style={styles.sectionTitle}>{t('profil.assistance')}</Text>
        <Card padded={false}>
          <MenuRow
            c={c}
            icon="call-outline"
            label={t('profil.contactSAV')}
            onPress={() => Alert.alert('3900', '3900 (appel gratuit depuis une ligne Orange)')}
          />
          <View style={styles.divider} />
          <MenuRow c={c} icon="time-outline" label={t('profil.historique')} onPress={() => router.push('/reclamations')} />
        </Card>

        <Text style={styles.sectionTitle}>{t('profil.gestionCompte')}</Text>
        <Card padded={false}>
          <MenuRow c={c} icon="settings-outline" label={t('profil.parametres')} onPress={() => router.push('/parametres')} />
          <View style={styles.divider} />
          <MenuRow
            c={c}
            icon="trash-outline"
            label={t('profil.supprimer')}
            danger
            onPress={() => setSupprimerVisible(true)}
          />
          <View style={styles.divider} />
          <MenuRow c={c} icon="log-out" label={t('profil.deconnexion')} onPress={seDeconnecter} />
        </Card>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <ConfirmModal
        visible={supprimerVisible}
        danger
        title={t('profil.supprimerTitre')}
        message={
          modeReel
            ? "La suppression du compte n'est pas encore disponible dans l'application. Pour supprimer votre compte, contactez le service client Orange (3900)."
            : t('profil.supprimerMsg')
        }
        confirmLabel={modeReel ? 'OK' : t('common.supprimer')}
        cancelLabel={t('common.annuler')}
        onConfirm={() => {
          setSupprimerVisible(false);
          // Mode réel : rien n'est supprimé, on ne déconnecte donc pas le client comme si c'était fait.
          if (!modeReel) router.replace('/connexion');
        }}
        onCancel={() => setSupprimerVisible(false)}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: spacing.lg },
    profileCard: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.lg, paddingVertical: spacing.xl },
    profileNom: { marginTop: spacing.md, color: c.ink },
    sectionTitle: { ...(typography.h3 as any), fontSize: 15, color: c.muted, marginBottom: spacing.sm, marginTop: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    rowIconDanger: { backgroundColor: c.dangerSoft },
    rowLabel: { flex: 1 },
    rowValue: { color: c.muted, fontSize: 13, maxWidth: 150 },
    divider: { height: 1, backgroundColor: c.border, marginLeft: spacing.lg + 34 + spacing.md },
  });
}
