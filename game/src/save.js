// Save and continue: cash, job progress and settings in localStorage.
// Nothing here leaves the player's own browser.
const KEY = 'verdebaysave-v1';

export function saveGame(world) {
  try {
    const data = {
      cash: world.player.cash,
      missionIndex: Math.max(0, world.missions.index),
      missionsDone: world.stats.missionsDone,
      muted: world.muted,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
