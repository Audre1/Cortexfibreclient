// Système de design CORTEX FIBER — aligné sur la charte officielle Orange
// "Palette de couleurs des illustrations" (Orange, mars 2017).
// Chaque couleur commentée "officielle" reprend exactement un ton PANTONE
// de ce document ; les tons non commentés sont des dérivés nécessaires à
// l'interface (fond de page, variantes de contraste texte) qui n'ont pas
// d'équivalent direct dans la charte illustration.

// Palette claire — charte officielle Orange "Palette des illustrations" (2017).
export const lightColors = {
  primary: '#FF7900', // PANTONE 151 — orange de marque
  primaryDark: '#CC6100', // dérivé plus foncé (texte/liens sur fond clair)
  primarySoft: '#FFEEDD', // dérivé clair (fonds, puces)

  black: '#000000', // Noir officiel
  ink: '#000000', // texte principal — Noir officiel
  slate: '#595959', // Gris foncé officiel
  muted: '#8F8F8F', // Gris moyen officiel
  border: '#D6D6D6', // Gris clair officiel
  surface: '#FFFFFF', // Blanc officiel
  background: '#F6F6F8', // fond de page — hors charte, nécessaire pour distinguer les cartes blanches

  success: '#0A6E31', // Vert foncé officiel (texte/icônes)
  successSoft: '#B8EBD6', // Vert clair officiel (fonds)

  warning: '#946200', // dérivé foncé du Jaune PANTONE 114, pour un contraste texte lisible
  warningSoft: '#FFF6B6', // Jaune clair officiel (fonds)

  danger: '#D8121F', // hors charte illustration (aucun rouge officiel dans ce document)
  dangerSoft: '#FDE7E8',

  info: '#085EBD', // Bleu foncé officiel (texte/icônes)
  infoSoft: '#B5E8F7', // Bleu clair officiel (fonds)

  white: '#FFFFFF', // Blanc officiel
} as const;

// Palette sombre — mêmes clés, dérivées pour un fond noir lisible. L'orange de
// marque est conservé ; les tons "Dark" servent au texte/liens sur fond sombre.
export type ColorTokens = { [K in keyof typeof lightColors]: string };

export const darkColors: ColorTokens = {
  primary: '#FF8C26',
  primaryDark: '#FFB877',
  primarySoft: '#2E2113',

  black: '#000000',
  ink: '#F5F1EA',
  slate: '#C9C2B8',
  muted: '#9A938A',
  border: '#38322A',
  surface: '#211D17',
  background: '#121010',

  success: '#4ADE80',
  successSoft: '#14321F',

  warning: '#F5C451',
  warningSoft: '#3A2E10',

  danger: '#F87171',
  dangerSoft: '#3A1715',

  info: '#5AB7E8',
  infoSoft: '#12303E',

  white: '#FFFFFF',
};

// Export rétro-compatible : les écrans non encore migrés importent `colors`
// (palette claire). Les écrans migrés utilisent le hook `useColors()`.
export const colors = lightColors;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// Palette active, tenue à jour par useColors() : les styles de texte ci-dessous lisent leur couleur
// au moment où ils sont utilisés, donc ils suivent le thème clair / sombre sans changer les écrans.
let paletteActive: ColorTokens = lightColors;
export function definirPaletteActive(p: ColorTokens) {
  paletteActive = p;
}
export function paletteCourante(): ColorTokens {
  return paletteActive;
}

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', get color() { return paletteActive.ink; }, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700', get color() { return paletteActive.ink; }, letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '600', get color() { return paletteActive.ink; } },
  body: { fontSize: 15, fontWeight: '400', get color() { return paletteActive.ink; }, lineHeight: 21 },
  bodyBold: { fontSize: 15, fontWeight: '600', get color() { return paletteActive.ink; } },
  caption: { fontSize: 13, fontWeight: '400', get color() { return paletteActive.muted; }, lineHeight: 18 },
  small: { fontSize: 12, fontWeight: '500', get color() { return paletteActive.muted; } },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;
