import { Platform } from 'react-native';

/**
 * Images de profil par défaut, dessinées pour l'app (aucun visuel sous licence) : l'univers des cartes à collectionner
 * (booster, éventail de cartes, gemme holo), et un clin d'œil à chaque jeu de l'app : Pokémon (éclair, œuf),
 * One Piece (drapeau pirate, chapeau de paille) et Riftbound (rune, épées croisées).
 */
const svg = (bg: string, body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="${bg}"/>${body}</svg>`)}`;

export const AVATARS = [
  { id: 'booster', uri: svg('#1A7D4C', '<path d="M38 30 l4.4 -6 l4.4 6 l4.4 -6 l4.4 6 l4.4 -6 l4.4 6 l4.4 -6 l4.4 6 l4.4 -6 l4.4 6 L82 90 l-4.4 6 l-4.4 -6 l-4.4 6 l-4.4 -6 l-4.4 6 l-4.4 -6 l-4.4 6 l-4.4 -6 l-4.4 6 l-4.4 -6 Z" fill="#F5C542"/><rect x="45" y="38" width="30" height="44" rx="5" fill="#0A1F17"/><polygon points="60.0,49.0 62.7,56.3 70.5,56.6 64.4,61.4 66.5,68.9 60.0,64.6 53.5,68.9 55.6,61.4 49.5,56.6 57.3,56.3" fill="#F5C542"/><rect x="38" y="30" width="44" height="4" fill="#D9A92B"/><rect x="38" y="86" width="44" height="4" fill="#D9A92B"/>') },
  { id: 'fan', uri: svg('#0E5A38', '<g transform="rotate(-22 60 96)"><rect x="43" y="28" width="34" height="50" rx="5" fill="#133325" stroke="#F5C542" stroke-width="2.5"/></g><g transform="rotate(0 60 96)"><rect x="43" y="28" width="34" height="50" rx="5" fill="#3CCB7F" stroke="#ECF5EF" stroke-width="2.5"/></g><g transform="rotate(22 60 96)"><rect x="43" y="28" width="34" height="50" rx="5" fill="#ECF5EF" stroke="#F5C542" stroke-width="2.5"/><polygon points="60.0,44.0 62.2,49.9 68.6,50.2 63.6,54.2 65.3,60.3 60.0,56.8 54.7,60.3 56.4,54.2 51.4,50.2 57.8,49.9" fill="#F5C542"/></g>') },
  { id: 'holo', uri: svg('#6741D9', '<polygon points="38,50 50,34 70,34 82,50 60,90" fill="#B197FC"/><polygon points="38,50 50,34 56,50" fill="#E5DBFF"/><polygon points="56,50 50,34 70,34 64,50" fill="#F3F0FF"/><polygon points="64,50 70,34 82,50" fill="#D0BFFF"/><polygon points="38,50 56,50 60,90" fill="#9775FA"/><polygon points="56,50 64,50 60,90" fill="#E5DBFF"/><polygon points="64,50 82,50 60,90" fill="#7950F2"/><circle cx="84" cy="32" r="3" fill="#FFF"/><circle cx="35" cy="78" r="2.4" fill="#FFF"/>') },
  { id: 'bolt', uri: svg('#F5C542', '<polygon points="66,18 38,66 56,66 48,102 84,50 64,50 74,18" fill="#0A1F17"/>') },
  { id: 'egg', uri: svg('#3CCB7F', '<ellipse cx="60" cy="64" rx="25" ry="31" fill="#F8FFF9"/><circle cx="50" cy="52" r="6" fill="#1A7D4C"/><circle cx="68" cy="66" r="7.5" fill="#1A7D4C"/><circle cx="52" cy="80" r="4.5" fill="#1A7D4C"/><circle cx="71" cy="46" r="3.5" fill="#1A7D4C"/>') },
  { id: 'pirate', uri: svg('#C92A2A', '<g stroke="#F8F9FA" stroke-width="8" stroke-linecap="round"><line x1="36" y1="74" x2="84" y2="98"/><line x1="84" y1="74" x2="36" y2="98"/></g><circle cx="60" cy="52" r="23" fill="#F8F9FA"/><rect x="48" y="62" width="24" height="16" rx="5" fill="#F8F9FA"/><circle cx="51" cy="52" r="6" fill="#C92A2A"/><circle cx="69" cy="52" r="6" fill="#C92A2A"/><path d="M60 59 l-3 6 h6 z" fill="#C92A2A"/><g stroke="#C92A2A" stroke-width="2"><line x1="55" y1="70" x2="55" y2="78"/><line x1="60" y1="70" x2="60" y2="78"/><line x1="65" y1="70" x2="65" y2="78"/></g>') },
  { id: 'hat', uri: svg('#1C7ED6', '<ellipse cx="60" cy="74" rx="44" ry="13" fill="#E9B949" stroke="#B8862B" stroke-width="2"/><path d="M37 72 Q37 40 60 40 Q83 40 83 72 Z" fill="#F5C542" stroke="#B8862B" stroke-width="2"/><path d="M37.6 62 Q60 58 82.4 62 L83 71 Q60 67 37 71 Z" fill="#E5484D"/><g stroke="#C9952E" stroke-width="1.3" opacity=".7" fill="none"><path d="M45 50 Q60 46 75 50"/><path d="M28 78 Q60 86 92 78"/></g>') },
  { id: 'rune', uri: svg('#0B7285', '<polygon points="60.0,29.0 86.8,44.5 86.8,75.5 60.0,91.0 33.2,75.5 33.2,44.5" fill="#133325" stroke="#63E6BE" stroke-width="3.5"/><g stroke="#96F2D7" stroke-width="5" stroke-linecap="round" fill="none"><path d="M60 40 V80"/><path d="M60 48 L72 40"/><path d="M60 60 L47 50"/><path d="M60 70 L73 80"/></g>') },
  { id: 'swords', uri: svg('#1B2B4B', '<g transform="rotate(-38 60 62)"><path d="M60 16 L66 26 L66 70 L54 70 L54 26 Z" fill="#E9ECEF"/><path d="M60 18 L60 70" stroke="#ADB5BD" stroke-width="2"/><rect x="44" y="70" width="32" height="7" rx="3.5" fill="#F5C542"/><rect x="56.5" y="77" width="7" height="15" rx="2" fill="#8B5A2B"/><circle cx="60" cy="96" r="5.5" fill="#F5C542"/></g><g transform="rotate(38 60 62)"><path d="M60 16 L66 26 L66 70 L54 70 L54 26 Z" fill="#E9ECEF"/><path d="M60 18 L60 70" stroke="#ADB5BD" stroke-width="2"/><rect x="44" y="70" width="32" height="7" rx="3.5" fill="#F5C542"/><rect x="56.5" y="77" width="7" height="15" rx="2" fill="#8B5A2B"/><circle cx="60" cy="96" r="5.5" fill="#F5C542"/></g>') },
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
