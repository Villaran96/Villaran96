// Genera public/synth_beat.wav: 18 s de electrónica a 128 BPM (44100 Hz, 16 bits, mono).
// Uso: node generate-audio.js
const fs = require("fs");
const path = require("path");

const SR = 44100;
const DURATION = 18;
const BPM = 128;
const BEAT = 60 / BPM; // negra
const STEP = BEAT / 2; // corchea (= stepDuration del vídeo)
const BASS_NOTES = [110, 130.81, 146.83, 164.81, 196.0, 220, 261.63, 293.66];

const total = Math.round(SR * DURATION);
const mix = new Float32Array(total);

// Ruido determinista: el WAV sale idéntico en cada ejecución.
let seed = 0x9e3779b9;
const noise = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return (((r ^ (r >>> 14)) >>> 0) / 4294967296) * 2 - 1;
};

// Bombo: seno con caída exponencial de 135 Hz a 32 Hz en cada negra.
const KICK_LEN = 0.42;
for (let n = 0; n * BEAT < DURATION; n++) {
  const start = Math.round(n * BEAT * SR);
  let phase = 0;
  for (let i = 0; start + i < total && i < KICK_LEN * SR; i++) {
    const tau = i / SR;
    const freq = 32 + (135 - 32) * Math.exp(-tau * 28);
    phase += (2 * Math.PI * freq) / SR;
    const attack = Math.min(1, tau / 0.001);
    const amp = attack * Math.exp(-tau * 7);
    mix[start + i] += Math.tanh(1.6 * Math.sin(phase)) * amp * 0.9;
  }
}

// Hi-hat: ruido blanco con doble paso alto (~7 kHz) en cada corchea; el contratiempo suena más abierto.
const HAT_LEN = 0.12;
const rc = 1 / (2 * Math.PI * 7000);
const alpha = rc / (rc + 1 / SR);
for (let n = 0; n * STEP < DURATION; n++) {
  const start = Math.round(n * STEP * SR);
  const offbeat = n % 2 === 1;
  const decay = offbeat ? 18 : 45;
  const gain = offbeat ? 0.3 : 0.2;
  let x1 = 0, y1 = 0, y1b = 0, y2 = 0;
  for (let i = 0; start + i < total && i < HAT_LEN * SR; i++) {
    const tau = i / SR;
    const x = noise();
    y1 = alpha * (y1 + x - x1);
    x1 = x;
    y2 = alpha * (y2 + y1 - y1b);
    y1b = y1;
    mix[start + i] += y2 * Math.exp(-tau * decay) * gain;
  }
}

// Bajo triangular: una nota por corchea recorriendo la escala, con ducking del bombo.
const tri = (p) => 4 * Math.abs(p - Math.floor(p + 0.5)) - 1;
for (let n = 0; n * STEP < DURATION; n++) {
  const start = Math.round(n * STEP * SR);
  const freq = BASS_NOTES[n % BASS_NOTES.length];
  const gate = STEP * 0.9;
  for (let i = 0; start + i < total && i < STEP * SR; i++) {
    const tau = i / SR;
    const attack = Math.min(1, tau / 0.004);
    const release = tau > gate ? Math.max(0, 1 - (tau - gate) / 0.01) : 1;
    const sinceKick = ((start + i) / SR) % BEAT;
    const duck = 1 - 0.55 * Math.exp(-sinceKick * 10);
    mix[start + i] += tri(freq * tau) * attack * release * Math.exp(-tau * 9) * duck * 0.32;
  }
}

// Master: saturación suave, fundido final de 250 ms y normalización a -1 dBFS.
const fadeStart = total - Math.round(0.25 * SR);
let peak = 0;
for (let i = 0; i < total; i++) {
  let v = Math.tanh(mix[i] * 1.1);
  if (i > fadeStart) v *= (total - i) / (total - fadeStart);
  mix[i] = v;
  peak = Math.max(peak, Math.abs(v));
}
const norm = 0.891 / peak;

const header = Buffer.alloc(44);
const dataSize = total * 2;
header.write("RIFF", 0);
header.writeUInt32LE(36 + dataSize, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(dataSize, 40);

const pcm = Buffer.alloc(dataSize);
for (let i = 0; i < total; i++) {
  const s = Math.max(-1, Math.min(1, mix[i] * norm));
  pcm.writeInt16LE(Math.round(s * 32767), i * 2);
}

const out = path.join(__dirname, "public", "synth_beat.wav");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log(`OK ${out} · ${DURATION}s · ${SR} Hz · ${BPM} BPM · ${(dataSize / 1048576).toFixed(2)} MB`);
