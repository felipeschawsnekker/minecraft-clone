* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111827;
  color: white;
  font-family: Arial, Helvetica, sans-serif;
}

body {
  position: relative;
}

canvas {
  display: block;
  width: 100vw;
  height: 100vh;
}

#hotbar {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  padding: 8px;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.hotbar-slot {
  min-width: 92px;
  padding: 10px 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 0.04em;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.12s ease;
}

.hotbar-slot.selected {
  background: rgba(103, 232, 249, 0.18);
  border-color: rgba(103, 232, 249, 0.9);
  box-shadow: 0 0 0 1px rgba(103, 232, 249, 0.6), inset 0 0 12px rgba(103, 232, 249, 0.2);
  transform: translateY(-2px);
}

#crosshair {
  position: fixed;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);
  opacity: 0.85;
  pointer-events: none;
}

#crosshair::before,
#crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
}

#crosshair::before {
  left: 50%;
  top: 2px;
  width: 2px;
  height: 14px;
  transform: translateX(-50%);
}

#crosshair::after {
  top: 50%;
  left: 2px;
  width: 14px;
  height: 2px;
  transform: translateY(-50%);
}

#hud {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 9;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 10px 14px;
  pointer-events: none;
}

#title {
  font-size: 18px;
  font-weight: bold;
}

#subtitle {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.8;
}

@media (max-width: 720px) {
  .hotbar-slot {
    min-width: 72px;
    font-size: 11px;
    padding: 9px 8px;
  }
}

#hotbar, #crosshair {
  user-select: none;
}

*::-webkit-scrollbar {
  display: none;
}








































































































































































































































































































































































































































x {
  display: none;
}
