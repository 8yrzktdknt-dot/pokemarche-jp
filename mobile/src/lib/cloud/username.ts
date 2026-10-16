/** Pseudo : « @Sacha_92 » → « sacha_92 » ; 3 à 20 caractères parmi lettres, chiffres, « _ » et « . ». */
export const normalizeUsername = (v: string) => v.trim().replace(/^@+/, '').toLowerCase();
export const validUsername = (v: string) => /^[a-z0-9_.]{3,20}$/.test(v);
