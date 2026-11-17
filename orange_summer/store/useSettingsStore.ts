// Réglages utilisateur (thème + langue), persistés sur l'appareil.
// Les écrans lisent les couleurs via useColors() et les textes via useT(),
// pour réagir immédiatement à un changement de thème ou de langue.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';

import { ColorTokens, darkColors, definirPaletteActive, lightColors } from '@/constants/theme';
import { Langue, traduire } from '@/constants/i18n';

export type ThemeMode = 'light' | 'dark' | 'system';

const CLE_THEME = 'cortex.themeMode';
const CLE_LANGUE = 'cortex.langue';
const CLE_ONBOARDING = 'cortex.onboardingVu';

interface SettingsState {
  themeMode: ThemeMode;
  langue: Langue;
  /** L'onboarding n'est montré qu'au premier lancement (après installation). */
  onboardingVu: boolean;
  hydrate: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  setLangue: (langue: Langue) => void;
  marquerOnboardingVu: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: 'system',
  langue: 'fr',
  onboardingVu: false,

  hydrate: async () => {
    try {
      const [mode, langue, onboarding] = await Promise.all([
        AsyncStorage.getItem(CLE_THEME),
        AsyncStorage.getItem(CLE_LANGUE),
        AsyncStorage.getItem(CLE_ONBOARDING),
      ]);
      set((state) => ({
        themeMode: (mode as ThemeMode) || state.themeMode,
        langue: (langue as Langue) || state.langue,
        onboardingVu: onboarding === '1' ? true : state.onboardingVu,
      }));
    } catch {
      // Stockage indisponible : on garde les valeurs par défaut.
    }
  },

  marquerOnboardingVu: () => {
    set({ onboardingVu: true });
    AsyncStorage.setItem(CLE_ONBOARDING, '1').catch(() => {});
  },

  setThemeMode: (themeMode) => {
    set({ themeMode });
    AsyncStorage.setItem(CLE_THEME, themeMode).catch(() => {});
  },

  setLangue: (langue) => {
    set({ langue });
    AsyncStorage.setItem(CLE_LANGUE, langue).catch(() => {});
  },
}));

/** Thème effectif (résout « système » selon le réglage du téléphone). */
export function useThemeEffectif(): 'light' | 'dark' {
  const mode = useSettingsStore((s) => s.themeMode);
  const systeme = useColorScheme();
  if (mode === 'system') return systeme === 'dark' ? 'dark' : 'light';
  return mode;
}

/** Palette de couleurs active (claire ou sombre). */
export function useColors(): ColorTokens {
  const palette = useThemeEffectif() === 'dark' ? darkColors : lightColors;
  definirPaletteActive(palette); // les styles `typography` suivent le thème
  return palette;
}

/** Fonction de traduction liée à la langue active : t('profil.title'). */
export function useT(): (cle: string) => string {
  const langue = useSettingsStore((s) => s.langue);
  return (cle: string) => traduire(langue, cle);
}
