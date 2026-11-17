import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ColorTokens, radius, spacing, typography } from '@/constants/theme';
import { formaterNumero, MAX_NUMEROS_AJOUTES } from '@/services/numeros';
import { useAppStore } from '@/store/useAppStore';
import { useColors } from '@/store/useSettingsStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Fenêtre « Mes numéros » : le numéro principal du compte + les numéros ajoutés par le client (2 au maximum).
// Le numéro choisi ici est celui affiché sur la carte de l'accueil.
export function NumerosModal({ visible, onClose }: Props) {
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const principal = useAppStore((s) => s.client.telephone);
  const numeros = useAppStore((s) => s.numeros);
  const afficheId = useAppStore((s) => s.numeroAfficheId);
  const ajouterNumero = useAppStore((s) => s.ajouterNumero);
  const supprimerNumero = useAppStore((s) => s.supprimerNumero);
  const choisir = useAppStore((s) => s.choisirNumeroAffiche);

  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const complet = numeros.length >= MAX_NUMEROS_AJOUTES;

  async function ajouter() {
    setEnCours(true);
    const message = await ajouterNumero(saisie);
    setEnCours(false);
    setErreur(message);
    if (!message) setSaisie('');
  }

  async function supprimer(id: string) {
    setErreur(await supprimerNumero(id));
  }

  function ligne(id: string | null, numero: string, etiquette: string) {
    const choisi = afficheId === id;
    return (
      <View key={id ?? 'principal'} style={styles.ligne}>
        <Pressable
          style={styles.ligneCorps}
          onPress={() => {
            choisir(id);
            onClose();
          }}
          accessibilityRole="radio"
          accessibilityState={{ selected: choisi }}
          accessibilityLabel={`${etiquette} ${numero}`}
        >
          <Ionicons name={choisi ? 'radio-button-on' : 'radio-button-off'} size={22} color={choisi ? c.primary : c.muted} />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={styles.numero}>{formaterNumero(numero)}</Text>
            <Text style={styles.etiquette}>{etiquette}</Text>
          </View>
        </Pressable>
        {id !== null && (
          <Pressable onPress={() => supprimer(id)} hitSlop={10} accessibilityLabel={`Supprimer le numéro ${numero}`}>
            <Ionicons name="trash-outline" size={20} color={c.danger} />
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.fond} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.centre}>
          <Pressable style={styles.feuille} onPress={() => {}}>
            <View style={styles.tete}>
              <Text style={[typography.h3 as any, { color: c.ink }]}>Mes numéros</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
                <Ionicons name="close" size={24} color={c.ink} />
              </Pressable>
            </View>
            <Text style={styles.aide}>Touchez un numéro pour l'afficher sur votre accueil.</Text>

            <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
              {ligne(null, principal, 'Numéro principal du compte')}
              {numeros.map((n) => ligne(n.id, n.numero, 'Numéro ajouté'))}

              <Text style={styles.compteur}>
                Numéros ajoutés : {numeros.length} / {MAX_NUMEROS_AJOUTES}
              </Text>

              {complet ? (
                <Text style={styles.limite}>Limite atteinte : supprimez un numéro pour en ajouter un autre.</Text>
              ) : (
                <View style={{ marginTop: spacing.sm }}>
                  <TextField
                    label="Ajouter un numéro"
                    value={saisie}
                    onChangeText={(t) => {
                      setSaisie(t);
                      setErreur(null);
                    }}
                    placeholder="07 07 12 34 56"
                    keyboardType="phone-pad"
                    maxLength={18}
                    icon="call-outline"
                    error={erreur ?? undefined}
                  />
                  <Button label="Ajouter" icon="add" loading={enCours} disabled={!saisie.trim()} onPress={ajouter} />
                </View>
              )}
              {complet && erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    fond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    centre: { width: '100%', maxWidth: 480, alignSelf: 'center' },
    feuille: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '90%',
    },
    tete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    aide: { fontSize: 13, color: c.muted, marginTop: spacing.xs, marginBottom: spacing.md },
    ligne: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    ligneCorps: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    numero: { fontSize: 17, fontWeight: '700', color: c.ink },
    etiquette: { fontSize: 12, color: c.muted, marginTop: 2 },
    compteur: { fontSize: 12.5, fontWeight: '700', color: c.slate, marginTop: spacing.sm },
    limite: { fontSize: 13, color: c.warning, marginTop: spacing.sm },
    erreur: { fontSize: 12.5, color: c.danger, marginTop: spacing.xs, fontWeight: '500' },
  });
}
