// All audio is synthesized with WebAudio — no asset files. Soft winter
// ambience (filtered wind), sparse pentatonic chimes, and juicy SFX.
export function createAudio(ctx) {
  const { events, state } = ctx;
  let ac = null;
  let master = null;
  let delaySend = null;
  let musicTimer = null;

  function unlock() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    master = ac.createGain();
    master.gain.value = state.settings.muted ? 0 : 0.55;
    master.connect(ac.destination);

    // gentle echo for chimes
    delaySend = ac.createGain();
    const delay = ac.createDelay(1);
    delay.delayTime.value = 0.34;
    const fb = ac.createGain();
    fb.gain.value = 0.35;
    const wet = ac.createGain();
    wet.gain.value = 0.4;
    delaySend.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(master);

    startWind();
    scheduleMusic();
  }

  function setMuted(muted) {
    state.settings.muted = muted;
    if (master) master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, ac.currentTime + 0.15);
  }

  function tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.2, slide = 0, attack = 0.005, echo = 0 }) {
    if (!ac || state.settings.muted) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    if (echo > 0) {
      const send = ac.createGain();
      send.gain.value = echo;
      gain.connect(send);
      send.connect(delaySend);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst({ dur = 0.12, freq = 1200, q = 1, vol = 0.25, slide = 0 }) {
    if (!ac || state.settings.muted) return;
    const t0 = ac.currentTime;
    const len = Math.ceil(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    if (slide) filter.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    filter.Q.value = q;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  function startWind() {
    const len = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; // brown-ish noise
      data[i] = last * 6;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const gain = ac.createGain();
    gain.gain.value = 0.16;
    // slow swells
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 0.07;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    lfo.start();
  }

  // Sparse, calm pentatonic chimes — winter music-box feel.
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  function scheduleMusic() {
    const play = () => {
      if (!state.settings.muted && Math.random() < 0.8) {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const freq = SCALE[Math.floor(Math.random() * SCALE.length)] / 2;
          setTimeout(() => tone({ freq, dur: 1.6, type: 'sine', vol: 0.06, echo: 0.8 }), i * 420);
        }
      }
      musicTimer = setTimeout(play, 4000 + Math.random() * 5000);
    };
    musicTimer = setTimeout(play, 1500);
  }

  const sfx = {
    chop: () => noiseBurst({ dur: 0.1, freq: 900, q: 2, vol: 0.3, slide: -500 }),
    mine: () => { noiseBurst({ dur: 0.08, freq: 2400, q: 3, vol: 0.22 }); tone({ freq: 220, dur: 0.08, type: 'triangle', vol: 0.12 }); },
    pick: () => tone({ freq: 660, dur: 0.09, type: 'triangle', vol: 0.14, slide: 220 }),
    splash: () => noiseBurst({ dur: 0.2, freq: 700, q: 1.5, vol: 0.2, slide: -300 }),
    animal: () => tone({ freq: 330, dur: 0.12, type: 'square', vol: 0.06, slide: 90 }),
    crystal: () => tone({ freq: 1320, dur: 0.3, type: 'sine', vol: 0.12, echo: 0.6, slide: 200 }),
    pop: () => tone({ freq: 520, dur: 0.14, type: 'triangle', vol: 0.2, slide: 320 }),
    coin: () => { tone({ freq: 988, dur: 0.08, type: 'square', vol: 0.07 }); setTimeout(() => tone({ freq: 1319, dur: 0.14, type: 'square', vol: 0.07 }), 60); },
    sell: () => [988, 1175, 1568].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.14 }), i * 70)),
    upgrade: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.15, echo: 0.4 }), i * 90)),
    thaw: () => { noiseBurst({ dur: 0.5, freq: 500, q: 0.8, vol: 0.16, slide: 900 }); tone({ freq: 784, dur: 0.5, type: 'sine', vol: 0.08, echo: 0.7, slide: 260 }); },
    levelup: () => [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.16, echo: 0.6 }), i * 80)),
    quest: () => [784, 988, 1175].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.2, type: 'sine', vol: 0.14, echo: 0.5 }), i * 100)),
    click: () => tone({ freq: 800, dur: 0.05, type: 'sine', vol: 0.1 }),
    error: () => tone({ freq: 220, dur: 0.18, type: 'sawtooth', vol: 0.08, slide: -60 }),
    step: () => noiseBurst({ dur: 0.05, freq: 300, q: 0.8, vol: 0.045 }),
  };

  function play(name) {
    if (!ac) return;
    sfx[name]?.();
  }

  // Worker actions stay quiet — the soundscape follows the player's hands.
  events.on('node.hit', ({ def, worker }) => { if (!worker) play(def.sound ?? 'chop'); });
  events.on('node.depleted', ({ worker }) => { if (!worker) play('pop'); });
  events.on('items.sold', ({ worker }) => { if (!worker) play('sell'); });
  events.on('tile.unlocked', () => play('thaw'));
  events.on('upgrade.purchased', ({ id }) => play(id === 'furnace' ? 'thaw' : 'upgrade'));
  events.on('level.up', () => play('levelup'));
  events.on('research.completed', () => play('upgrade'));
  events.on('quest.completed', () => play('quest'));
  events.on('craft.started', ({ worker }) => { if (!worker) play('click'); });
  events.on('item.crafted', () => play('pick'));
  events.on('inventory.full', () => play('error'));
  events.on('player.step', () => play('step'));

  return { unlock, play, setMuted, get muted() { return state.settings.muted; } };
}
