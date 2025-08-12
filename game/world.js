// World and kaboom initialization

export async function initOverlay(rootEl) {
  // Dynamically load kaboom from CDN to keep repo lightweight
  const kaboom = await loadKaboom();

  const k = kaboom({
    global: false,
    width: window.innerWidth,
    height: window.innerHeight,
    canvas: createCanvas(rootEl),
    background: [0, 0, 0, 0], // fully transparent
    scale: 1,
    crisp: true,
    debug: false,
  });

  // Ensure our pixel-art SVG sprites are registered before rendering
  await registerPixelSprites(k);

  // Build world elements and rebuild on resize so the floor is flush with bottom
  let worldNodes = [];
  let itemTargets = { food: { x: 0, y: 0 }, water: { x: 0, y: 0 }, bed: { x: 0, y: 0 } };
  let itemState = {
    food: { level: 100, fillNode: null, widthMax: 52 },
    water: { level: 100, fillNode: null, widthMax: 52 },
    bed: { level: 100 },
  };
  let roomBounds = { x: 0, y: 0, width: 0, height: 0 };

  // Add a floor item sprite, and for food/water also add a fill overlay used for visual depletion
  function addFloorItem(k, x, floorY, kind) {
    const spriteHeight = 24; // our SVGs are 64x24
    const FLOOR_OVERLAP = 1; // nudge down to visually sit flush with the floor line
    const top = floorY - spriteHeight + FLOOR_OVERLAP;

    const spriteNode = k.add([
      k.pos(x, top),
      k.sprite(kind),
      k.anchor('topleft'),
    ]);
    worldNodes.push(spriteNode);

    // Add overlay fills for food and water to allow depletion visuals
    if (kind === 'water') {
      const offsetX = 6;  // matches SVG water x
      const offsetY = 13; // matches SVG water y
      const widthMax = itemState.water.widthMax;
      const fill = k.add([
        k.pos(x + offsetX, top + offsetY),
        k.rect(widthMax, 4),
        k.color(74, 163, 255),
        k.anchor('topleft'),
      ]);
      worldNodes.push(fill);
      itemState.water.fillNode = fill;
    } else if (kind === 'food') {
      const offsetX = 6;  // approximate for kibble band
      const offsetY = 7;
      const widthMax = itemState.food.widthMax;
      const fill = k.add([
        k.pos(x + offsetX, top + offsetY),
        k.rect(widthMax, 3),
        k.color(216, 160, 58),
        k.anchor('topleft'),
      ]);
      worldNodes.push(fill);
      itemState.food.fillNode = fill;
    }

    return [spriteNode];
  }

  function clearWorld() {
    worldNodes.forEach(n => { try { n.destroy(); } catch {} });
    worldNodes = [];
  }

  function renderWorld() {
    clearWorld();
    const floorY = window.innerHeight - 2; // flush with bottom

    const floor = k.add([
      k.pos(0, floorY),
      k.rect(window.innerWidth, 2),
      k.color(120, 120, 120),
      k.opacity(0.2),
      k.area(),
      k.anchor('topleft'),
      { id: 'floor' },
    ]);
    worldNodes.push(floor);


    // Place items on the floor, spaced evenly
    const gap = 90;
    const baseX = 22;
    worldNodes.push(...addFloorItem(k, baseX, floorY, 'food'));
    worldNodes.push(...addFloorItem(k, baseX + gap, floorY, 'water'));
    worldNodes.push(...addFloorItem(k, baseX + gap * 2 + 30, floorY, 'bed'));

    // Expose center X positions for AI navigation
    itemTargets = {
      food: { x: baseX + 32, y: floorY },
      water: { x: baseX + gap + 32, y: floorY },
      bed: { x: baseX + gap * 2 + 30 + 32, y: floorY },
    };

    // No room bounds needed, but keep the API
    roomBounds = { x: 0, y: 0, width: 0, height: 0 };

    // Sync overlay fill visuals to current levels after rebuild
    updateItemFills();
  }

  renderWorld();

  // Responsive canvas + world rebuild
  window.addEventListener('resize', () => {
    try {
      k.resize(window.innerWidth, window.innerHeight);
      renderWorld();
    } catch {}
  });

  function consume(kind, amount) {
    const s = itemState[kind];
    if (!s) return 0;
    s.level = Math.max(0, Math.min(100, s.level - amount));
    updateItemFills();
    return s.level;
  }

  function getLevels() {
    return { food: itemState.food.level, water: itemState.water.level, bed: itemState.bed.level };
  }

  function updateItemFills() {
    // Update overlay widths based on levels
    const food = itemState.food;
    if (food.fillNode) {
      const w = Math.round((food.widthMax * food.level) / 100);
      food.fillNode.width = Math.max(0, w);
    }
    const water = itemState.water;
    if (water.fillNode) {
      const w = Math.round((water.widthMax * water.level) / 100);
      water.fillNode.width = Math.max(0, w);
    }
  }

  return {
    k,
    getItemTargets: () => ({ ...itemTargets }),
    consume,
    getLevels,
    getRoomBounds: () => ({ ...roomBounds }),
  };
}

function createCanvas(root) {
  const c = document.createElement('canvas');
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  c.style.pointerEvents = 'none';
  root.appendChild(c);
  return c;
}

