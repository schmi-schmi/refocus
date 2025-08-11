// Cat entity and behaviors reminiscent of oneko

export function spawnCat(k, deps) {
  const getFloorBase = () => window.innerHeight - 2; // world floor top
  const getCatFloorY = () => getFloorBase() - 1;     // keep cat 1px above floor to ensure visible
  const CAT_WIDTH = 24;
  const CAT_HEIGHT = 18;
  const STORAGE_KEY = 'refocus_pet_stats_v1';

  // Single black rectangle as the cat
  const cat = k.add([
    k.pos(220, getCatFloorY()),
    k.rect(CAT_WIDTH, CAT_HEIGHT, { radius: 4 }),
    k.color(20, 20, 20),
    k.opacity(0.95),
    k.area(),
    k.anchor('botleft'),
    {
      vx: 0,
      vy: 0,
      state: 'idle',
      facing: 1,
      laserChase: false,
      stats: { energy: 90, food: 80, water: 80, happiness: 70 },
      desire: null,
      lockedDesire: null,
      lockedTargetValue: null,
      hover: false,
    },
  ]);

  // --- Persistence helpers (scoped to this cat instance) ---
  function clampStat(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
  }

  function loadStatsFromStorage() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        energy: clampStat(data.energy ?? 90),
        food: clampStat(data.food ?? 80),
        water: clampStat(data.water ?? 80),
        happiness: clampStat(data.happiness ?? 70),
      };
    } catch (_) {
      return null;
    }
  }

  function saveStatsToStorage() {
    try {
      const payload = {
        energy: clampStat(cat.stats.energy),
        food: clampStat(cat.stats.food),
        water: clampStat(cat.stats.water),
        happiness: clampStat(cat.stats.happiness),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
      // ignore storage errors (e.g., disabled in private mode)
    }
  }

  // Initialize stats from storage if available
  const savedStats = loadStatsFromStorage();
  if (savedStats) {
    cat.stats = { ...cat.stats, ...savedStats };
  }

  // Physics parameters
  let velocityX = 0;
  let velocityY = 0;
  const EPS = 0.001;

  // Idle roam between items; basic finite state
  let idleTimer = 0;
  let targetX = null;
  // Sleep hysteresis timers to prevent flicker
  let sleepTimer = 0;
  let wakeTimer = 0;
  
  // Need selection thresholds and helpers
  const START_NEED_THRESHOLD = 60; // begin pursuing when the lowest stat dips below this
  const SATISFY_THRESHOLDS = { water: 80, food: 80, energy: 95 }; // stop when at/above these
  const CRITICAL_THRESHOLDS = { water: 10, food: 10, energy: 10 }; // emergency override

  function chooseDominantNeed() {
    // Choose the lowest among energy (sleep), water (drink), food (eat)
    const options = [
      { need: 'bed', value: cat.stats.energy },
      { need: 'water', value: cat.stats.water },
      { need: 'food', value: cat.stats.food },
    ];
    options.sort((a, b) => a.value - b.value);
    const top = options[0];
    return top.value < START_NEED_THRESHOLD ? top.need : null;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function computeTargetForNeed(need) {
    // Randomize satisfy targets per engagement to avoid identical behavior every time
    switch (need) {
      case 'water':
        return Math.round(randomBetween(72, 92));
      case 'food':
        return Math.round(randomBetween(72, 92));
      case 'bed':
        return Math.round(randomBetween(92, 99));
      default:
        return 85;
    }
  }

  function getReleaseThreshold(need) {
    // Prefer locked target if present, otherwise fall back to static thresholds
    if (typeof cat.lockedTargetValue === 'number') return cat.lockedTargetValue;
    if (need === 'bed') return SATISFY_THRESHOLDS.energy;
    return SATISFY_THRESHOLDS[need] ?? 85;
  }


  // Unified movement helper to steer, integrate velocity, clamp, and move the cat
  function performMovementTowards({
    dt,
    desiredX,
    desiredY,
    maxSpeedX,
    accelX,
    maxSpeedY,
    accelY,
    drag,
    deadZone = 8,
    pinToFloor = true,
  }) {
    const dx = desiredX - cat.pos.x;
    const dy = desiredY - cat.pos.y;

    let steerX = 0;
    if (Math.abs(dx) > deadZone) {
      steerX = Math.sign(dx) * accelX;
    }
    let steerY = 0;
    if (Math.abs(dy) > deadZone) {
      steerY = Math.sign(dy) * accelY;
    }

    // Integrate acceleration and drag
    velocityX += steerX * dt;
    velocityY += steerY * dt;
    velocityX -= velocityX * drag * dt;
    velocityY -= velocityY * drag * dt;

    // Clamp max speeds
    if (velocityX > maxSpeedX) velocityX = maxSpeedX;
    if (velocityX < -maxSpeedX) velocityX = -maxSpeedX;
    if (velocityY > maxSpeedY) velocityY = maxSpeedY;
    if (velocityY < -maxSpeedY) velocityY = -maxSpeedY;

    // Apply movement
    cat.move(velocityX, velocityY);
    cat.facing = Math.sign(velocityX) || cat.facing;

    // Vertical handling
    const floorY = getCatFloorY();
    if (pinToFloor) {
      cat.pos.y = floorY;
    } else {
      cat.pos.y = Math.min(floorY, Math.max(CAT_HEIGHT, cat.pos.y));
    }

    // Horizontal viewport clamp
    cat.pos.x = Math.max(2, Math.min(window.innerWidth - CAT_WIDTH - 2, cat.pos.x));

    return { dx, dy, deadZone };
  }

  function chooseIdleTarget() {
    const choices = [
      40 + Math.random() * 80, // food vicinity
      40 + 140 + Math.random() * 80, // water vicinity
      40 + 280 + Math.random() * 80, // bed vicinity
      Math.random() * (window.innerWidth - 120), // random
    ];
    targetX = choices[Math.floor(Math.random() * choices.length)];
  }

  chooseIdleTarget();

  // Laser pointer chasing
  let mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse = { x: e.clientX, y: e.clientY };
  }, { passive: true });

  function setChasingLaser(active) {
    cat.laserChase = Boolean(active);
  }

  // Tooltip element (DOM)
  let tooltip = null;
  function ensureTooltip() {
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'cat-tooltip';
      tooltip.style.display = 'none';
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  // Mouse hover detection over cat rect
  window.addEventListener('mousemove', (e) => {
    const rect = { x: cat.pos.x, y: cat.pos.y - CAT_HEIGHT, w: CAT_WIDTH, h: CAT_HEIGHT };
    const inside = e.clientX >= rect.x && e.clientX <= rect.x + rect.w && e.clientY >= rect.y && e.clientY <= rect.y + rect.h;
    cat.hover = inside;
  }, { passive: true });

  // Accumulator for periodic autosave
  let saveAccumulator = 0;

  // Main update
  k.onUpdate(() => {
    const dt = k.dt();
    const laserActive = cat.laserChase && deps.isLaserActive();

    // Throttled autosave of stats
    saveAccumulator += dt;
    if (saveAccumulator >= 1.0) { // every ~1s
      saveAccumulator = 0;
      saveStatsToStorage();
    }

    // Tunable parameters
    const maxSpeedX = laserActive ? 340 : 120; // px/s
    const accelX = laserActive ? 2000 : 600;   // px/s^2
    const maxSpeedY = laserActive ? 260 : 90;  // px/s
    const accelY = laserActive ? 1600 : 500;   // px/s^2
    const drag = laserActive ? 2.0 : 6.0;      // per-second damping

    // --- STAT DYNAMICS ---
    const drainBase = 1.0;
    const laserFactor = laserActive ? 3.0 : 1.0;
    cat.stats.energy = clamp01(cat.stats.energy - (0.8 * drainBase * laserFactor * dt));
    cat.stats.food   = clamp01(cat.stats.food   - (0.5 * drainBase * laserFactor * dt));
    cat.stats.water  = clamp01(cat.stats.water  - (0.6 * drainBase * laserFactor * dt));
    cat.stats.happiness = clamp01(cat.stats.happiness + (laserActive ? 0.8 * dt : -0.05 * dt));

    // Decide desires based on relative needs with locking to avoid flopping
    if (!laserActive) {
      const prevLocked = cat.lockedDesire;
      let nextLock = prevLocked;

      // Emergency override if something is critically low
      const criticals = [
        { need: 'water', value: cat.stats.water, th: CRITICAL_THRESHOLDS.water },
        { need: 'food', value: cat.stats.food, th: CRITICAL_THRESHOLDS.food },
        { need: 'bed', value: cat.stats.energy, th: CRITICAL_THRESHOLDS.energy },
      ];
      const critical = criticals.find(c => c.value < c.th);
      if (critical) {
        nextLock = critical.need;
      } else if (!nextLock) {
        nextLock = chooseDominantNeed();
      }

      // If taking a new lock, compute a fresh randomized target for this engagement
      if (nextLock && nextLock !== prevLocked) {
        cat.lockedTargetValue = computeTargetForNeed(nextLock);
      }

      cat.lockedDesire = nextLock || null;
      cat.desire = cat.lockedDesire || null;
    } else {
      // Ignore desires while chasing laser; keep the current lock to resume later
      cat.desire = null;
    }

    // Desired target
    let desiredX = laserActive ? mouse.x : (targetX ?? cat.pos.x);
    let desiredY = laserActive ? mouse.y : getCatFloorY();

    console.log(`Cat state: ${cat.state}, desire: ${cat.desire}, locked: ${cat.lockedDesire}, target: ${desiredX}`);

    // Navigate to items if there's a desire
    if (!laserActive && cat.desire && typeof deps.getItemTargets === 'function') {
      const targets = deps.getItemTargets();
      const t = targets[cat.desire];
      // console.log("water pos: " + JSON.stringify(t) + " " + t.x + "cat pos: " + cat.pos.x);
      if (t) {
        desiredX = t.x;
        desiredY = getCatFloorY();
        // If close enough, perform the activity
        if (Math.abs(cat.pos.x - desiredX) < 12) { // ca thas reached its target so it can perform the activity
          if (cat.desire === 'water') {
            cat.state = 'drinking';
          } else if (cat.desire === 'food') {
            cat.state = 'eating';
          } else if (cat.desire === 'bed') {
            cat.state = 'sleeping';
          }
          // small happiness bump when needs met
          cat.stats.happiness = clamp01(cat.stats.happiness + 4 * dt);
        }
      }
    }
    // Update state and apply sleeping recovery only when truly sleeping
    if (cat.state === 'sleeping' && cat.desire === 'bed' && cat.lockedDesire === 'bed') {
      // Snap to bed center and freeze motion to prevent jitter
      const t = typeof deps.getItemTargets === 'function' ? deps.getItemTargets() : null;
      const bedX = t && t.bed ? t.bed.x : undefined;
      if (typeof bedX === 'number') {
        cat.pos.x = bedX;
        targetX = bedX; // keep desire centered on bed
      }
      cat.pos.y = getCatFloorY();
      velocityX = 0;
      velocityY = 0;
      cat.stats.energy = clamp01(cat.stats.energy + 5 * dt);
      cat.stats.happiness = clamp01(cat.stats.happiness + 0.2 * dt);
      // Release lock once sufficiently rested
      if (cat.stats.energy >= getReleaseThreshold('bed')) {
        cat.lockedDesire = null;
        cat.lockedTargetValue = null;
        cat.desire = null;
        cat.state = 'idle';
        chooseIdleTarget();
      }
    } else if (cat.state === 'drinking' && cat.desire === 'water' && cat.lockedDesire === 'water') {  
      cat.stats.water = clamp01(cat.stats.water + 20 * dt);
      deps.consume && deps.consume('water', 10 * dt);
      velocityX = 0;
      velocityY = 0;
      // Release lock once sufficiently hydrated
      if (cat.stats.water >= getReleaseThreshold('water')) {
        cat.lockedDesire = null;
        cat.lockedTargetValue = null;
        cat.desire = null;
        cat.state = 'idle';
        chooseIdleTarget();
      }
    } else if (cat.state === 'eating' && cat.desire === 'food' && cat.lockedDesire === 'food') {
      cat.stats.food = clamp01(cat.stats.food + 12 * dt);
      deps.consume && deps.consume('food', 8 * dt);
      velocityX = 0;
      velocityY = 0;
      // Release lock once sufficiently full
      if (cat.stats.food >= getReleaseThreshold('food')) {
        cat.lockedDesire = null;
        cat.lockedTargetValue = null;
        cat.desire = null;
        cat.state = 'idle';
        chooseIdleTarget();
      }
    } else {
      // Only perform movement if not sleeping
      const { dx, deadZone: dead } = performMovementTowards({
        dt,
        desiredX,
        desiredY,
        maxSpeedX,
        accelX,
        maxSpeedY,
        accelY,
        drag,
        deadZone: 8,
        pinToFloor: !laserActive,
      });

      // Idle target handling when not chasing
      if (!laserActive) {
        if (Math.abs(dx) <= dead) {
          idleTimer -= dt;
          if (idleTimer <= 0) {
            idleTimer = 2 + Math.random() * 3;
            chooseIdleTarget();
          }
        }
      }
    }

    // Tooltip update
    const tip = ensureTooltip();
    if (cat.hover) {
      tip.style.display = 'block';
      tip.style.left = `${cat.pos.x + CAT_WIDTH / 2}px`;
      tip.style.top = `${cat.pos.y - CAT_HEIGHT}px`;
      tip.innerHTML = `
        Energy: ${pct(cat.stats.energy)} | Food: ${pct(cat.stats.food)} | Water: ${pct(cat.stats.water)} | Happiness: ${pct(cat.stats.happiness)}
      `;
    } else {
      tip.style.display = 'none';
    }
  });

  // Ensure we persist the latest stats when the tab is hidden or unloading
  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') saveStatsToStorage();
  };
  const handleBeforeUnload = () => {
    saveStatsToStorage();
  };
  document.addEventListener('visibilitychange', handleVisibility, { passive: true });
  window.addEventListener('beforeunload', handleBeforeUnload, { passive: true });

  // Draw a subtle laser dot if active
  k.onDraw(() => {
    if (cat.laserChase && deps.isLaserActive()) {
      k.drawCircle({ pos: k.vec2(mouse.x, mouse.y), radius: 3, color: k.rgb(255, 60, 60) });
    }
    // Sleeping indicator
    if (cat.state === 'sleeping') {
      const textPos = k.vec2(
        cat.pos.x + (CAT_WIDTH / 2) - 8,
        cat.pos.y - CAT_HEIGHT - 8
      );
      try {
        k.drawText({
          text: 'Zzz',
          pos: textPos,
          size: 12,
          color: k.rgb(210, 210, 255),
        });
      } catch (_) {
        // Fallback: tiny floating rectangles if text draw isn't available
        const zColor = k.rgb(210, 210, 255);
        k.drawRect({ pos: textPos, width: 2, height: 2, color: zColor });
        k.drawRect({ pos: k.vec2(textPos.x + 6, textPos.y - 4), width: 3, height: 3, color: zColor });
        k.drawRect({ pos: k.vec2(textPos.x + 13, textPos.y - 8), width: 4, height: 4, color: zColor });
      }
    }
  });

  return {
    setChasingLaser,
  };
}

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function pct(v) {
  return `${Math.round(clamp01(v))}%`;
}


