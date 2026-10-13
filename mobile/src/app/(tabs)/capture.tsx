import { Redirect } from 'expo-router';

/** Onglet fictif : le bouton central ouvre directement le scanner. */
export default function Capture() {
  return <Redirect href="/scan" />;
}
