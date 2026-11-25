// Ember & Thyme — mouse + keyboard. Every click region comes from
// render.js's layout(); keys mirror the same verbs.
import { INGREDIENTS, UPGRADES } from './config.js';
import { layout } from './render.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_SHOP, SCREEN_OVER, SCREEN_CAMPAIGN,
  grabIngredient, useBoard, useStove, useGrill, usePlate, useTrash, serve,
  buyUpgrade, nextLevel, startLevel, startCampaign,
} from './world.js';
import { sfx, toggleMute } from './audio.js';

function inside(r, x, y) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }

function act(state, result) {
  if (result === 'chopped' || result === 'taken') sfx.plate();
  else if (result === 'chopping') sfx.chop();
  else if (result === 'cooking' || result === 'grilling') sfx.sizzle();
  else if (result === 'plated') sfx.plate();
  else if (result === 'placed') sfx.pick();
  else if (result === 'wrong' || result === 'not-ready' || result === 'duplicate') sfx.fail();
}

export function handleClick(state, x, y) {
  const L = layout(state);
  if (state.screen === SCREEN_TITLE) { sfx.ding(); startCampaign(state); return; }
  if (state.screen === SCREEN_OVER || state.screen === SCREEN_CAMPAIGN) { startCampaign(state); return; }
  if (state.screen === SCREEN_SHOP) {
    // Upgrade cards live under the overlay box.
    for (let i = 0; i < UPGRADES.length; i += 1) {
      const cx = 300 + i * 138;
      if (x >= cx && x < cx + 128 && y >= 596 && y < 680) {
        if (buyUpgrade(state, UPGRADES[i].id)) sfx.ding(); else sfx.fail();
        return;
      }
    }
    nextLevel(state);
    sfx.ding();
    return;
  }
  if (state.screen !== SCREEN_PLAY) return;
  if (inside(L.board, x, y)) { act(state, useBoard(state)); return; }
  for (let i = 0; i < L.stoveSlots.length; i += 1) {
    if (inside(L.stoveSlots[i], x, y) || inside(L.stove, x, y) && i === 0) {
      // Clicking anywhere on the stove body targets the first free/done slot.
      const idx = inside(L.stoveSlots[i], x, y) ? i : state.stove.findIndex((s) => s.item && s.done) >= 0
        ? state.stove.findIndex((s) => s.item && s.done) : state.stove.findIndex((s) => !s.item);
      if (idx >= 0) act(state, useStove(state, idx));
      return;
    }
  }
  if (inside(L.grill, x, y)) { act(state, useGrill(state)); return; }
  if (inside(L.trash, x, y)) { if (useTrash(state)) sfx.fail(); return; }
  if (inside(L.bell, x, y)) {
    const r = serve(state);
    if (r && r.ok) sfx.serve(); else sfx.fail();
    return;
  }
  for (let i = 0; i < L.plates.length; i += 1) {
    if (inside(L.plates[i], x, y)) {
      state.activePlate = i;
      act(state, usePlate(state, i));
      return;
    }
  }
  for (const b of L.bins) {
    if (inside(b, x, y)) { if (grabIngredient(state, b.id)) sfx.pick(); return; }
  }
}

export function handleKey(state, key) {
  const k = key.toLowerCase();
  if (k === 'm') { toggleMute(); return; }
  if (state.screen === SCREEN_TITLE && (k === 'enter' || k === ' ')) { sfx.ding(); startCampaign(state); return; }
  if ((state.screen === SCREEN_OVER || state.screen === SCREEN_CAMPAIGN) && k === 'r') { startCampaign(state); return; }
  if (state.screen === SCREEN_SHOP) {
    const n = parseInt(k, 10);
    if (n >= 1 && n <= UPGRADES.length) { if (buyUpgrade(state, UPGRADES[n - 1].id)) sfx.ding(); else sfx.fail(); return; }
    if (k === 'enter') { nextLevel(state); sfx.ding(); }
    return;
  }
  if (state.screen !== SCREEN_PLAY) return;
  const ids = Object.keys(INGREDIENTS);
  const num = k === '0' ? 10 : parseInt(k, 10);
  if (num >= 1 && num <= 10) { if (grabIngredient(state, ids[num - 1])) sfx.pick(); return; }
  if (k === 'c') { act(state, useBoard(state)); return; }
  if (k === 'f') {
    const idx = state.stove.findIndex((s) => s.item && s.done) >= 0
      ? state.stove.findIndex((s) => s.item && s.done) : state.stove.findIndex((s) => !s.item);
    if (idx >= 0) act(state, useStove(state, idx));
    return;
  }
  if (k === 'g') { act(state, useGrill(state)); return; }
  if (k === 'p') { act(state, usePlate(state)); return; }
  if (k === 't') { if (useTrash(state)) sfx.fail(); return; }
  if (k === 's') {
    const r = serve(state);
    if (r && r.ok) sfx.serve(); else sfx.fail();
    return;
  }
  if (k === 'tab') { state.activePlate = (state.activePlate + 1) % state.plates.length; }
}
