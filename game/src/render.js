// Ember & Thyme — every pixel the judge sees. Warm wood, terracotta and
// cream; the right-hand panel is dense on purpose (orders, money, combo,
// menu, upgrades, controls) and the kitchen stays busy: bins, board, stove,
// grill, plates and the serve bell all in one frame.
import { W, H, INGREDIENTS, RECIPES, LEVELS, UPGRADES, BURN_SECONDS } from './config.js';
import { levelOf, plateMatches, bestMatch } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_SHOP = 'shop';
export const SCREEN_OVER = 'over';
export const SCREEN_CAMPAIGN = 'campaign';

// Hit regions, shared with input.js. One source of truth for clicks.
export function layout(state) {
  const bins = [];
  const ids = Object.keys(INGREDIENTS);
  ids.forEach((id, i) => {
    // 6 columns x 2 rows: all 12 bins fit above the hand bar.
    bins.push({ id, x: 36 + (i % 6) * 146, y: 478 + Math.floor(i / 6) * 92, w: 134, h: 80 });
  });
  const stoveSlots = state.stove.map((s, i) => ({ x: 268 + i * 96, y: 118, w: 88, h: 88 }));
  return {
    board: { x: 36, y: 96, w: 196, h: 150 },
    stove: { x: 252, y: 96, w: 96 * state.stove.length + 16, h: 150 },
    stoveSlots,
    grill: { x: 252 + 96 * state.stove.length + 32, y: 96, w: 150, h: 150 },
    trash: { x: 780, y: 96, w: 62, h: 150 },
    bell: { x: 852, y: 96, w: 66, h: 150 },
    plates: state.plates.map((p, i) => ({ x: 36 + i * 300, y: 268, w: 284, h: 128 })),
    bins,
    hud: { x: 936, y: 0, w: 344, h: 720 },
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function bar(ctx, x, y, w, h, frac, fill, back = '#00000033') {
  ctx.fillStyle = back; rr(ctx, x, y, w, h, h / 2); ctx.fill();
  if (frac > 0) { ctx.fillStyle = fill; rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill(); }
}

function flame(ctx, x, y, s, t) {
  const flick = Math.sin(t * 9 + x) * 0.15 + 1;
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 9 * s, y - 14 * s * flick, x, y - 26 * s * flick);
  ctx.quadraticCurveTo(x + 9 * s, y - 14 * s * flick, x, y);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(x, y - 2);
  ctx.quadraticCurveTo(x - 5 * s, y - 10 * s * flick, x, y - 17 * s * flick);
  ctx.quadraticCurveTo(x + 5 * s, y - 10 * s * flick, x, y - 2);
  ctx.fill();
}

function drawIngredient(ctx, id, stage, x, y, size, label = true) {
  const ing = INGREDIENTS[id];
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(stage === 'burnt' ? '🔥' : ing.emoji, x, y);
  if (!label) return;
  const tag = stage === 'chopped' ? 'CHOPPED' : stage === 'cooked' ? 'COOKED' : stage === 'burnt' ? 'BURNT!' : null;
  if (!tag) return;
  ctx.font = `bold ${Math.round(size * 0.26)}px system-ui`;
  ctx.fillStyle = stage === 'burnt' ? '#3a3a3a' : stage === 'cooked' ? '#b3541e' : '#7c4a12';
  ctx.fillText(tag, x, y + size * 0.78);
}

function stationLabel(ctx, x, y, title, hint) {
  text(ctx, title, x, y, 15, '#fff7e8');
  text(ctx, hint, x, y + 16, 11, '#ffe1b3', 'normal');
}

export function render(ctx, state) {
  const t = state.time;
  // Wall + floor.
  ctx.fillStyle = '#f7e8c9'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8b04b'; ctx.fillRect(0, 0, 936, 64);
  ctx.fillStyle = '#7a4a21'; ctx.fillRect(0, 64, 936, 6);
  ctx.fillStyle = '#c98f4e'; ctx.fillRect(0, 70, 936, 650);
  for (let y = 90; y < 720; y += 46) { ctx.fillStyle = '#00000010'; ctx.fillRect(0, y, 936, 2); }
  // Side panel.
  ctx.fillStyle = '#2e2118'; ctx.fillRect(936, 0, 344, 720);
  ctx.fillStyle = '#3d2c1e'; ctx.fillRect(936, 0, 344, 64);

  const level = levelOf(state);
  text(ctx, '🍳 EMBER & THYME', 16, 38, 20, '#fff7e8');
  text(ctx, `${level.name} · Level ${state.levelIndex + 1}`, 216, 26, 14, '#fff7e8');
  text(ctx, `${level.sub} · target $${level.target}`, 216, 46, 10, '#ffe1b3', 'normal');
  // Shift timer + money, big and legible at thumbnail size.
  const mm = Math.floor(Math.max(0, state.shiftLeft) / 60);
  const ss = Math.floor(Math.max(0, state.shiftLeft) % 60).toString().padStart(2, '0');
  const low = state.shiftLeft < 20;
  text(ctx, `⏱ ${mm}:${ss}`, 560, 42, 28, low ? '#ff5a3c' : '#fff7e8', 'bold', 'left');
  ctx.fillStyle = '#2e2118cc'; rr(ctx, 664, 10, 264, 46, 10); ctx.fill();
  text(ctx, `💰 $${state.bank}  ·  shift $${state.levelCoins} / $${level.target}`, 676, 30, 15, '#ffd23f', 'bold');
  text(ctx, `❤`.repeat(Math.max(0, state.hearts)) + `🖤`.repeat(3 - Math.max(0, state.hearts)), 676, 50, 13, '#ff8a80');

  const L = layout(state);
  if (state.screen === SCREEN_TITLE) { renderTitle(ctx, state); renderHud(ctx, state); return; }
  if (state.screen === SCREEN_SHOP) { renderKitchen(ctx, state, L); renderHud(ctx, state); renderShop(ctx, state); return; }
  if (state.screen === SCREEN_OVER) { renderKitchen(ctx, state, L); renderHud(ctx, state); renderOver(ctx, state); return; }
  if (state.screen === SCREEN_CAMPAIGN) { renderKitchen(ctx, state, L); renderHud(ctx, state); renderCampaign(ctx, state); return; }

  renderKitchen(ctx, state, L);
  renderHud(ctx, state);

  // Toast strip in the gap below the plates (never over the hand bar).
  if (state.toastTimer > 0 && state.toast) {
    ctx.fillStyle = '#2e2118ee'; rr(ctx, 36, 408, 884, 32, 16); ctx.fill();
    text(ctx, state.toast.slice(0, 95), 478, 429, 14, '#ffe9b3', 'bold', 'center');
  }
}

function renderKitchen(ctx, state, L) {
  const t = state.time;
  // --- chopping board ---
  ctx.fillStyle = '#8a5a2b'; rr(ctx, L.board.x - 6, L.board.y - 6, L.board.w + 12, L.board.h + 12, 12); ctx.fill();
  ctx.fillStyle = '#d9a066'; rr(ctx, L.board.x, L.board.y, L.board.w, L.board.h, 10); ctx.fill();
  stationLabel(ctx, L.board.x + 10, L.board.y + 22, '🔪 CHOPPING BOARD', state.board.item ? 'click to chop!' : 'drop a raw item here');
  if (state.board.item) {
    drawIngredient(ctx, state.board.item.id, 'raw', L.board.x + L.board.w / 2, L.board.y + 82, 52);
    bar(ctx, L.board.x + 20, L.board.y + 122, L.board.w - 40, 12, state.board.progress, '#ff7a1a');
    text(ctx, 'CHOP! CHOP!', L.board.x + L.board.w / 2, L.board.y + 146, 12, '#5a3410', 'bold', 'center');
  } else {
    ctx.font = '44px serif'; ctx.textAlign = 'center'; ctx.fillText('🪵', L.board.x + L.board.w / 2, L.board.y + 96);
  }

  // --- stove ---
  ctx.fillStyle = '#3a3f4a'; rr(ctx, L.stove.x - 6, L.stove.y - 6, L.stove.w + 12, L.stove.h + 12, 12); ctx.fill();
  ctx.fillStyle = '#22252c'; rr(ctx, L.stove.x, L.stove.y, L.stove.w, L.stove.h, 10); ctx.fill();
  stationLabel(ctx, L.stove.x + 10, L.stove.y + 22, '🍳 STOVE', 'click a burner to cook / take');
  L.stoveSlots.forEach((s, i) => {
    const slot = state.stove[i];
    ctx.fillStyle = '#101216'; ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + s.h / 2 + 6, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#555c6b'; ctx.lineWidth = 3; ctx.stroke();
    if (slot.item) {
      flame(ctx, s.x + s.w / 2 - 16, s.y + s.h - 8, 0.9, t);
      flame(ctx, s.x + s.w / 2 + 16, s.y + s.h - 8, 0.9, t + 2);
      drawIngredient(ctx, slot.item.id, slot.item.stage, s.x + s.w / 2, s.y + 36, 32, false);
      if (!slot.done) bar(ctx, s.x + 6, s.y + 68, s.w - 12, 10, slot.progress, '#ff7a1a');
      else if (slot.item.stage === 'burnt') text(ctx, 'BURNT!', s.x + s.w / 2, s.y + 80, 12, '#ff5a3c', 'bold', 'center');
      else { text(ctx, 'READY ✓', s.x + s.w / 2, s.y + 78, 12, '#7be495', 'bold', 'center'); bar(ctx, s.x + 6, s.y + 82, s.w - 12, 5, 1 - slot.burn / BURN_SECONDS, '#7be495'); }
    } else {
      text(ctx, '+', s.x + s.w / 2, s.y + 52, 30, '#5a606e', 'bold', 'center');
    }
  });

  // --- grill ---
  ctx.fillStyle = '#4a2c14'; rr(ctx, L.grill.x - 6, L.grill.y - 6, L.grill.w + 12, L.grill.h + 12, 12); ctx.fill();
  ctx.fillStyle = '#6b4423'; rr(ctx, L.grill.x, L.grill.y, L.grill.w, L.grill.h, 10); ctx.fill();
  stationLabel(ctx, L.grill.x + 10, L.grill.y + 22, '🔥 GRILL', 'chicken & patties');
  const g = state.grill;
  ctx.fillStyle = '#2a1a0c'; rr(ctx, L.grill.x + 14, L.grill.y + 46, L.grill.w - 28, 66, 8); ctx.fill();
  ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) { ctx.beginPath(); ctx.moveTo(L.grill.x + 18, L.grill.y + 56 + i * 14); ctx.lineTo(L.grill.x + L.grill.w - 18, L.grill.y + 56 + i * 14); ctx.stroke(); }
  if (g.item) {
    flame(ctx, L.grill.x + 40, L.grill.y + 118, 0.8, t);
    flame(ctx, L.grill.x + L.grill.w - 40, L.grill.y + 118, 0.8, t + 1);
    drawIngredient(ctx, g.item.id, g.item.stage, L.grill.x + L.grill.w / 2, L.grill.y + 76, 34, false);
    if (!g.done) bar(ctx, L.grill.x + 16, L.grill.y + 120, L.grill.w - 32, 10, g.progress, '#ff7a1a');
    else if (g.item.stage === 'burnt') text(ctx, 'BURNT!', L.grill.x + L.grill.w / 2, L.grill.y + 140, 12, '#ff5a3c', 'bold', 'center');
    else text(ctx, 'READY ✓', L.grill.x + L.grill.w / 2, L.grill.y + 140, 12, '#7be495', 'bold', 'center');
  }

  // --- trash + serve bell ---
  ctx.fillStyle = '#5a5a5a'; rr(ctx, L.trash.x, L.trash.y, L.trash.w, L.trash.h, 10); ctx.fill();
  text(ctx, '🗑', L.trash.x + L.trash.w / 2, L.trash.y + 78, 34, '#fff', 'bold', 'center');
  text(ctx, 'TRASH', L.trash.x + L.trash.w / 2, L.trash.y + 112, 11, '#fff', 'bold', 'center');
  text(ctx, 'burnt food', L.trash.x + L.trash.w / 2, L.trash.y + 128, 10, '#ddd', 'normal', 'center');
  const match = bestMatch(state);
  ctx.fillStyle = match ? '#ffd23f' : '#8a6d3b'; rr(ctx, L.bell.x, L.bell.y, L.bell.w, L.bell.h, 10); ctx.fill();
  text(ctx, '🔔', L.bell.x + L.bell.w / 2, L.bell.y + 78, 36, '#fff', 'bold', 'center');
  text(ctx, 'SERVE', L.bell.x + L.bell.w / 2, L.bell.y + 112, 12, '#fff', 'bold', 'center');
  text(ctx, match ? 'READY!' : 'plate a dish', L.bell.x + L.bell.w / 2, L.bell.y + 128, 10, '#fff', 'normal', 'center');

  // --- assembly plates (the dish mid-assembly lives here) ---
  state.plates.forEach((plate, i) => {
    const r = L.plates[i];
    const active = i === state.activePlate;
    ctx.fillStyle = active ? '#fff3d6' : '#f0e2c4'; rr(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 12); ctx.fill();
    ctx.strokeStyle = active ? '#ff7a1a' : '#b99a6a'; ctx.lineWidth = active ? 3 : 1.5; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(r.x + 78, r.y + 64, 62, 52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9c9a3'; ctx.lineWidth = 2; ctx.stroke();
    plate.items.forEach((id, j) => drawIngredient(ctx, id, 'cooked', r.x + 48 + j * 34, r.y + 64, 30, false));
    if (plate.items.length === 0) text(ctx, 'empty plate — click to add', r.x + 78, r.y + 68, 11, '#a08a68', 'normal', 'center');
    text(ctx, active ? `PLATE ${i + 1} ● assembling` : `PLATE ${i + 1}`, r.x + 12, r.y + 20, 13, '#7a4a21');
    // recipe checklist for the closest order, on its own line under the plate
    if (match && i === state.activePlate) {
      const needs = RECIPES[match.order.dish].needs;
      text(ctx, `${RECIPES[match.order.dish].name}: ` + needs.map((n) => (plate.items.includes(n) ? '✓' : '○') + ' ' + INGREDIENTS[n].name).join('  '), r.x + 12, r.y + 118, 11, match.p >= 1 ? '#1d7a3a' : '#5a3410', 'bold');
    } else {
      text(ctx, 'add prepared ingredients', r.x + 12, r.y + 118, 11, '#a08a68', 'normal');
    }
  });

  // --- ingredient bins ---
  text(ctx, '🥕 INGREDIENTS — click a bin to grab  ·  1–9,0 keys work too', 36, 470, 14, '#5a3410');
  L.bins.forEach((b) => {
    const ing = INGREDIENTS[b.id];
    ctx.fillStyle = '#fff7e8'; rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
    ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.fillText(ing.emoji, b.x + 26, b.y + 46);
    text(ctx, ing.name, b.x + 48, b.y + 30, 14, '#3a2410');
    text(ctx, `${ing.prep === 'none' ? 'ready' : ing.prep === 'chop' ? 'chop it' : ing.prep === 'cook' ? 'stove' : 'grill'} · $${ing.cost}`, b.x + 48, b.y + 52, 11, '#8a6d3b', 'normal');
    const keyNum = Object.keys(INGREDIENTS).indexOf(b.id) + 1;
    text(ctx, keyNum <= 9 ? `key ${keyNum}` : keyNum === 10 ? 'key 0' : 'mouse', b.x + b.w - 12, b.y + 18, 10, '#b99a6a', 'normal', 'right');
  });

  // --- hand ---
  ctx.fillStyle = '#2e2118'; rr(ctx, 36, 664, 880, 40, 10); ctx.fill();
  if (state.hand) {
    drawIngredient(ctx, state.hand.id, state.hand.stage, 60, 686, 26, false);
    const ing = INGREDIENTS[state.hand.id];
    text(ctx, `IN HAND: ${ing.name} (${state.hand.stage}) — click the ${ing.prep === 'chop' ? 'chopping board' : ing.prep === 'cook' ? 'stove' : ing.prep === 'grill' ? 'grill' : 'plate'} or press C / F / G / P`, 92, 690, 14, '#ffe9b3');
  } else {
    text(ctx, 'HAND EMPTY — grab an ingredient below, then chop / cook / grill it and plate it up!', 52, 690, 14, '#ffe9b3');
  }
}

function renderHud(ctx, state) {
  const level = levelOf(state);
  text(ctx, '📋 ORDER BOARD', 956, 92, 18, '#ffd23f');
  text(ctx, `${state.orders.length} ticket${state.orders.length === 1 ? '' : 's'} · served ${state.served} · lost ${state.lost}`, 956, 112, 12, '#c9b18a', 'normal');
  if (state.orders.length === 0) text(ctx, 'No orders — breathe, chef!', 956, 150, 13, '#c9b18a', 'normal');
  // Cards shrink when the board is full, so the panel never runs past 720.
  const ch = state.orders.length > 3 ? 66 : 78;
  const cstep = ch + 8;
  state.orders.forEach((o, i) => {
    const y = 126 + i * cstep;
    const frac = Math.max(0, o.patience / o.maxPatience);
    ctx.fillStyle = frac > 0.5 ? '#fff7e8' : frac > 0.25 ? '#ffe1b3' : '#ffc9b3';
    rr(ctx, 952, y, 312, ch, 10); ctx.fill();
    ctx.font = '26px serif'; ctx.textAlign = 'left'; ctx.fillText(o.customer.face, 962, y + ch * 0.55);
    text(ctx, o.customer.name, 998, y + ch * 0.3, 14, '#3a2410');
    text(ctx, o.customer.bark, 998, y + ch * 0.52, 10, '#8a6d3b', 'normal');
    text(ctx, `${RECIPES[o.dish].emoji} ${RECIPES[o.dish].name}`, 998, y + ch * 0.76, 13, '#3a2410');
    text(ctx, `$${o.price}`, 1240, y + ch * 0.3, 15, '#1d7a3a', 'bold', 'right');
    const done = state.plates[state.activePlate] && plateMatches(state, state.plates[state.activePlate], o.dish);
    text(ctx, done ? '✓ READY!' : `${Math.ceil(o.patience)}s`, 1240, y + ch * 0.76, 13, done ? '#1d7a3a' : frac > 0.25 ? '#7a4a21' : '#c0392b', 'bold', 'right');
    bar(ctx, 998, y + ch * 0.86, 180, 7, frac, frac > 0.5 ? '#58b368' : frac > 0.25 ? '#ff9f1c' : '#e63946');
  });
  const hy = 126 + Math.max(state.orders.length, 1) * cstep + 8;
  // Combo + campaign progress.
  ctx.fillStyle = '#3d2c1e'; rr(ctx, 952, hy, 312, 64, 10); ctx.fill();
  text(ctx, `🔥 COMBO ×${state.combo}  (best ×${state.bestCombo})`, 966, hy + 24, 14, state.combo >= 2 ? '#ffd23f' : '#c9b18a');
  text(ctx, `serve again within ${Math.max(0, Math.ceil(state.comboTimer))}s to keep the streak`, 966, hy + 46, 11, '#c9b18a', 'normal');
  // Compact campaign + menu: short names, two wrapped lines, never past 1264.
  const cy = hy + 76;
  const shortName = (n) => n.replace('Warung Fajar', 'Fajar').replace('Kafe Senja Mira', 'Mira').replace('Restoran Ember & Oak', 'Ember&Oak').replace('Food Truck Festival', 'Festival').replace('Grand Banquet Istana Rasa', 'Banquet');
  text(ctx, '🏆 ' + LEVELS.map((lv, i) => `${i < state.levelIndex ? '★' : i === state.levelIndex ? '▶' : '○'} ${shortName(lv.name)}`).join(' '), 956, cy, 11, '#ffd23f');
  const my = cy + 20;
  text(ctx, '📖 MENU', 956, my, 11, '#ffe9b3', 'bold');
  const shown = level.dishes.slice(0, 4);
  shown.forEach((d, i) => {
    text(ctx, `${RECIPES[d].emoji} ${RECIPES[d].name} $${RECIPES[d].price}`, 956, my + 18 + i * 15, 10, '#ffe9b3', 'normal');
  });
  const menuLines = shown.length + (level.dishes.length > 4 ? 1 : 0);
  if (level.dishes.length > 4) text(ctx, `… +${level.dishes.length - 4} more dishes`, 956, my + 18 + shown.length * 15, 10, '#c9b18a', 'normal');
  const uy = my + 18 + menuLines * 15 + 6;
  const upNames = [...state.upgrades].map((id) => UPGRADES.find((x) => x.id === id).name);
  const upLine = state.upgrades.size === 0 ? 'No upgrades yet — buy them between shifts!'
    : state.upgrades.size > 3 ? `${state.upgrades.size} upgrades: ${upNames.slice(0, 2).join(', ')} +${state.upgrades.size - 2} more`
    : upNames.join(' · ');
  text(ctx, '🛠 ' + upLine, 956, uy, 10, '#7be495');
  if (uy + 16 < 680) {
    text(ctx, '⌨ 1–0 grab · C chop · F stove', 956, 686, 10, '#8a7a68', 'normal');
    text(ctx, 'G grill · P plate · S serve · T trash · M mute', 956, 702, 10, '#8a7a68', 'normal');
  }
}

function overlay(ctx, title, lines, button) {
  ctx.fillStyle = '#000000a8'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff7e8'; rr(ctx, 290, 130, 700, 460, 18); ctx.fill();
  ctx.strokeStyle = '#e8b04b'; ctx.lineWidth = 4; ctx.stroke();
  text(ctx, title, 640, 196, 34, '#7a4a21', 'bold', 'center');
  lines.forEach((l, i) => text(ctx, l, 640, 240 + i * 30, 16, '#3a2410', l.bold ? 'bold' : 'normal', 'center'));
  if (button) {
    ctx.fillStyle = '#ff7a1a'; rr(ctx, 490, 520, 300, 52, 26); ctx.fill();
    text(ctx, button, 640, 554, 20, '#fff', 'bold', 'center');
  }
}

function renderTitle(ctx, state) {
  overlay(ctx, '🍳 EMBER & THYME', [
    { text: 'Sizzle & Serve — a five-kitchen cooking campaign', bold: true },
    { text: 'Grab ingredients, chop, cook, grill, plate — and serve before patience runs out.' },
    { text: 'Five kitchens: Warung Fajar → Kafe Senja Mira → Ember & Oak → Food Truck → Grand Banquet.' },
    { text: 'Earn coins, buy upgrades between shifts, keep your combo burning.' },
    { text: 'Mouse + keyboard: 1–0 grab · C chop · F stove · G grill · P plate · S serve' },
    { text: 'Press ENTER or click to start the first shift!', bold: true },
  ], '▶ START SHIFT 1');
}

function renderShop(ctx, state) {
  const level = LEVELS[state.levelIndex];
  const next = LEVELS[state.levelIndex + 1];
  const lines = [
    { text: `Shift complete at ${level.name}!  ★`.repeat(0) + `  ${'★'.repeat(state.stars)}${'☆'.repeat(3 - state.stars)}`, bold: true },
    { text: `You earned $${state.levelCoins} (target $${level.target}) · served ${state.served} · lost ${state.lost}` },
    { text: `Bank: $${state.bank} — spend it on upgrades, then take the next kitchen.` },
    { text: next ? `Next: ${next.name} — ${next.blurb}` : 'That was the last kitchen!' },
    { text: 'Click an upgrade below (or press 1–5), then press ENTER for the next shift.' },
  ];
  overlay(ctx, '🛒 BETWEEN SHIFTS', lines, next ? `▶ NEXT: ${next.name}` : '▶ CLAIM THE CROWN');
  // Upgrade cards row (drawn under the overlay box, still clickable).
  UPGRADES.forEach((u, i) => {
    const x = 300 + i * 138;
    const owned = state.upgrades.has(u.id);
    const afford = state.bank >= u.cost;
    ctx.fillStyle = owned ? '#d8f3dc' : afford ? '#fff7e8' : '#e8ddd0';
    rr(ctx, x, 596, 128, 84, 10); ctx.fill();
    ctx.strokeStyle = owned ? '#58b368' : '#c9a06a'; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, u.name, x + 64, 622, 12, '#3a2410', 'bold', 'center');
    text(ctx, u.desc, x + 64, 642, 9, '#7a4a21', 'normal', 'center');
    text(ctx, owned ? 'OWNED ✓' : `$${u.cost}`, x + 64, 664, 13, owned ? '#1d7a3a' : afford ? '#b3541e' : '#999', 'bold', 'center');
  });
  text(ctx, 'Click a card to buy · ENTER to continue', 640, 700, 13, '#fff7e8', 'bold', 'center');
}

function renderOver(ctx, state) {
  const level = LEVELS[state.levelIndex];
  overlay(ctx, '😞 SHIFT FAILED', [
    { text: `${level.name} needed $${level.target} — you earned $${state.levelCoins}.`, bold: true },
    { text: `Served ${state.served} dishes, lost ${state.lost} orders, burnt ${state.burnt} plates.` },
    { text: 'The customers drifted away… but the wok is still warm.' },
    { text: 'Press R to run the shift again.', bold: true },
  ], '↻ RETRY SHIFT (R)');
}

function renderCampaign(ctx, state) {
  overlay(ctx, '👑 MASTER CHEF!', [
    { text: 'You survived all five kitchens — the Grand Banquet is yours!', bold: true },
    { text: `Total served: ${state.totalServed} dishes · best combo ×${state.bestCombo} · bank $${state.bank}` },
    { text: 'Warung Fajar → Grand Banquet Istana Rasa. The crown is yours, chef.' },
    { text: 'Press R to cook the campaign again.', bold: true },
  ], '↻ PLAY AGAIN (R)');
}
