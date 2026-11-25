// Ember & Thyme — the kitchen itself: orders, chopping, cooking, plating,
// serving, money, combos and the five-level campaign. No drawing here;
// render.js reads this state, input.js calls these actions.
import {
  INGREDIENTS, RECIPES, CUSTOMERS, LEVELS, UPGRADES,
  BURN_SECONDS, COMBO_WINDOW, MAX_HEARTS, STEP,
} from './config.js';
import { mulberry32, pick, shuffle } from './random.js';

export const EVENT_ORDER = 1;
export const EVENT_SERVED = 2;
export const EVENT_LOST = 4;
export const EVENT_BURNT = 8;
export const EVENT_LEVEL_END = 16;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_SHOP = 'shop';
export const SCREEN_OVER = 'over';
export const SCREEN_CAMPAIGN = 'campaign';

function newPlate() { return { items: [] }; }
function newSlot() { return { item: null, progress: 0, done: false, burn: 0 }; }

export function freshState(seed = 1) {
  return {
    seed,
    rng: mulberry32(seed),
    screen: SCREEN_TITLE,
    levelIndex: 0,
    bank: 0,            // coins kept between shifts
    levelCoins: 0,      // coins earned this shift
    served: 0, lost: 0, burnt: 0,
    combo: 0, bestCombo: 0, comboTimer: 0,
    hearts: MAX_HEARTS,
    shiftLeft: LEVELS[0].shift,
    hand: null,         // { id, stage: 'raw'|'chopped'|'cooked' }
    board: { item: null, progress: 0 },
    stove: [newSlot(), newSlot()],
    grill: newSlot(),
    plates: [newPlate()],
    activePlate: 0,
    orders: [],
    spawnTimer: 2,
    orderSeq: 0,
    customerSeq: 0,
    upgrades: new Set(),
    toast: '',
    toastTimer: 0,
    stars: 0,
    totalServed: 0,
    time: 0,
  };
}

export function levelOf(state) { return LEVELS[state.levelIndex]; }
export function dishNeeds(dishId) { return RECIPES[dishId].needs; }

export function plateMatches(state, plate, dishId) {
  const needs = dishNeeds(dishId).slice().sort();
  const have = plate.items.slice().sort();
  return needs.length === have.length && needs.every((n, i) => n === have[i]);
}

export function plateProgress(state, plate, dishId) {
  const needs = dishNeeds(dishId);
  return plate.items.filter((id) => needs.includes(id)).length / needs.length;
}

// The order the active plate is closest to completing (for the HUD hint).
export function bestMatch(state) {
  const plate = state.plates[state.activePlate];
  if (plate.items.length === 0) return null;
  let best = null;
  for (const order of state.orders) {
    const p = plateProgress(state, plate, order.dish);
    if (p > 0 && (!best || p > best.p)) best = { order, p };
  }
  return best;
}

function spawnOrder(state) {
  const level = levelOf(state);
  const dish = pick(state.rng, level.dishes);
  const customer = CUSTOMERS[state.customerSeq % CUSTOMERS.length];
  state.customerSeq += 1;
  const patience = level.patience * (state.upgrades.has('charm') ? 1.25 : 1);
  state.orders.push({
    id: state.orderSeq += 1,
    dish, customer, patience, maxPatience: patience,
    price: RECIPES[dish].price,
  });
  return EVENT_ORDER;
}

export function startLevel(state, index) {
  const level = LEVELS[index];
  state.levelIndex = index;
  state.screen = SCREEN_PLAY;
  state.levelCoins = 0;
  state.served = 0; state.lost = 0; state.burnt = 0;
  state.combo = 0; state.comboTimer = 0;
  state.hearts = MAX_HEARTS;
  state.shiftLeft = level.shift;
  state.hand = null;
  state.board = { item: null, progress: 0 };
  state.stove = [newSlot(), newSlot()];
  if (state.upgrades.has('burner')) state.stove.push(newSlot());
  state.grill = newSlot();
  state.plates = [newPlate()];
  if (state.upgrades.has('plate')) state.plates.push(newPlate());
  state.activePlate = 0;
  state.orders = [];
  state.spawnTimer = 1.5;
  state.orderSeq = 0;
  state.toast = `${level.name} — earn $${level.target} before the shift ends!`;
  state.toastTimer = 3;
  spawnOrder(state);
  spawnOrder(state);
}

