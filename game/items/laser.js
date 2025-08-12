// Laser item module: owns mouse tracking and laser rendering

export function initLaser(k, { isLaserActive } = {}) {
  let mousePosition = { x: 0, y: 0 };

  // Track mouse for laser target
  const handleMouseMove = (e) => {
    mousePosition = { x: e.clientX, y: e.clientY };
  };
  window.addEventListener('mousemove', handleMouseMove, { passive: true });

  // Draw the laser dot when active
  k.onDraw(() => {
    if (typeof isLaserActive === 'function' && isLaserActive()) {
      k.drawCircle({
        pos: k.vec2(mousePosition.x, mousePosition.y),
        radius: 3,
        color: k.rgb(255, 60, 60),
      });
    }
  });

  function getLaserTarget() {
    if (typeof isLaserActive === 'function' && isLaserActive()) {
      return { x: mousePosition.x, y: mousePosition.y };
    }
    return null;
  }

  return {
    getLaserTarget,
  };
}


