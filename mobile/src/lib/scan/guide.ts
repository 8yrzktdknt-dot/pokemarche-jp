/**
 * Cadre de visée du scanner, en proportions de la zone caméra.
 * Partagé entre l'affichage et le recadrage de l'image (version web).
 */
export const GUIDE = {
  top: 0.16,
  width: 0.78,
  /** Largeur / hauteur d'une carte (63 × 88 mm). */
  aspect: 63 / 88,
  /** Bande du bas de la carte où sont imprimés les numéros (fraction de la hauteur de la carte). */
  codeBandFrom: 0.72,
};
