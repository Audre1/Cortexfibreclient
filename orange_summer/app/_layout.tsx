import '@/constants/textDefault';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { darkColors, lightColors } from '@/constants/theme';
import { estRtl } from '@/constants/i18n';
import { surSessionInvalide } from '@/services/apiClient';
import { deconnecterReel, reprendreSessionReelle } from '@/services/modeReel';
import { useColors, useSettingsStore, useThemeEffectif } from '@/store/useSettingsStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function construireTheme(mode: 'light' | 'dark') {
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const c = mode === 'dark' ? darkColors : lightColors;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.ink,
      border: c.border,
    },
  };
}

export default function RootLayout() {
  const hydrate = useSettingsStore((s) => s.hydrate);
  const langue = useSettingsStore((s) => s.langue);
  const mode = useThemeEffectif();
  const c = useColors();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    hydrate();
    SplashScreen.hideAsync();
  }, [hydrate]);

  // Mode réel : reprend la session conservée sur l'appareil ; si le serveur refuse le jeton
  // (session expirée), on déconnecte proprement et on revient à l'écran de connexion.
  useEffect(() => {
    surSessionInvalide(() => {
      deconnecterReel();
      try {
        router.replace('/connexion');
      } catch {
        // navigation pas encore prête : l'écran de connexion s'affichera au prochain lancement
      }
    });
    reprendreSessionReelle().catch(() => {});
    return () => surSessionInvalide(null);
  }, []);

  // Sens d'écriture (arabe = droite à gauche) — appliqué sur le web.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.dir = estRtl(langue) ? 'rtl' : 'ltr';
      document.documentElement.lang = langue;
    }
  }, [langue]);

  const contenu = (
    <ThemeProvider value={construireTheme(mode)}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="connexion" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cortex" options={{ presentation: 'card' }} />
        <Stack.Screen name="eligibilite" options={{ presentation: 'card' }} />
        <Stack.Screen name="parametres" options={{ presentation: 'card' }} />
        <Stack.Screen name="commande" options={{ presentation: 'card' }} />
        <Stack.Screen name="demande-confirmation" options={{ presentation: 'card', gestureEnabled: false }} />
        <Stack.Screen name="technicien/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="signalement-absence" options={{ presentation: 'modal' }} />
        <Stack.Screen name="signalement-probleme" options={{ presentation: 'card' }} />
        <Stack.Screen name="intervention-confirmation" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reclamation" options={{ presentation: 'card' }} />
        <Stack.Screen name="reclamation-confirmation" options={{ presentation: 'card', gestureEnabled: false }} />
        <Stack.Screen name="reclamations" options={{ presentation: 'card' }} />
        <Stack.Screen name="reclamation/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="dossier/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="diagnostic" options={{ presentation: 'card' }} />
        <Stack.Screen name="gerer-wifi" options={{ presentation: 'card' }} />
        <Stack.Screen name="livebox" options={{ presentation: 'card' }} />
        <Stack.Screen name="constat" options={{ presentation: 'card' }} />
        <Stack.Screen name="recharge" options={{ presentation: 'card' }} />
        <Stack.Screen name="changement-offre" options={{ presentation: 'card' }} />
        <Stack.Screen name="mes-demandes" options={{ presentation: 'card' }} />
        <Stack.Screen name="historique" options={{ presentation: 'card' }} />
        <Stack.Screen name="demenagement" options={{ presentation: 'card' }} />
        <Stack.Screen name="demenagement-nouvelle-demande" options={{ presentation: 'card' }} />
        <Stack.Screen name="demande-installation" options={{ presentation: 'card' }} />
        <Stack.Screen name="choix-offre" options={{ presentation: 'card' }} />
      </Stack>
    </ThemeProvider>
  );

  if (Platform.OS !== 'web') return contenu;

  // Sur navigateur : sur telephone, l'app occupe tout l'ecran ; sur ordinateur, elle s'affiche dans un
  // cadre de telephone centre (coins arrondis, ombre) dont la hauteur suit celle de la fenetre.
  const surOrdinateur = width > 500;
  const hauteurCadre = Math.min(height - 32, 900);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === 'dark' ? '#000' : '#e5e5e5', overflow: 'hidden' }}>
      <View
        style={[
          { width: '100%', maxWidth: 430, overflow: 'hidden', backgroundColor: c.background },
          surOrdinateur
            ? {
                height: hauteurCadre,
                borderRadius: 36,
                borderWidth: 8,
                borderColor: mode === 'dark' ? '#2a2a2a' : '#111',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              }
            : { flex: 1 },
        ]}
      >
        {contenu}
      </View>
    </View>
  );
}
