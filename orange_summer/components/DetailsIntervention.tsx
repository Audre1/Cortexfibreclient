import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ColorTokens, spacing, typography } from '@/constants/theme';
import { Dossier } from '@/data/types';
import { LIBELLE_STATUT_TERRAIN, LIBELLE_TYPE_DOSSIER, TRAVAUX_PAR_TYPE } from '@/services/demandes';
import { dateHeure, dureeEntre, dureeMinutes, heureDe, jourLong } from '@/services/formatage';
import { useSessionStore } from '@/store/useSessionStore';
import { useColors } from '@/store/useSettingsStore';

interface Ligne {
  icone: keyof typeof Ionicons.glyphMap;
  label: string;
  valeur: string;
}

// Détail d'une demande / intervention : ce que le technicien vient faire, où, quand, et depuis quand
// la demande existe. N'affiche que ce que le dossier contient réellement (pas de valeur inventée).
export function DetailsIntervention({ dossier, titre = "Détails de l'intervention" }: { dossier: Dossier; titre?: string }) {
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const reel = useSessionStore((s) => s.mode === 'reel');

  const adresse = [dossier.adresse.numero, dossier.adresse.rue, dossier.adresse.ville].filter(Boolean).join(', ');
  const lignes: Ligne[] = [];
  const depot = dateHeure(dossier.creeLe);
  if (depot) lignes.push({ icone: 'time-outline', label: 'Demande déposée le', valeur: depot });
  lignes.push({ icone: 'document-text-outline', label: 'Dossier', valeur: `${dossier.numero} · ${LIBELLE_TYPE_DOSSIER[dossier.type]}` });
  if (dossier.typeIntervention) lignes.push({ icone: 'construct-outline', label: "Type d'intervention", valeur: dossier.typeIntervention });
  if (adresse) lignes.push({ icone: 'location-outline', label: "Lieu d'intervention", valeur: adresse });
  const prevu = TRAVAUX_PAR_TYPE[dossier.type];
  const plan = dossier.planification;
  if (prevu && !dossier.annule) {
    // Le client ne choisit rien : jour, heure et durée sont planifiés par Orange et lus dans la base.
    // Mode réel : jamais de valeur inventée, « communiqué par Orange » tant que rien n'est planifié.
    const attente = 'Communiqué par Orange dès que votre intervention est planifiée';
    lignes.push({ icone: 'build-outline', label: 'Ce que le technicien vient faire', valeur: plan?.travaux ?? prevu.travaux });

    const jour = jourLong(plan?.date);
    lignes.push({ icone: 'calendar-outline', label: "Jour de l'intervention", valeur: jour ?? dossier.rdv?.date ?? attente });

    const arrivee = heureDe(dossier.rdv?.arriveLe);
    const parti = heureDe(dossier.rdv?.partiLe);
    let heure: string;
    if (arrivee) heure = `Arrivé à ${arrivee}`;
    else if (parti) heure = `Parti à ${parti}, en route vers vous`;
    else if (plan) heure = `Arrivée prévue à ${plan.heureArrivee}`;
    else if (dossier.rdv) heure = `Créneau prévu : ${dossier.rdv.creneau}`;
    else heure = attente;
    if (!reel && !plan && dossier.technicien?.heureArriveeEstimee && !arrivee) {
      heure += ` (arrivée estimée ${dossier.technicien.heureArriveeEstimee})`;
    }
    lignes.push({ icone: 'time-outline', label: "Heure d'arrivée", valeur: heure });

    const reelle = dureeEntre(dossier.demarreLe, dossier.termineLe);
    let duree: string;
    if (reelle) duree = `${reelle} (durée réelle)`;
    else if (plan) duree = `${dureeMinutes(plan.dureeMinutes)} environ (prévue par Orange)`;
    else if (!reel) duree = `${prevu.dureeEstimee} environ (estimation indicative)`;
    else duree = attente;
    lignes.push({ icone: 'hourglass-outline', label: 'Durée du travail', valeur: duree });

    if (plan?.instructions) lignes.push({ icone: 'information-circle-outline', label: "Message d'Orange", valeur: plan.instructions });
  }
  if (dossier.statutTerrain) {
    lignes.push({ icone: 'navigate-outline', label: 'Statut du technicien', valeur: LIBELLE_STATUT_TERRAIN[dossier.statutTerrain] ?? dossier.statutTerrain });
  }
  if (dossier.offre) lignes.push({ icone: 'wifi-outline', label: 'Offre', valeur: `${dossier.offre.nom} · ${dossier.offre.debit}` });

  return (
    <>
      <Text style={styles.titre}>{titre}</Text>
      <Card>
        {lignes.map((l, i) => (
          <View key={l.label} style={[styles.ligne, i > 0 && styles.separateur]}>
            <Ionicons name={l.icone} size={18} color={c.primaryDark} style={styles.icone} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{l.label}</Text>
              <Text style={styles.valeur}>{l.valeur}</Text>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    titre: { ...(typography.h3 as any), color: c.ink, marginTop: spacing.xl, marginBottom: spacing.md },
    ligne: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm },
    separateur: { borderTopWidth: 1, borderTopColor: c.border },
    icone: { marginRight: spacing.sm, marginTop: 2 },
    label: { fontSize: 11.5, fontWeight: '700', color: c.muted, letterSpacing: 0.3 },
    valeur: { fontSize: 14.5, fontWeight: '600', color: c.ink, marginTop: 1 },
  });
}
