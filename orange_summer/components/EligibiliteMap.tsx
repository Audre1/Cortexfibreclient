import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ColorTokens } from '@/constants/theme';
import { EligibiliteStatut, ZoneCouverture } from '@/data/types';
import { useColors } from '@/store/useSettingsStore';

// Cast : types react-native-webview vs React 19.3.
const WV = WebView as unknown as React.ComponentType<any>;

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

// Carte native via WebView + Leaflet. Fonctionne dans Expo Go.
function construireHtml(coords: Coords | null, zones: ZoneCouverture[]): string {
  const data = JSON.stringify({
    coords: coords ? [coords.latitude, coords.longitude] : null,
    zones: zones.map((z) => ({
      pts: z.contour.map((c) => [c.latitude, c.longitude]),
      col: COULEURS[z.statut],
      nom: z.nom,
    })),
  });
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var D=${data};
var map=L.map('map',{zoomControl:true,attributionControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var all=[];
D.zones.forEach(function(z){all=all.concat(z.pts);L.polygon(z.pts,{color:z.col,weight:2,fillColor:z.col,fillOpacity:.25}).addTo(map).bindTooltip(z.nom,{direction:'center'});});
if(D.coords){L.marker(D.coords,{icon:L.divIcon({className:'',html:'<div style="width:30px;height:30px;border-radius:15px;background:#FF7900;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:14px">📍</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map);}
if(D.coords){map.setView(D.coords,14);}else if(all.length){try{map.fitBounds(L.latLngBounds(all),{padding:[30,30]});}catch(e){map.setView([5.345,-4.0],12);}}else{map.setView([5.345,-4.0],12);}
setTimeout(function(){map.invalidateSize();},250);
</script></body></html>`;
}

export function EligibiliteMap({ coords, loading, height, zones = [] }: EligibiliteMapProps) {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const html = useMemo(
    () => construireHtml(coords, zones),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coords?.latitude, coords?.longitude, zones.length]
  );

  return (
    <View style={[styles.wrap, { height }]}>
      <WV originWhitelist={['*']} source={{ html }} style={styles.web} scrollEnabled={false} />
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
  wrap: { overflow: 'hidden', backgroundColor: colors.infoSoft },
  web: { flex: 1, backgroundColor: 'transparent' },
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