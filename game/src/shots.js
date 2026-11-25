// Ember & Thyme — the screenshot scenes behind ?shot=cover|rush|serve|
// banquet. Each one builds a real mid-action kitchen directly from the
// game's own rules (orders with real patience, a dish half-assembled on the
// plate, food cooking and almost burning), so the frame is what a busy
// shift really looks like — the same seed always gives the same frame.
import { RECIPES, LEVELS, CUSTOMERS } from './config.js';
import { freshState, startLevel, SCREEN_PLAY } from './world.js';

function order(state, dish, customerIndex, patienceFrac) {
  const level = LEVELS[state.levelIndex];
  const customer = CUSTOMERS[customerIndex % CUSTOMERS.length];
  const patience = level.patience * patienceFrac;
  state.orders.push({
    id: state.orderSeq += 1, dish, customer, patience, maxPatience: level.patience,
    price: RECIPES[dish].price,
  });
}

function cookOn(state, where, id, progress, done) {
  const slot = where === 'grill' ? state.grill : state.stove[where];
  slot.item = { id, stage: done ? 'cooked' : 'raw' };
  slot.progress = progress; slot.done = done; slot.burn = done ? 5.5 : 0;
}

// Stage one named scene and return the screen to draw.
export function stageShot(name, state) {
  const scenes = {
    // Cover: Ember & Oak at full tilt — 4 tickets, one nearly out of time,
    // sate half-built on the plate, chicken grilling, burners full.
    cover() {
      startLevel(state, 2);
      state.bank = 148; state.levelCoins = 96; state.combo = 3; state.comboTimer = 9;
      state.shiftLeft = 47; state.served = 7; state.bestCombo = 4;
      state.orders = []; state.orderSeq = 0;
      order(state, 'sateEmber', 0, 0.62);
      order(state, 'burger', 1, 0.38);
      order(state, 'mieAyam', 4, 0.18);
      order(state, 'supTomat', 7, 0.85);
      state.plates[0].items = ['chicken', 'peanut'];
      state.hand = { id: 'chilli', stage: 'chopped' };
      cookOn(state, 0, 'noodle', 0.72, false);
      cookOn(state, 1, 'egg', 1, true);
      cookOn(state, 'grill', 'chicken', 0.55, false);
      state.board.item = { id: 'tomato', stage: 'raw' };
      state.board.progress = 0.66;
      state.toast = 'Served Burger Istana to Sari — $24 (+$6 tip, +$4 combo)';
      state.toastTimer = 99;
    },
    // Rush: the food-truck festival, tickets stacked, patience bleeding.
    rush() {
      startLevel(state, 3);
      state.bank = 210; state.levelCoins = 154; state.combo = 5; state.comboTimer = 6;
      state.shiftLeft = 33; state.served = 11; state.bestCombo = 6;
      state.orders = []; state.orderSeq = 0;
      order(state, 'burger', 2, 0.25);
      order(state, 'sateEmber', 10, 0.55);
      order(state, 'nasiAyam', 3, 0.7);
      order(state, 'pancake', 5, 0.12);
      state.plates[0].items = ['bun', 'patty', 'tomato'];
      state.hand = { id: 'cheese', stage: 'raw' };
      cookOn(state, 0, 'chicken', 0.9, false);
      cookOn(state, 1, 'potato', 0.4, false);
      cookOn(state, 'grill', 'patty', 1, true);
      state.board.item = { id: 'chilli', stage: 'raw' };
      state.board.progress = 0.3;
      state.toast = 'Combo ×5! Keep serving within 12s to keep the streak';
      state.toastTimer = 99;
    },
    // Serve: a plate finished and ready at the bell, customer smiling.
    serve() {
      startLevel(state, 1);
      state.bank = 86; state.levelCoins = 64; state.combo = 2; state.comboTimer = 10;
      state.shiftLeft = 61; state.served = 5; state.bestCombo = 3;
      state.orders = []; state.orderSeq = 0;
      order(state, 'mieAyam', 6, 0.75);
      order(state, 'nasiGoreng', 8, 0.5);
      order(state, 'salad', 11, 0.9);
      state.plates[0].items = ['noodle', 'chicken', 'greens'];
      state.hand = null;
      cookOn(state, 0, 'egg', 0.6, false);
      state.toast = 'Mie Ayam Mira is plated — ring the bell to serve Tuan Ong!';
      state.toastTimer = 99;
    },
    // Banquet: the finale kitchen, five tickets, upgrades owned, two plates.
    banquet() {
      startLevel(state, 4);
      state.upgrades.add('knife'); state.upgrades.add('pan'); state.upgrades.add('burner'); state.upgrades.add('charm'); state.upgrades.add('plate');
      startLevel(state, 4);
      state.bank = 402; state.levelCoins = 268; state.combo = 7; state.comboTimer = 8;
      state.shiftLeft = 58; state.served = 19; state.bestCombo = 8;
      state.orders = []; state.orderSeq = 0;
      order(state, 'burger', 4, 0.6);
      order(state, 'sateEmber', 0, 0.3);
      order(state, 'mieAyam', 9, 0.8);
      order(state, 'pancake', 1, 0.45);
      order(state, 'supTomat', 7, 0.65);
      state.plates[0].items = ['chicken', 'peanut'];
      state.plates[1].items = ['bun'];
      state.hand = { id: 'chilli', stage: 'chopped' };
      cookOn(state, 0, 'noodle', 0.8, false);
      cookOn(state, 1, 'egg', 1, true);
      cookOn(state, 2, 'potato', 0.5, false);
      cookOn(state, 'grill', 'chicken', 0.7, false);
      state.board.item = { id: 'tomato', stage: 'raw' };
      state.board.progress = 0.8;
      state.toast = 'Grand Banquet — 19 dishes served, the crown is in sight!';
      state.toastTimer = 99;
    },
  };
  const scene = scenes[name] || scenes.cover;
  scene();
  state.screen = SCREEN_PLAY;
  return { screen: SCREEN_PLAY };
}

export function freshShotState(seed = 1) {
  return freshState(seed);
}
