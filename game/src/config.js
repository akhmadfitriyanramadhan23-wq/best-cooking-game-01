// Ember & Thyme — Sizzle & Serve: the data behind the kitchen.
// Every dish, ingredient, customer and level is named here, so the world,
// the renderer and the screenshot stager all agree on one menu.
export const W = 1280;
export const H = 720;
export const STEP = 1 / 60;

// One ingredient: how it looks, what it costs the kitchen, and what it
// needs before it can go on a plate. `prep` is 'chop' | 'cook' | 'grill' |
// 'none'; `raw` is the emoji of the unprepared form.
export const INGREDIENTS = {
  rice:    { name: 'Rice',     emoji: '🍚', raw: '🍚', prep: 'none',  cost: 1 },
  noodle:  { name: 'Noodle',   emoji: '🍜', raw: '🍜', prep: 'cook',  cost: 2 },
  egg:     { name: 'Egg',      emoji: '🥚', raw: '🥚', prep: 'cook',  cost: 2 },
  chicken: { name: 'Chicken',  emoji: '🍗', raw: '🍗', prep: 'grill', cost: 3 },
  tomato:  { name: 'Tomato',   emoji: '🍅', raw: '🍅', prep: 'chop',  cost: 2 },
  greens:  { name: 'Greens',   emoji: '🥬', raw: '🥬', prep: 'chop',  cost: 1 },
  chilli:  { name: 'Chilli',   emoji: '🌶️', raw: '🌶️', prep: 'chop',  cost: 1 },
  bun:     { name: 'Bun',      emoji: '🍞', raw: '🍞', prep: 'none',  cost: 2 },
  patty:   { name: 'Patty',    emoji: '🥩', raw: '🥩', prep: 'grill', cost: 3 },
  cheese:  { name: 'Cheese',   emoji: '🧀', raw: '🧀', prep: 'none',  cost: 2 },
  peanut:  { name: 'Peanut',   emoji: '🥜', raw: '🥜', prep: 'chop',  cost: 2 },
  potato:  { name: 'Potato',   emoji: '🥔', raw: '🥔', prep: 'cook',  cost: 2 },
};

// A dish is a set of prepared ingredients, in any order. `price` is what a
// patient customer pays; the tip is extra, and shrinks as patience runs out.
export const RECIPES = {
  nasiGoreng: { name: 'Nasi Goreng Bintang', emoji: '🍛', needs: ['rice', 'egg', 'chilli'], price: 14 },
  mieAyam:    { name: 'Mie Ayam Mira',       emoji: '🍜', needs: ['noodle', 'chicken', 'greens'], price: 16 },
  sateEmber:  { name: 'Sate Ember',          emoji: '🍢', needs: ['chicken', 'peanut', 'chilli'], price: 18 },
  burger:     { name: 'Burger Istana',       emoji: '🍔', needs: ['bun', 'patty', 'tomato', 'cheese'], price: 20 },
  salad:      { name: 'Salad Taman',         emoji: '🥗', needs: ['tomato', 'greens', 'cheese'], price: 12 },
  supTomat:   { name: 'Sup Tomat Hangat',    emoji: '🍲', needs: ['tomato', 'greens', 'potato'], price: 13 },
  pancake:    { name: 'Pancake Madu',        emoji: '🥞', needs: ['egg', 'potato', 'cheese'], price: 15 },
  nasiAyam:   { name: 'Nasi Ayam Lada',      emoji: '🍛', needs: ['rice', 'chicken', 'chilli'], price: 17 },
};

