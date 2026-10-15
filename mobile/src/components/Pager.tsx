import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from './ui';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Pages à faire glisser de gauche à droite, avec leurs onglets en haut (un appui sur un onglet y va directement).
 * Chaque page défile verticalement de son côté.
 */
export function Pager({ tabs, initial = 0, children }: { tabs: { label: string; icon: IconName }[]; initial?: number; children: ReactNode[] }) {
  const [w, setW] = useState(0);
  const [page, setPage] = useState(initial);
  const scroller = useRef<ScrollView>(null);
  const goTo = (i: number) => { scroller.current?.scrollTo({ x: i * w, animated: true }); setPage(i); };

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={st.tabs} accessibilityRole="tablist">
        {tabs.map((t, i) => (
          <Pressable key={t.label} onPress={() => goTo(i)} style={[st.tab, page === i && st.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: page === i }}>
            <Ionicons name={t.icon} size={17} color={page === i ? colors.bg : colors.muted} />
            <Text style={[st.tabText, page === i && st.tabTextOn]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {w > 0 && (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initial * w, y: 0 }}
          onLayout={() => scroller.current?.scrollTo({ x: page * w, animated: false })}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}
          onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}
          scrollEventThrottle={64}
          style={{ flex: 1 }}
        >
          {children.map((c, i) => (
            <View key={i} style={{ width: w, flex: 1 }}>{c}</View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, maxWidth: 900, width: '100%', alignSelf: 'center' },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 7, paddingHorizontal: 2,
    borderRadius: 14, borderWidth: 1, borderColor: colors.line,
  },
  tabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11 },
  tabTextOn: { color: colors.bg, fontFamily: fonts.heavy },
});