function addFloorItem(k, x, floorY, kind) {
  const spriteHeight = 24; // our SVGs are 64x24
  const FLOOR_OVERLAP = 1; // nudge down to visually sit flush with the floor line
  const top = floorY - spriteHeight + FLOOR_OVERLAP;

  const spriteNode = k.add([
    k.pos(x, top),
    k.sprite(kind),
    k.anchor('topleft'),
  ]);

  // Add overlay fills for food and water to allow depletion visuals
  if (kind === 'water') {
    const offsetX = 6;  // matches SVG water x
    const offsetY = 13; // matches SVG water y
    const widthMax = itemState.water.widthMax;
    const fill = k.add([
      k.pos(x + offsetX, top + offsetY),
      k.rect(widthMax, 4),
      k.color(74, 163, 255),
      k.anchor('topleft'),
    ]);
    worldNodes.push(fill);
    itemState.water.fillNode = fill;
  } else if (kind === 'food') {
    const offsetX = 6;  // approximate for kibble band
    const offsetY = 7;
    const widthMax = itemState.food.widthMax;
    const fill = k.add([
      k.pos(x + offsetX, top + offsetY),
      k.rect(widthMax, 3),
      k.color(216, 160, 58),
      k.anchor('topleft'),
    ]);
    worldNodes.push(fill);
    itemState.food.fillNode = fill;
  }

  return [spriteNode];
}

// --- Sprite registration ---
let __spritesLoaded = false;
async function registerPixelSprites(k) {
  if (__spritesLoaded) return;

  const foodSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="24" viewBox="0 0 64 24" shape-rendering="crispEdges">
  <rect width="64" height="24" fill="none"/>
  <!-- bowl base -->
  <rect x="2" y="12" width="60" height="12" fill="#6b3d1f"/>
  <rect x="4" y="9" width="56" height="5" fill="#8a522a"/>
  <!-- kibble -->
  <rect x="8" y="6" width="3" height="3" fill="#d8a03a"/>
  <rect x="13" y="7" width="3" height="3" fill="#c78f2f"/>
  <rect x="20" y="6" width="3" height="3" fill="#e0aa47"/>
  <rect x="27" y="7" width="3" height="3" fill="#d0983b"/>
  <rect x="35" y="6" width="3" height="3" fill="#c78f2f"/>
  <rect x="42" y="7" width="3" height="3" fill="#e0aa47"/>
  <rect x="49" y="6" width="3" height="3" fill="#d0983b"/>
</svg>`;

  const waterSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="24" viewBox="0 0 64 24" shape-rendering="crispEdges">
  <rect width="64" height="24" fill="none"/>
  <!-- bowl base -->
  <rect x="2" y="12" width="60" height="12" fill="#1f3b73"/>
  <rect x="4" y="9" width="56" height="5" fill="#2b59a1"/>
  <!-- water -->
  <rect x="6" y="13" width="52" height="4" fill="#4aa3ff"/>
  <rect x="6" y="13" width="22" height="1" fill="#a8d4ff"/>
</svg>`;

  const bedSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="24" viewBox="0 0 64 24" shape-rendering="crispEdges">
  <rect width="64" height="24" fill="none"/>
  <!-- outer rim (stepped oval) -->
  <rect x="8" y="8" width="48" height="2" fill="#8d475a"/>
  <rect x="5" y="10" width="54" height="2" fill="#8d475a"/>
  <rect x="3" y="12" width="58" height="2" fill="#8d475a"/>
  <rect x="2" y="14" width="60" height="2" fill="#8d475a"/>
  <rect x="3" y="16" width="58" height="2" fill="#8d475a"/>
  <rect x="5" y="18" width="54" height="2" fill="#8d475a"/>
  <!-- inner cushion -->
  <rect x="10" y="12" width="44" height="2" fill="#f0c0d0"/>
  <rect x="8" y="14" width="48" height="2" fill="#f4c9d6"/>
  <rect x="10" y="16" width="44" height="2" fill="#f0c0d0"/>
  <rect x="14" y="18" width="36" height="2" fill="#e8b3c7"/>
  <!-- subtle inner shadow at bottom of rim -->
  <rect x="2" y="20" width="60" height="1" fill="#6f3545"/>
  <!-- base rows to the very bottom so it sits flush on the floor -->
  <rect x="2" y="22" width="60" height="2" fill="#7b3e51"/>
</svg>`;

  function toDataUrl(svg) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  await Promise.all([
    k.loadSprite('food', toDataUrl(foodSVG)),
    k.loadSprite('water', toDataUrl(waterSVG)),
    k.loadSprite('bed', toDataUrl(bedSVG)),
  ]);

  __spritesLoaded = true;
}

async function loadKaboom() {
  // If already loaded
  if (window.__kaboomLoaded) return window.__kaboomLoaded;

  window.__kaboomLoaded = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Pin a stable version
    script.src = 'https://unpkg.com/kaboom@3000.1.17/dist/kaboom.js';
    script.async = true;
    script.onload = () => {
      // global kaboom() is exposed; wrap to allow ESM-like import
      resolve(window.kaboom);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return window.__kaboomLoaded;
}


