import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { isPhoto, presetOf } from '../lib/avatar';
import { colors } from './theme';

/** Photo de profil : photo importée, image par défaut, sinon silhouette. */
export function Avatar({ value, size = 84 }: { value?: string; size?: number }) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (isPhoto(value)) return <Image source={{ uri: value }} style={round} contentFit="cover" />;
  const p = presetOf(value);
  if (p) return <Image source={{ uri: p.uri }} style={round} contentFit="cover" />;
  return (
    <View style={[round, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name="person" size={size * 0.52} color="#fff" />
    </View>
  );
}
