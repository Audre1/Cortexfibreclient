import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ColorTokens } from '@/constants/theme';
import { EligibiliteStatut, ZoneCouverture } from '@/data/types';
import { useColors } from '@/store/useSettingsStore';

interface Coords {
  latitude: number;
  longitude: number;
}

interface EligibiliteMapProps {
  coords: Coords | null;
  loading: boolean;
  height: number;
  zones?: ZoneCouverture[];
}

const COULEURS: Record<EligibiliteStatut, string> = {
  eligible: '#0A6E31',
  zone_a_etudier: '#946200',
  non_eligible: '#8F8F8F',
};

function quandLeafletPret(cb: (L: any) => void) {
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

// Carte interactive web (Leaflet + OpenStreetMap). Le natif utilise
// EligibiliteMap.tsx (react-native-maps).
export function EligibiliteMap({ coords, loading, height, zones = [] }: EligibiliteMapProps) {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const clientMarkerRef = useRef<any>(null);

  useEffect(() => {
    const annuler = quandLeafletPret((L) => {
      const node = containerRef.current as HTMLElement | null;
      if (!node || mapRef.current) return;

      const map = L.map(node, { zoomControl: true, attributionControl: false });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      // Zones de couverture (polygones colorés par statut).
      const tousPoints: [number, number][] = [];
      zones.forEach((z) => {
        const latlngs = z.contour.map((c) => [c.latitude, c.longitude]) as [number, number][];
        tousPoints.push(...latlngs);
        const couleur = COULEURS[z.statut];
        L.polygon(latlngs, { color: couleur, weight: 2, fillColor: couleur, fillOpacity: 0.25 })
          .addTo(map)
          .bindTooltip(z.nom, { direction: 'center', permanent: false });
      });

      if (zones.length > 0) {
        map.fitBounds(L.latLngBounds(tousPoints), { padding: [30, 30] });
      } else {
        map.setView([5.345, -4.0], 12);
      }

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

  // Positionne / recentre sur l'adresse testée.
  useEffect(() => {
    const map = mapRef.current;
    const L = (globalThis as any).L;
    if (!map || !L || !coords) return;
    const latlng: [number, number] = [coords.latitude, coords.longitude];
    if (clientMarkerRef.current) {
      clientMarkerRef.current.setLatLng(latlng);
    } else {
      clientMarkerRef.current = L.marker(latlng, {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:30px;height:30px;border-radius:15px;background:${colors.primary};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      }).addTo(map);
    }
    map.setView(latlng, 14);
  }, [coords]);

  return (
    <View style={[styles.wrap, { height }]}>
      <View ref={containerRef} style={StyleSheet.absoluteFill} />
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.info} />
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ColorTokens) {
  return StyleSheet.create({
  wrap: { backgroundColor: colors.infoSoft, overflow: 'hidden' },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
}