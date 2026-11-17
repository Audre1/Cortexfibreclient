import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DEMO_SEUL } from '@/constants/envDemo';
import { ColorTokens, spacing, typography } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

export default function NotFoundScreen() {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  // Version de test partagée : l'adresse de la page hébergeante n'est pas une route de l'app, on revient à l'accueil.
  if (DEMO_SEUL) return <Redirect href="/" />;
  return (
    <>
      <Stack.Screen options={{ title: 'Page introuvable' }} />
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
        <Text style={[typography.h3 as any, styles.title]}>Cette page n'existe pas.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Retour à l'accueil</Text>
        </Link>
      </View>
    </>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { marginTop: spacing.md },
  link: { marginTop: spacing.lg, paddingVertical: spacing.sm },
  linkText: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
}