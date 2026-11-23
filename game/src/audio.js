// All sound is synthesized with WebAudio — no audio files, no network.
// Engine hum, sirens, gunshots, crashes, pickups and a small bass groove.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol, lowpass) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  const audio = {
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },
    setMuted(m) {
      muted = m;
      if (muted) {
        audio.stopEngine();
        audio.stopSiren();
        audio.stopMusic();
      }
    },
    isMuted() {
      return muted;
    },
    shoot() {
      noise(0.12, 0.25, 2400);
      tone(180, 0.08, 'square', 0.08, 60);
    },
    crash() {
      noise(0.25, 0.3, 700);
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.14);
      setTimeout(() => tone(990, 0.12, 'sine', 0.14), 70);
    },
    cash() {
      tone(880, 0.07, 'triangle', 0.12);
      setTimeout(() => tone(1174, 0.1, 'triangle', 0.12), 60);
      setTimeout(() => tone(1568, 0.14, 'triangle', 0.12), 120);
    },
    mission() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.14), i * 90));
    },
    fail() {
      [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sawtooth', 0.08), i * 130));
    },
    click() {
      tone(1200, 0.04, 'square', 0.06);
    },
    startEngine(speedNorm) {
      if (!ctx || muted) return;
      audio.stopEngine();
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55 + speedNorm * 90;
      engineGain.gain.value = 0.035 + speedNorm * 0.03;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    },
    setEngine(speedNorm) {
      if (!engineOsc || !ctx) return;
      engineOsc.frequency.setTargetAtTime(55 + speedNorm * 95, ctx.currentTime, 0.08);
      if (engineGain) engineGain.gain.setTargetAtTime(0.03 + speedNorm * 0.035, ctx.currentTime, 0.1);
    },
    stopEngine() {
      if (engineOsc) {
        try { engineOsc.stop(); } catch { /* already stopped */ }
        engineOsc = null;
        engineGain = null;
      }
    },
    startSiren() {
      if (!ctx || muted || sirenOsc) return;
      sirenOsc = ctx.createOscillator();
      sirenGain = ctx.createGain();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 750;
      sirenGain.gain.value = 0.028;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.9;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
      lfo.start();
      sirenOsc._lfo = lfo;
    },
    stopSiren() {
      if (sirenOsc) {
        try { sirenOsc.stop(); sirenOsc._lfo.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
        sirenGain = null;
      }
    },
    startMusic() {
      if (!ctx || muted || musicTimer) return;
      // A lazy bass groove: A minor walk, one note per beat.
      const notes = [110, 110, 130.8, 98, 110, 110, 146.8, 164.8];
      musicTimer = setInterval(() => {
        if (muted || !ctx) return;
        const f = notes[musicStep % notes.length];
        musicStep += 1;
        tone(f, 0.42, 'triangle', 0.05);
        if (musicStep % 4 === 0) tone(f * 2, 0.2, 'sine', 0.03);
      }, 300);
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
  return audio;
}
