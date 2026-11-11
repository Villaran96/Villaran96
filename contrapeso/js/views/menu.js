// Menú «Más» para el móvil.

import {
  route, pageHead, isAdmin, session, plan, planName,
} from '../core.js';
import { esc, icon } from '../util.js';

function renderMenu() {
  const links = [
    ['beneficios', 'chart', 'Beneficios', 'Tus operaciones y gráficos'],
    ['guia', 'book', 'Guía', 'Aprende paso a paso'],
    ['metodo', 'shield', 'Método', 'Hacienda y método completo'],
    ['planes', 'star', 'Planes', `Ahora: ${planName(plan())}`],
    ['cuenta', 'user', 'Cuenta', session.user ? session.user.email : session.backend ? 'Entra o crea tu cuenta' : 'Vista previa'],
    ['ajustes', 'gear', 'Ajustes', 'Mis casas, cuotas y datos'],
  ];
  if (isAdmin()) links.push(['admin', 'pen', 'Administración', 'Contenido, planes y clientes']);
  return `${pageHead('Más', '')}
  <nav class="menu-list" aria-label="Más secciones">${links.map(([href, ic, title, sub]) => `<a href="#${href}" class="menu-item">${icon(ic, 20)}<span><b>${esc(title)}</b><span>${esc(sub)}</span></span>${icon('chevron', 16)}</a>`).join('')}</nav>`;
}

route('menu', { render: renderMenu, nav: 'menu' });
