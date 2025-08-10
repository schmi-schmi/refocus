// Simple, modular idle pet overlay using kaboom.js
// Folder structure:
// - game/
//   - game.js (entry)
//   - world.js (floor, items)
//   - cat.js (behaviors)
//   - ui.js (laser pointer toggle)

import { initOverlay } from './world.js';
import { spawnCat } from './pet.js';
import { initUI } from './ui.js';

// Create a host container that won't block clicks except for our small UI
function ensureOverlayRoot() {
  let root = document.getElementById('pet-overlay');
  if (!root) {
    root = document.createElement('div');
    root.id = 'pet-overlay';
    document.body.appendChild(root);
  }
  return root;
}

(async function main() {
  const root = ensureOverlayRoot();
  const overlay = await initOverlay(root);

  const { setLaserActive, isLaserActive, onLaserState } = initUI();

  const cat = spawnCat(overlay.k, {
    isLaserActive,
    getItemTargets: overlay.getItemTargets,
    consume: overlay.consume,
    getLevels: overlay.getLevels,
  });

  // Reflect UI state to cat behaviors
  onLaserState((active) => {
    cat.setChasingLaser(Boolean(active));
  });
})();