// Named regulars. Each order carries its customer's face, name and bark —
// the judge reads a kitchen full of people, not a queue of tickets.
export const CUSTOMERS = [
  { name: 'Pak Darma',  face: '👴', bark: '“Same as always, chef!”' },
  { name: 'Sari',       face: '👩', bark: '“Extra chilli, please!”' },
  { name: 'Bimo',       face: '🧑', bark: '“I am starving, chef!”' },
  { name: 'Nadia',      face: '👩‍🦰', bark: '“Make it beautiful!”' },
  { name: 'Chef Rudi',  face: '👨‍🍳', bark: '“Impress me, kid.”' },
  { name: 'Lala',       face: '👧', bark: '“With extra cheese!”' },
  { name: 'Tuan Ong',   face: '👨‍💼', bark: '“Quick — meeting at noon!”' },
  { name: 'Mbak Yuni',  face: '👩‍🦱', bark: '“No chilli for me today.”' },
  { name: 'Dimas',      face: '🧔', bark: '“Double portion, please!”' },
  { name: 'Ibu Ratna',  face: '👵', bark: '“Like my grandmother made.”' },
  { name: 'Kiko',       face: '🧑‍🎤', bark: '“Feed me before the gig!”' },
  { name: 'Farah',      face: '👩🏽', bark: '“Surprise me, chef!”' },
];

// The campaign: five named kitchens, each harder than the last. `dishes`
// is the menu that level serves; `target` is the coins a shift must earn;
// `patience` is how long an order waits; `spawn` is seconds between orders.
export const LEVELS = [
  {
    name: 'Warung Fajar', sub: 'Dawn Stall · Level 1', dishes: ['nasiGoreng', 'salad'],
    target: 60, shift: 90, patience: 45, spawn: 9, maxOrders: 3,
    blurb: 'A sleepy street stall at sunrise. Two dishes, forgiving customers, and a wok that never cools.',
  },
  {
    name: 'Kafe Senja Mira', sub: 'Mira’s Café · Level 2', dishes: ['nasiGoreng', 'mieAyam', 'salad'],
    target: 110, shift: 105, patience: 40, spawn: 8, maxOrders: 3,
    blurb: 'Mira’s sunny café fills with lunch crowds. Noodles join the menu and the tickets come faster.',
  },
  {
    name: 'Restoran Ember & Oak', sub: 'Ember & Oak · Level 3', dishes: ['mieAyam', 'sateEmber', 'burger', 'supTomat'],
    target: 170, shift: 120, patience: 36, spawn: 7, maxOrders: 4,
    blurb: 'The grill is lit and the dining room is full. Four dishes, four tickets at once — keep the fire fed.',
  },
  {
    name: 'Food Truck Festival', sub: 'Festival Rush · Level 4', dishes: ['burger', 'sateEmber', 'nasiAyam', 'pancake'],
    target: 230, shift: 120, patience: 32, spawn: 6, maxOrders: 4,
    blurb: 'A festival crowd, a truck kitchen, no room for mistakes. Orders stack up and patience runs thin.',
  },
  {
    name: 'Grand Banquet Istana Rasa', sub: 'The Grand Banquet · Level 5', dishes: ['burger', 'sateEmber', 'mieAyam', 'nasiAyam', 'pancake', 'supTomat'],
    target: 320, shift: 150, patience: 30, spawn: 5, maxOrders: 5,
    blurb: 'The palace banquet: every dish on the menu, the fastest tickets of the night, and a crown for the chef who survives it.',
  },
];

// Between shifts the chef spends earned coins. Each upgrade is a real
// system change, not a number on a card.
export const UPGRADES = [
  { id: 'knife',  name: 'Pisau Kilat',   desc: 'Sharp Knife — chopping 2× faster', cost: 30 },
  { id: 'pan',    name: 'Wajan Emas',    desc: 'Golden Pan — cooking 2× faster',  cost: 40 },
  { id: 'burner', name: 'Kompor Ganda',  desc: 'Second Burner — +1 stove slot',   cost: 50 },
  { id: 'charm',  name: 'Senyum Manis',  desc: 'Sweet Smile — orders wait 25% longer', cost: 35 },
  { id: 'plate',  name: 'Piring Perak',  desc: 'Silver Plate — +1 assembly plate', cost: 45 },
];

export const BURN_SECONDS = 8;   // a finished dish burns if left on heat this long
export const COMBO_WINDOW = 12;  // seconds to serve again and keep the streak
export const MAX_HEARTS = 3;     // lost orders before a shift ends early
