import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { radius } from '@/constants/theme';
import { Coords } from '@/data/types';

// Cast : les types de react-native-webview ne s'accordent pas avec React 19.3.
const WV = WebView as unknown as React.ComponentType<any>;

interface Props {
  clientPosition: Coords;
  technicienPosition: Coords | null;
  chemin: Coords[];
  progression: number;
  height?: number;
  suivrePosition?: boolean;
  interactive?: boolean;
  /** Sans effet sur mobile (la molette n'existe pas) : présent pour garder la même interface que la version web. */
  zoomMolette?: boolean;
}

// Carte native via WebView + Leaflet (OpenStreetMap). Fonctionne dans Expo Go
// (react-native-maps n'y est pas). Le marqueur du technicien glisse le long
// de l'itinéraire — façon Yango — via injectJavaScript.
function construireHtml(client: Coords, chemin: Coords[], tech: Coords, interactive: boolean): string {
  const data = JSON.stringify({
    client: [client.latitude, client.longitude],
    chemin: chemin.map((c) => [c.latitude, c.longitude]),
    tech: [tech.latitude, tech.longitude],
    interactive,
  });
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%}
.leaflet-marker-icon{transition:transform .55s linear}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var D=${data};
var map=L.map('map',{zoomControl:D.interactive,dragging:D.interactive,scrollWheelZoom:D.interactive,doubleClickZoom:D.interactive,touchZoom:D.interactive,attributionControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var chemin=D.chemin;
if(chemin.length>=2){L.polyline(chemin,{color:'#D6D6D6',weight:5}).addTo(map);window.done=L.polyline([],{color:'#FF7900',weight:6}).addTo(map);}
function ic(bg,e){return L.divIcon({className:'',html:'<div style="width:34px;height:34px;border-radius:17px;background:'+bg+';border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:16px">'+e+'</div>',iconSize:[34,34],iconAnchor:[17,17]});}
L.marker(D.client,{icon:ic('#085EBD','🏠')}).addTo(map);
window.tech=L.marker(D.tech,{icon:ic('#FF7900','👷')}).addTo(map);
var pts=chemin.length?chemin.slice():[D.client];pts.push(D.client);pts.push(D.tech);
try{map.fitBounds(L.latLngBounds(pts),{padding:[40,40]});}catch(e){map.setView(D.client,13);}
window.updateTech=function(lat,lng,pct){window.tech.setLatLng([lat,lng]);if(!window.done){try{map.fitBounds(L.latLngBounds([[lat,lng],D.client]),{padding:[40,40],maxZoom:17});}catch(e){}}if(window.done){var n=Math.round(pct*(chemin.length-1));window.done.setLatLngs(chemin.slice(0,n+1));}};
setTimeout(function(){map.invalidateSize();},250);
</script></body></html>`;
}

export function SuiviTechnicienMap({
  clientPosition,
  technicienPosition,
  chemin,
  progression,
  height = 220,
  interactive = false,
}: Props) {
  const ref = useRef<any>(null);
  const techStart = technicienPosition ?? chemin[0] ?? clientPosition;

  // Le HTML (carte + itinéraire) est construit une fois par dossier ; la
  // position du technicien est ensuite poussée par injection JS.
  const html = useMemo(
    () => construireHtml(clientPosition, chemin, techStart, interactive),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientPosition.latitude, clientPosition.longitude, chemin.length, interactive]
  );

  useEffect(() => {
    if (!ref.current || !technicienPosition) return;
    const js = `window.updateTech && window.updateTech(${technicienPosition.latitude},${technicienPosition.longitude},${progression}); true;`;
    ref.current.injectJavaScript(js);
  }, [technicienPosition, progression]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WV
        ref={ref}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        onLoadEnd={() => {
          if (technicienPosition) {
            ref.current?.injectJavaScript(
              `window.updateTech && window.updateTech(${technicienPosition.latitude},${technicienPosition.longitude},${progression}); true;`
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: radius.md },
  web: { flex: 1, backgroundColor: 'transparent' },
});
