import { NumeroClient } from '@/data/types';

/** Nombre maximal de numéros que le client peut ajouter (le serveur applique la même règle). */
export const MAX_NUMEROS_AJOUTES = 2;

/** « 07 08 11 22 33 » -> « 0708112233 » ; null si le format est invalide (8 à 15 chiffres, « + » possible au début). */
export function normaliserNumero(valeur: string): string | null {
  const brut = valeur.replace(/[\s.\-()]/g, '');
  return /^\+?\d{8,15}$/.test(brut) ? brut : null;
}

/** « 0708112233 » -> « 07 08 11 22 33 » (dix chiffres) ; les autres formats sont laissés tels quels. */
export function formaterNumero(numero: string): string {
  return /^\d{10}$/.test(numero) ? numero.replace(/(\d{2})(?=\d)/g, '$1 ') : numero;
}

/** Contrôle commun avant ajout : renvoie un message d'erreur, ou null si le numéro peut être ajouté. */
export function erreurAjoutNumero(valeur: string, principal: string, ajoutes: NumeroClient[]): string | null {
  const numero = normaliserNumero(valeur);
  if (!numero) return 'Numéro invalide : 8 à 15 chiffres, avec « + » possible au début.';
  if (numero === normaliserNumero(principal)) return "C'est déjà votre numéro principal.";
  if (ajoutes.length >= MAX_NUMEROS_AJOUTES) {
    return `Vous pouvez ajouter ${MAX_NUMEROS_AJOUTES} numéros au maximum. Supprimez-en un pour en ajouter un autre.`;
  }
  if (ajoutes.some((n) => n.numero === numero)) return 'Ce numéro est déjà ajouté.';
  return null;
}
