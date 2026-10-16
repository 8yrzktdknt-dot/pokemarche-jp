/** Règles du mot de passe des nouveaux comptes : 8 caractères, une majuscule, une minuscule, un caractère spécial. */
export function passwordChecks(p: string) {
  return {
    length: p.length >= 8,
    upper: /\p{Lu}/u.test(p),
    lower: /\p{Ll}/u.test(p),
    special: /[^\p{L}\p{N}\s]/u.test(p),
  };
}
export const strongPassword = (p: string) => Object.values(passwordChecks(p)).every(Boolean);
