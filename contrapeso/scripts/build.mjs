// Genera index.html (la web lista para tu dominio) a partir de page.html.
// page.html es la misma página sin <head> propio: así se publica la vista previa en claude.ai.
// Uso: node scripts/build.mjs [--site https://tudominio.es]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const siteArg = process.argv.indexOf('--site');
const site = siteArg > 0 ? String(process.argv[siteArg + 1] || '').replace(/\/$/, '') : '';

const TITLE = 'Contrapeso · Oddsmatcher y calculadoras de matched betting';
const DESCRIPTION = 'Oddsmatcher con cuotas reales, calculadoras favor-contra, combinadas y rollover, guía paso a paso de Bet365, Winamax, DAZN Bet, Sportium y Retabet y registro de beneficios.';

const page = await readFile(`${root}page.html`, 'utf8');
const body = page
  .replace(/<title>.*?<\/title>\s*/s, '')
  .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/, '')
  .replace(/<meta name="description"[^>]*>\s*/, '');
const headLinks = body.match(/^(<link [^>]*>\s*)+/m)?.[0] || '';
const rest = body.replace(headLinks, '');

const favicon = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0d1013"/><path d="M16 9 L11 25 H21 Z" fill="#d9a441"/><rect x="3" y="7.2" width="26" height="2.4" rx="1.2" fill="#e8ecf0"/><circle cx="6.5" cy="13" r="4" fill="#8ccbfa"/><circle cx="25.5" cy="13" r="4" fill="#f5a3c6"/></svg>')}`;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}">
<meta name="theme-color" content="#0d1013" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f2f4f6" media="(prefers-color-scheme: light)">
<meta property="og:title" content="Contrapeso">
<meta property="og:description" content="${DESCRIPTION}">
${site ? `<meta property="og:url" content="${site}/">\n<link rel="canonical" href="${site}/">\n` : ''}<link rel="icon" href="${favicon}">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>
${headLinks.trim()}
</head>
<body>
${rest.trim()}
</body>
</html>
`;
await writeFile(`${root}index.html`, html);
console.log('index.html generado');
