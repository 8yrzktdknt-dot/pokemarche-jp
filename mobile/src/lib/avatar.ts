import { Platform } from 'react-native';

/** Images de profil par défaut : un emblème sur une couleur (aucun visuel sous licence). */
export const AVATARS = [
  { id: 'flame', icon: 'flame', bg: '#E8590C', fg: '#FFF4E6' },
  { id: 'bolt', icon: 'flash', bg: '#F5C542', fg: '#0A1F17' },
  { id: 'leaf', icon: 'leaf', bg: '#2F9E44', fg: '#EBFBEE' },
  { id: 'water', icon: 'water', bg: '#1C7ED6', fg: '#E7F5FF' },
  { id: 'moon', icon: 'moon', bg: '#7048E8', fg: '#F3F0FF' },
  { id: 'star', icon: 'star', bg: '#D6336C', fg: '#FFF0F6' },
] as const;

export type AvatarPreset = (typeof AVATARS)[number];
export const presetOf = (v?: string): AvatarPreset | undefined => AVATARS.find((a) => a.id === v);
export const isPhoto = (v?: string) => !!v && v.startsWith('data:image/');

/** Côté du carré enregistré (assez net pour un avatar, léger pour la sauvegarde du compte). */
const SIZE = 256;

/**
 * Photo choisie sur l'appareil (web : sélecteur de fichiers, appareil photo sur téléphone), recadrée au centre
 * en carré de 256 px, en JPEG. null si annulé ou illisible.
 */
export function pickPhoto(): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = SIZE;
        canvas.getContext('2d')?.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    };
    input.click();
  });
}
