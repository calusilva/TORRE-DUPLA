/** Sinais sonoros de confirmação (chão de fábrica é ruidoso — confirmar também por vibração). */
let ctx: AudioContext | null = null;

function tom(freq: number, inicio: number, duracao: number) {
  ctx ??= new AudioContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.06, ctx.currentTime + inicio);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + duracao);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + inicio);
  o.stop(ctx.currentTime + inicio + duracao);
}

export function somSucesso() {
  try {
    tom(1320, 0, 0.09);
    navigator.vibrate?.(60);
  } catch {
    /* áudio indisponível */
  }
}

export function somErro() {
  try {
    tom(220, 0, 0.14);
    tom(180, 0.17, 0.2);
    navigator.vibrate?.([80, 60, 80]);
  } catch {
    /* áudio indisponível */
  }
}
