// Modèles des e-mails Supabase (à coller dans Authentication → Emails), aux couleurs de l'appli.
// Mode sombre : fonds en `background-image` (jamais inversés), titres et boutons en image, textes blancs protégés
// par l'astuce mix-blend-mode reconnue par Gmail (`u + .body`), `color-scheme: dark` pour Apple Mail et Outlook.
// Usage : node tools/emails/templates.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const IMG = 'https://bananaintrouble.github.io/tcgmarket/email';
const BG = '#0A1F17', CARD = '#133325', LINE = '#2E6B4D';

const EMAILS = {
  confirmation: {
    subject: 'Confirme ton adresse e-mail',
    title: 'Bienvenue sur TCGMarket !',
    text: 'Confirme ton adresse e-mail pour activer ton compte et sauvegarder ta collection de cartes sur tous tes appareils.',
    button: 'Confirmer mon adresse', btnW: 256,
    note: 'Ensuite, ouvre TCGMarket et connecte-toi avec ton e-mail et ton mot de passe.',
  },
  'mot-de-passe': {
    subject: 'Nouveau mot de passe',
    title: 'Nouveau mot de passe',
    text: 'Tu as demandé à changer le mot de passe de ton compte TCGMarket. Appuie sur le bouton pour en choisir un nouveau.',
    button: 'Choisir un nouveau mot de passe', btnW: 336,
    note: "Ce lien n'est valable qu'une heure. Si tu n'as rien demandé, ton mot de passe actuel reste inchangé.",
  },
  'changement-email': {
    subject: 'Confirme ta nouvelle adresse e-mail',
    title: 'Nouvelle adresse e-mail',
    text: 'Confirme cette nouvelle adresse pour ton compte TCGMarket.',
    button: 'Confirmer la nouvelle adresse', btnW: 310,
    note: "Si tu n'as rien demandé, ignore cet e-mail.",
  },
};

const fill = (c) => `background-color:${c};background-image:linear-gradient(${c},${c});`;
const FONT = `font-family:Manrope,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;`;
/** Texte clair protégé contre l'inversion de Gmail. */
const light = (html, style) => `<div class="gm-screen"><div class="gm-diff"><div style="${FONT}${style}">${html}</div></div></div>`;

for (const [name, e] of Object.entries(EMAILS)) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${e.subject}</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin: 0; padding: 0; }
  u + .body .gm-screen { background: #000; mix-blend-mode: screen; }
  u + .body .gm-diff { background: #000; mix-blend-mode: difference; }
</style>
</head>
<body class="body" style="margin:0;padding:0;${fill(BG)}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${fill(BG)}">
  <tr><td align="center" style="padding:32px 16px;${fill(BG)}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;${fill(CARD)}border:1px solid ${LINE};border-radius:20px;">
      <tr><td align="center" style="padding:28px 28px 8px;${fill(CARD)}border-radius:20px 20px 0 0;">
        <img src="${IMG}/hero-${name}.png" width="424" alt="TCGMarket · ${e.title}" style="display:block;width:100%;max-width:424px;height:auto;border:0;${FONT}font-size:22px;font-weight:800;color:#ECF5EF;">
      </td></tr>
      <tr><td align="center" style="padding:12px 28px 26px;${fill(CARD)}">
        ${light(e.text, 'font-size:16px;line-height:1.55;color:#ECF5EF;opacity:0.86;')}
      </td></tr>
      <tr><td align="center" style="padding:0 28px;${fill(CARD)}">
        <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;text-decoration:none;border-radius:14px;${fill('#F5C542')}">
          <img src="${IMG}/btn-${name}.png" width="${e.btnW}" alt="${e.button}" style="display:block;border:0;border-radius:14px;${FONT}font-size:16px;font-weight:800;color:#0A1F17;padding:0;">
        </a>
      </td></tr>
      <tr><td align="center" style="padding:26px 28px 30px;${fill(CARD)}border-radius:0 0 20px 20px;">
        ${light(e.note, 'font-size:13px;line-height:1.55;color:#ECF5EF;opacity:0.7;')}
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
      <tr><td align="center" style="padding:18px 12px 0;${fill(BG)}">
        ${light("Tu reçois cet e-mail car cette adresse a été utilisée sur TCGMarket. Si ce n'est pas toi, ignore-le simplement.", 'font-size:12px;line-height:1.5;color:#ECF5EF;opacity:0.5;')}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
`;
  writeFileSync(path.join(root, 'supabase/emails', `${name}.html`), html);
  console.log(name, e.subject);
}
