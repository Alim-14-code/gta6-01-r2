// Keyboard and mouse state. One object, read by the world step; the game loop
// never touches DOM events directly.
export function createInput() {
  const keys = new Set();
  const input = {
    keys,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicked: false,
    pressed: new Set(),
    attach(canvas) {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
        if (!keys.has(e.code)) input.pressed.add(e.code);
        keys.add(e.code);
      });
      window.addEventListener('keyup', (e) => keys.delete(e.code));
      window.addEventListener('blur', () => keys.clear());
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        input.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        input.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
      });
      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          input.mouseDown = true;
          input.clicked = true;
        }
      });
      window.addEventListener('mouseup', () => { input.mouseDown = false; });
    },
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return { x, y };
    },
    down(code) {
      return keys.has(code);
    },
    wasPressed(code) {
      return input.pressed.has(code);
    },
    endFrame() {
      input.pressed.clear();
      input.clicked = false;
    },
  };
  return input;
}
