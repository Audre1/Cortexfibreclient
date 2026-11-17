// Couleur par défaut des <Text> : celle du thème actif (noir en clair, blanc cassé en sombre).
// React Native affiche en noir tout texte sans couleur explicite ; ce réglage évite du texte noir sur
// fond sombre. Les couleurs données par les styles gardent la priorité.
import React from 'react';
import { Text } from 'react-native';

import { paletteCourante } from '@/constants/theme';

const TexteNatif = Text as unknown as { render?: (props: any, ref: any) => React.ReactElement | null; __couleurParDefaut?: boolean };

if (TexteNatif.render && !TexteNatif.__couleurParDefaut) {
  TexteNatif.__couleurParDefaut = true;
  const rendreOriginal = TexteNatif.render;
  TexteNatif.render = function (props: any, ref: any) {
    return rendreOriginal.call(this, { ...props, style: [{ color: paletteCourante().ink }, props.style] }, ref);
  };
}
