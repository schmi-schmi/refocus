// Minimal UI: toggle laser pointer; indicator for cat mood later

export function initUI() {
  let ui = document.querySelector('.pet-ui');
  if (!ui) {
    ui = document.createElement('div');
    ui.className = 'pet-ui';
    ui.innerHTML = `
      <button type="button" data-action="laser">Laser: Off</button>
      <span class="indicator" style="display:none"></span>
    `;
    document.body.appendChild(ui);
  }

  const laserBtn = ui.querySelector('button[data-action="laser"]');
  const indicator = ui.querySelector('.indicator');

  let laserActive = false;

  function setLaserActive(val) {
    laserActive = Boolean(val);
    laserBtn.textContent = `Laser: ${laserActive ? 'On' : 'Off'}`;
    dispatch();
  }

  function isLaserActive() {
    return laserActive;
  }

  laserBtn.addEventListener('click', () => setLaserActive(!laserActive));

  // Simple pub/sub for laser state
  const listeners = new Set();
  function onLaserState(fn) {
    listeners.add(fn);
  }
  function dispatch() {
    listeners.forEach((fn) => fn(laserActive));
  }

  return { setLaserActive, isLaserActive, onLaserState, indicator };
}


