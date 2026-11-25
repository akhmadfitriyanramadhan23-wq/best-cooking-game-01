// Ember & Thyme — boot + game loop. ?shot=<name>&seed=<n> stages a
// screenshot scene instead of the title screen; otherwise the title shows
// and the campaign starts on click / Enter.
import { W, H, STEP } from './config.js';
import { freshState, step, SCREEN_PLAY } from './world.js';
import { render } from './render.js';
import { handleClick, handleKey } from './input.js';
import { stageShot } from './shots.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.width = W; canvas.height = H;
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const state = freshState(seed);
window.__gameState = state; // playtest hook: lets a test read orders/plates
let shot = null;
if (params.get('shot')) {
  shot = params.get('shot');
  stageShot(shot, state);
  // Freeze the staged frame: no ticking, so patience and timers hold still.
  window.__shotReady = true;
} else {
  window.__shotReady = true;
}

fitCanvas();
window.addEventListener('resize', fitCanvas);

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * W;
  const y = ((event.clientY - rect.top) / rect.height) * H;
  handleClick(state, x, y);
  announce();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') event.preventDefault();
  handleKey(state, event.key);
  announce();
});

function announce() {
  if (!statusEl) return;
  const level = state.levelIndex + 1;
  statusEl.textContent = `Ember and Thyme, level ${level}. Coins $${state.bank}. `
    + `${state.orders.length} orders waiting. ${state.served} served.`;
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!shot && state.screen === SCREEN_PLAY) {
    acc += dt;
    while (acc >= STEP) {
      const events = step(state, STEP);
      if (events & 2) sfx.serve();
      if (events & 4) sfx.fail();
      if (events & 8) sfx.burn();
      if (events & 16) sfx.win();
      acc -= STEP;
    }
  }
  render(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
