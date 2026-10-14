import { StyleSheet, View } from 'react-native';

/**
 * Effet reflet posé sur le visuel d'une variante brillante qui n'a pas de photo à elle (reverse vendu sur la fiche
 * de la carte normale) : bandes irisées en biais, pour la distinguer d'un coup d'œil de la carte normale.
 */
export function ReverseSheen({ radius = 6 }: { radius?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      {BANDS.map((b, i) => (
        <View key={i} style={[st.band, { backgroundColor: b.color, left: b.left, width: b.width }]} />
      ))}
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' }]} />
    </View>
  );
}

const BANDS = [
  { color: 'rgba(255,120,200,0.22)', left: '-30%', width: '22%' },
  { color: 'rgba(120,220,255,0.22)', left: '0%', width: '18%' },
  { color: 'rgba(255,240,140,0.20)', left: '30%', width: '20%' },
  { color: 'rgba(160,255,190,0.18)', left: '62%', width: '16%' },
  { color: 'rgba(200,160,255,0.20)', left: '90%', width: '22%' },
] as const;

const st = StyleSheet.create({
  band: { position: 'absolute', top: '-40%', height: '180%', transform: [{ rotate: '25deg' }] },
});
