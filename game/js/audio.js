// Meridian Air Rally — all sound is synthesized with WebAudio. No audio files.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.windGain = null;
    this.windFilter = null;
    this.started = false;
  }

  // Must be called from a user gesture at least once.
  start() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.started = true;
      // Engine: two detuned saws through a lowpass, pitch follows throttle.
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = "sawtooth";
      this.engineOsc1.frequency.value = 52;
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = "sawtooth";
      this.engineOsc2.frequency.value = 78;
      this.engineOsc1.connect(lp);
      this.engineOsc2.connect(lp);
      lp.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc1.start();
      this.engineOsc2.start();
      // Wind: looped noise through a bandpass, gain follows airspeed.
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = "bandpass";
      this.windFilter.frequency.value = 900;
      this.windFilter.Q.value = 0.6;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.0;
      noise.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.ctx.destination);
      noise.start();
    } catch (err) {
      this.started = false;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) {
      this.ctx.destination.gain = 0;
    }
  }

  // Called every frame with the plane's throttle (0..1) and speed (knots).
  update(throttle, speedKts, running) {
    if (!this.started || !this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const eng = running ? 0.045 + throttle * 0.075 : 0.0;
    this.engineGain.gain.setTargetAtTime(eng, t, 0.1);
    this.engineOsc1.frequency.setTargetAtTime(46 + throttle * 66, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(69 + throttle * 99, t, 0.1);
    const wind = running ? Math.max(0, (speedKts - 55) / 220) * 0.11 : 0.0;
    this.windGain.gain.setTargetAtTime(wind, t, 0.15);
    this.windFilter.frequency.setTargetAtTime(500 + speedKts * 6, t, 0.2);
  }

  _blip(freq, dur, type, vol, when) {
    if (!this.started || !this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (when || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  chime() {
    this._blip(880, 0.22, "sine", 0.2, 0);
    this._blip(1318, 0.3, "sine", 0.16, 0.07);
  }

  thud() {
    if (!this.started || !this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, t0);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.22);
    g.gain.setValueAtTime(0.4, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.3);
  }

  beep() {
    this._blip(1046, 0.12, "square", 0.07, 0);
  }

  warning() {
    this._blip(660, 0.1, "square", 0.09, 0);
    this._blip(660, 0.1, "square", 0.09, 0.16);
  }
}