export function startCampaign(state) {
  state.bank = 0; state.totalServed = 0; state.stars = 0;
  state.upgrades = new Set();
  startLevel(state, 0);
}

// --- player actions (called by input.js) ---

export function grabIngredient(state, id) {
  if (state.screen !== SCREEN_PLAY || state.hand) return false;
  state.hand = { id, stage: 'raw' };
  return true;
}

export function chopSpeed(state) { return state.upgrades.has('knife') ? 2 : 1; }
export function cookSpeed(state) { return state.upgrades.has('pan') ? 2 : 1; }

// Put the hand's raw ingredient on the board, or chop what is there.
export function useBoard(state) {
  if (state.screen !== SCREEN_PLAY) return 'none';
  if (state.board.item) {
    state.board.progress += 0.34 * chopSpeed(state);
    if (state.board.progress >= 1) {
      const id = state.board.item.id;
      state.board = { item: null, progress: 0 };
      state.hand = { id, stage: 'chopped' };
      return 'chopped';
    }
    return 'chopping';
  }
  if (state.hand && state.hand.stage === 'raw' && INGREDIENTS[state.hand.id].prep === 'chop') {
    state.board = { item: state.hand, progress: 0 };
    state.hand = null;
    return 'placed';
  }
  return 'none';
}

// Put the hand's ingredient on a free stove burner, or take a finished one.
export function useStove(state, slotIndex) {
  if (state.screen !== SCREEN_PLAY) return 'none';
  const slot = state.stove[slotIndex];
  if (!slot) return 'none';
  if (slot.item && slot.done && !state.hand) {
    state.hand = slot.item; state.stove[slotIndex] = newSlot();
    return slot.item.stage === 'burnt' ? 'burnt-taken' : 'taken';
  }
  if (!slot.item && state.hand) {
    const ing = INGREDIENTS[state.hand.id];
    if (ing.prep !== 'cook' || state.hand.stage === 'cooked') return 'wrong';
    slot.item = state.hand; slot.progress = 0; slot.done = false; slot.burn = 0;
    state.hand = null;
    return 'cooking';
  }
  return 'none';
}

export function useGrill(state) {
  if (state.screen !== SCREEN_PLAY) return 'none';
  const slot = state.grill;
  if (slot.item && slot.done && !state.hand) {
    state.hand = slot.item; state.grill = newSlot();
    return slot.item.stage === 'burnt' ? 'burnt-taken' : 'taken';
  }
  if (!slot.item && state.hand) {
    const ing = INGREDIENTS[state.hand.id];
    if (ing.prep !== 'grill') return 'wrong';
    slot.item = state.hand; slot.progress = 0; slot.done = false; slot.burn = 0;
    state.hand = null;
    return 'grilling';
  }
  return 'none';
}

// Add the hand's prepared ingredient to the active plate.
export function usePlate(state, plateIndex = null) {
  if (state.screen !== SCREEN_PLAY) return 'none';
  const idx = plateIndex === null ? state.activePlate : plateIndex;
  const plate = state.plates[idx];
  if (!plate) return 'none';
  if (state.hand) {
    const { id, stage } = state.hand;
    const ing = INGREDIENTS[id];
    const ready = (ing.prep === 'none' && stage === 'raw')
      || (ing.prep === 'chop' && stage === 'chopped')
      || ((ing.prep === 'cook' || ing.prep === 'grill') && stage === 'cooked');
    if (!ready) return 'not-ready';
    if (plate.items.includes(id)) return 'duplicate';
    plate.items.push(id);
    state.hand = null;
    return 'plated';
  }
  // Empty hand on a plate: pull the last item back off.
  if (plate.items.length > 0) {
    const id = plate.items.pop();
    const ing = INGREDIENTS[id];
    state.hand = { id, stage: ing.prep === 'none' ? 'raw' : ing.prep === 'chop' ? 'chopped' : 'cooked' };
    return 'unplated';
  }
  return 'none';
}

