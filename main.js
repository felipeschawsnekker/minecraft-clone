* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Arial, Helvetica, sans-serif;
  background: #0b1220;
  color: white;
}

body {
  position: relative;
}

canvas {
  display: block;
  width: 100vw;
  height: 100vh;
}

#hud {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 30;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 10px 14px;
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.22);
  line-height: 1.6;
  user-select: none;
}

#hud #info {
  font-size: 12px;
  opacity: 0.8;
}

#hotbar {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 8px;
  z-index: 30;
}

.hotbar-slot {
  min-width: 90px;
  padding: 8px 10px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  user-select: none;
  transition: 0.15s ease;
}

.hotbar-slot.selected {
  background: rgba(96, 165, 250, 0.25);
  border-color: rgba(147, 197, 253, 0.9);
  box-shadow: inset 0 0 12px rgba(147,197,253,0.18);
}

.hotbar-slot .name {
  display: block;
  font-size: 12px;
  font-weight: bold;
}

.hotbar-slot .count {
  display: block;
  font-size: 11px;
  opacity: 0.8;
}

#crosshair {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 35;
}

#crosshair::before,
#crosshair::after {
  content: "";
  position: absolute;
  background: rgba(255,255,255,0.9);
  border-radius: 2px;
}

#crosshair::before {
  left: 50%;
  top: 0;
  width: 2px;
  height: 18px;
  transform: translateX(-50%);
}

#crosshair::after {
  top: 50%;
  left: 0;
  width: 18px;
  height: 2px;
  transform: translateY(-50%);
}

.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.7);
  z-index: 40;
}

.overlay.hidden {
  display: none;
}

#crafting-panel {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.3);
  z-index: 31;
}

#crafting-panel.hidden {
  display: none;
}

.panel {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 16px;
  padding: 28px 26px;
  width: min(90vw, 500px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
}

.panel h1,
.panel h2 {
  margin-top: 0;
}

.panel ul {
  text-align: left;
  line-height: 1.8;
  padding-left: 18px;
  opacity: 0.9;
}

.panel .small {
  text-align: center;
}

.crafting-window {
  text-align: center;
}

.recipe-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
}

button {
  border: none;
  border-radius: 10px;
  padding: 11px 16px;
  background: #3b82f6;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: 0.15s ease;
}

button:hover {
  background: #2563eb;
}

@media (max-width: 720px) {
  .hotbar-slot {
    min-width: 72px;
    padding: 7px 8px;
  }

  .recipe-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
