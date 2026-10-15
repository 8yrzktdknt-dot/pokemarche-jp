import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Point } from '../lib/priceHistory';
import { colors, fonts } from './theme';

const DAY = 86400000;
const time = (d: string) => Date.parse(`${d}T00:00:00Z`);

/**
 * Courbe d'évolution d'un prix (sans SVG : segments tracés en traits pivotés), espacée selon les dates,
 * avec le plus haut et le plus bas à gauche et les dates de début et de fin dessous.
 * Verte si le prix a monté sur la période, rouge s'il a baissé.
 */
export function PriceChart({ points, format, locale, height = 150 }: {
  points: Point[]; format(v: number): string; locale: string; height?: number;
}) {
  const [w, setW] = useState(0);
  if (points.length < 2) return null;
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs);
  const t0 = time(points[0].d), t1 = time(points[points.length - 1].d);
  const span = Math.max(DAY, t1 - t0);
  const pad = 8;
  const plotW = Math.max(0, w - 2 * pad);
  const x = (p: Point) => pad + ((time(p.d) - t0) / span) * plotW;
  const y = (p: Point) => (hi > lo ? pad + (1 - (p.v - lo) / (hi - lo)) * (height - 2 * pad) : height / 2);
  const color = points[points.length - 1].v >= points[0].v ? colors.good : colors.danger;
  const date = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const last = points[points.length - 1];

  return (
    <View style={{ gap: 6 }}>
      <View style={[st.plot, { height }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {[0, 0.5, 1].map((f) => <View key={f} style={[st.grid, { top: pad + f * (height - 2 * pad) }]} />)}
        {w > 0 && points.slice(1).map((p, i) => {
          const a = points[i];
          const x1 = x(a), y1 = y(a), x2 = x(p), y2 = y(p);
          const len = Math.hypot(x2 - x1, y2 - y1);
          return (
            <View
              key={p.d}
              style={{
                position: 'absolute', left: (x1 + x2) / 2 - (len + 3) / 2, top: (y1 + y2) / 2 - 1.5, width: len + 3, height: 3,
                borderRadius: 2, backgroundColor: color, transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
              }}
            />
          );
        })}
        {w > 0 && <View style={[st.dot, { left: x(last) - 5, top: y(last) - 5, backgroundColor: color }]} />}
        {hi > lo && <Text style={[st.tag, { top: 4 }]}>{format(hi)}</Text>}
        {hi > lo && <Text style={[st.tag, { bottom: 4 }]}>{format(lo)}</Text>}
      </View>
      <View style={st.bottom}>
        <Text style={st.axis}>{date(points[0].d)}</Text>
        <Text style={st.axis}>{date(last.d)}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  plot: { borderRadius: 12, backgroundColor: colors.bg, overflow: 'hidden' },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.line, opacity: 0.35 },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.card },
  tag: { position: 'absolute', left: 8, color: colors.muted, fontFamily: fonts.bold, fontSize: 10, backgroundColor: 'rgba(10,31,23,0.75)', paddingHorizontal: 4, borderRadius: 4 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between' },
  axis: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11 },
});
