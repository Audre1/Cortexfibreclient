import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { useColors } from '@/store/useSettingsStore';

interface Props {
  visible: boolean;
  /** Numéro masqué auquel le code a été envoyé (ex. « 07******91 »). */
  telephoneMasque?: string;
  /** Code renvoyé par le serveur UNIQUEMENT quand aucune passerelle SMS n'est branchée (mode test). */
  codeTest?: string;
  erreur?: string;
  loading?: boolean;
  onValider: (code: string) => void;
  onRenvoyer: () => void;
  onFermer: () => void;
}

// Première connexion : le client confirme qu'il possède bien le téléphone enregistré (code à 4 chiffres).
export function VerificationCodeModal({
  visible,
  telephoneMasque,
  codeTest,
  erreur,
  loading = false,
  onValider,
  onRenvoyer,
  onFermer,
}: Props) {
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (visible) setCode('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <Pressable style={styles.overlay} onPress={onFermer}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={c.primary} />
          </View>
          <Text style={styles.title}>Code de vérification</Text>
          <Text style={styles.message}>
            {telephoneMasque
              ? `Un code à 4 chiffres a été envoyé au ${telephoneMasque}.`
              : 'Saisissez le code à 4 chiffres reçu par SMS.'}
          </Text>
          {!!codeTest && (
            <Text style={styles.test}>Mode test (aucune passerelle SMS branchée) : votre code est {codeTest}.</Text>
          )}
          <TextField
            label="Code reçu par SMS"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            keyboardType="number-pad"
            maxLength={4}
            icon="keypad-outline"
            error={erreur}
          />
          <Button label="Valider" loading={loading} disabled={code.length !== 4} onPress={() => onValider(code)} />
          <View style={{ marginTop: spacing.sm }}>
            <Button label="Renvoyer le code" variant="ghost" onPress={onRenvoyer} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: { width: '100%', maxWidth: 360, backgroundColor: c.surface, borderRadius: radius.xl, padding: spacing.xl },
    iconWrap: {
      alignSelf: 'center',
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: { ...(typography.h3 as any), color: c.ink, textAlign: 'center', marginBottom: spacing.xs },
    message: { ...(typography.body as any), color: c.slate, textAlign: 'center', marginBottom: spacing.md },
    test: { ...(typography.caption as any), color: c.warning, textAlign: 'center', marginBottom: spacing.md },
  });
}