export function useTrash(state) {
  if (state.screen !== SCREEN_PLAY || !state.hand) return false;
  if (state.hand.stage === 'burnt') state.burnt += 1;
  state.hand = null;
  return true;
}

// Serve the active plate to the first order it completes.
export function serve(state) {
  if (state.screen !== SCREEN_PLAY) return null;
  const plate = state.plates[state.activePlate];
  if (plate.items.length === 0) return null;
  const orderIndex = state.orders.findIndex((o) => plateMatches(state, plate, o.dish));
  if (orderIndex === -1) return { ok: false };
  const order = state.orders[orderIndex];
  const cost = dishNeeds(order.dish).reduce((s, id) => s + INGREDIENTS[id].cost, 0);
  const tip = Math.round(order.price * 0.4 * (order.patience / order.maxPatience));
  const comboBonus = state.combo >= 2 ? 2 * (state.combo - 1) : 0;
  const payout = order.price - cost + tip + comboBonus;
  state.levelCoins += payout;
  state.bank += payout;
  state.served += 1; state.totalServed += 1;
  state.combo += 1; state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.comboTimer = COMBO_WINDOW;
  state.orders.splice(orderIndex, 1);
  plate.items = [];
  state.toast = `Served ${RECIPES[order.dish].name} to ${order.customer.name} — $${payout} (+$${tip} tip${comboBonus ? `, +$${comboBonus} combo` : ''})`;
  state.toastTimer = 2.5;
  return { ok: true, payout, dish: order.dish, customer: order.customer.name };
}

export function buyUpgrade(state, id) {
  const up = UPGRADES.find((u) => u.id === id);
  if (!up || state.upgrades.has(id) || state.bank < up.cost) return false;
  state.bank -= up.cost;
  state.upgrades.add(id);
  if (id === 'burner') state.stove.push(newSlot());
  if (id === 'plate') state.plates.push(newPlate());
  return true;
}

// --- the clock: patience, cooking, spawning, shift end ---
export function step(state, dt) {
  if (state.screen !== SCREEN_PLAY) return 0;
  let events = 0;
  state.time += dt;
  state.shiftLeft -= dt;
  if (state.toastTimer > 0) state.toastTimer -= dt;
  if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.combo = 0; }

  const level = levelOf(state);
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.orders.length < level.maxOrders) {
    spawnOrder(state);
    state.spawnTimer = level.spawn;
    events |= EVENT_ORDER;
  }
  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const o = state.orders[i];
    o.patience -= dt;
    if (o.patience <= 0) {
      state.orders.splice(i, 1);
      state.lost += 1; state.hearts -= 1; state.combo = 0;
      state.toast = `${o.customer.name} walked out — ${RECIPES[o.dish].name} never arrived!`;
      state.toastTimer = 2.5;
      events |= EVENT_LOST;
    }
  }
  const cook = (slot) => {
    if (!slot.item || slot.done) {
      if (slot.item && slot.done) {
        slot.burn += dt;
        if (slot.burn > BURN_SECONDS) { slot.item.stage = 'burnt'; slot.burn = -9999; events |= EVENT_BURNT; }
      }
      return;
    }
    slot.progress += (dt / 4) * cookSpeed(state);
    if (slot.progress >= 1) { slot.progress = 1; slot.done = true; slot.item.stage = 'cooked'; slot.burn = 0; }
  };
  state.stove.forEach(cook);
  cook(state.grill);

  if (state.shiftLeft <= 0 || state.hearts <= 0) {
    state.shiftLeft = Math.max(0, state.shiftLeft);
    const passed = state.levelCoins >= level.target;
    state.stars = state.levelCoins >= level.target * 1.5 ? 3 : passed ? 2 : state.levelCoins >= level.target * 0.7 ? 1 : 0;
    state.screen = passed ? SCREEN_SHOP : SCREEN_OVER;
    events |= EVENT_LEVEL_END;
  }
  return events;
}

export function nextLevel(state) {
  if (state.levelIndex + 1 >= LEVELS.length) { state.screen = SCREEN_CAMPAIGN; return; }
  startLevel(state, state.levelIndex + 1);
}

export { STEP };
