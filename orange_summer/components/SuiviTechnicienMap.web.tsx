import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ColorTokens, radius } from '@/constants/theme';
import { Coords } from '@/data/types';
import { useColors } from '@/store/useSettingsStore';

interface Props {
  clientPosition: Coords;
  technicienPosition: Coords | null;
  chemin: Coords[];
  progression: number;
  height?: number;
  suivrePosition?: boolean;
  interactive?: boolean;
  /** Faux quand la carte est dans une zone qui défile : la molette fait défiler la page au lieu de zoomer. */
  zoomMolette?: boolean;
}

// +html.tsx charge Leaflet, mais ce fichier n'est pas appliqué en mode `output: "single"` :
// on injecte alors nous-mêmes le même script (même version, même empreinte d'intégrité).
function assurerLeaflet() {
  if (typeof document === 'undefined' || (globalThis as any).L || document.getElementById('leaflet-js')) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  css.crossOrigin = '';
  document.head.appendChild(css);
  const script = document.createElement('script');
  script.id = 'leaflet-js';
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  script.crossOrigin = '';
  document.head.appendChild(script);
}

// Attend que le script Leaflet soit prêt.
function quandLeafletPret(cb: (L: any) => void) {
  assurerLeaflet();
  const L = (globalThis as any).L;
  if (L) return cb(L);
  const timer = setInterval(() => {
    const Lnow = (globalThis as any).L;
    if (Lnow) {
      clearInterval(timer);
      cb(Lnow);
    }
  }, 120);
  return () => clearInterval(timer);
}

function iconePastille(couleur: string, emoji: string, L: any) {
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:17px;background:${couleur};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:16px;">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// Carte interactive web (Leaflet + OpenStreetMap). Le natif utilise
// SuiviTechnicienMap.tsx (react-native-maps).
export function SuiviTechnicienMap({
  clientPosition,
  technicienPosition,
  chemin,
  progression,
  height = 220,
  interactive = false,
  zoomMolette = true,
}: Props) {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const techMarkerRef = useRef<any>(null);
  const traceFaiteRef = useRef<any>(null);

  // Initialisation (une seule fois) dès que Leaflet est disponible.
  useEffect(() => {
    const annuler = quandLeafletPret((L) => {
      const node = containerRef.current as HTMLElement | null;
      if (!node || mapRef.current) return;

      const map = L.map(node, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive && zoomMolette,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        attributionControl: false,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Itinéraire complet (gris) + portion parcourue (orange).
      if (chemin.length >= 2) {
        const latlngs = chemin.map((c) => [c.latitude, c.longitude]);
        L.polyline(latlngs, { color: colors.border, weight: 5 }).addTo(map);
        traceFaiteRef.current = L.polyline([], { color: colors.primary, weight: 6 }).addTo(map);
      }

      // Marqueur client (domicile).
      L.marker([clientPosition.latitude, clientPosition.longitude], {
        icon: iconePastille(colors.info, '🏠', L),
      }).addTo(map);

      // Marqueur technicien.
      const pos = technicienPosition ?? chemin[0] ?? clientPosition;
      techMarkerRef.current = L.marker([pos.latitude, pos.longitude], {
        icon: iconePastille(colors.primary, '👷', L),
      }).addTo(map);

      // Cadre la vue sur l'itinéraire (ou autour du client).
      const points = chemin.length >= 1 ? [...chemin] : [clientPosition];
      if (technicienPosition) points.push(technicienPosition);
      const bounds = L.latLngBounds(points.map((c: Coords) => [c.latitude, c.longitude]));
      bounds.extend([clientPosition.latitude, clientPosition.longitude]);
      map.fitBounds(bounds, { padding: [40, 40] });

      // Leaflet doit recalculer sa taille après la mise en page.
      setTimeout(() => map.invalidateSize(), 150);
    });

    return () => {
      if (typeof annuler === 'function') annuler();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Met à jour la position du technicien et la portion parcourue.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pos = technicienPosition;
    if (pos && techMarkerRef.current) {
      techMarkerRef.current.setLatLng([pos.latitude, pos.longitude]);
      // Sans itineraire (position GPS reelle), on recadre pour garder client et technicien visibles.
      if (chemin.length < 2) {
        map.fitBounds(
          [
            [pos.latitude, pos.longitude],
            [clientPosition.latitude, clientPosition.longitude],
          ],
          { padding: [40, 40], maxZoom: 17 }
        );
      }
    }
    if (traceFaiteRef.current && chemin.length >= 2) {
      const index = Math.round(progression * (chemin.length - 1));
      const parcouru = chemin.slice(0, index + 1).map((c) => [c.latitude, c.longitude]);
      traceFaiteRef.current.setLatLngs(parcouru);
    }
  }, [technicienPosition, progression, chemin]);

  return <View ref={containerRef} style={[styles.wrap, { height }]} />;
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.infoSoft, borderRadius: radius.md },
});
}