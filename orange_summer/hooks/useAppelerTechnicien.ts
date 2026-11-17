import { useRouter } from 'expo-router';
import { Alert, Linking } from 'react-native';

import { Technicien } from '@/data/types';
import { useSessionStore } from '@/store/useSessionStore';

// « Appeler » : en mode réel on compose le vrai numéro du technicien (application Téléphone) ;
// en mode démo on garde l'écran d'appel simulé de l'application.
export function useAppelerTechnicien() {
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);

  return (technicien?: Technicien) => {
    if (mode !== 'reel') {
      router.push('/appel');
      return;
    }
    const numero = (technicien?.telephone ?? '').replace(/[^\d+]/g, '');
    if (!numero) {
      Alert.alert('Numéro indisponible', "Le numéro du technicien n'est pas disponible. Appelez le 3900.");
      return;
    }
    Linking.openURL(`tel:${numero}`).catch(() =>
      Alert.alert('Appel impossible', `Impossible de lancer l'appel. Composez le ${numero}.`)
    );
  };
}
