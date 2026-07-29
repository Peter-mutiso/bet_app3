let enabled = true;

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return enabled;

  const stored = localStorage.getItem("trade-sound-enabled");
  return stored === null ? true : stored === "true";
}

export function setSoundEnabled(value: boolean) {
  enabled = value;

  if (typeof window !== "undefined") {
    localStorage.setItem("trade-sound-enabled", String(value));
  }
}

function play(frequency: number, duration = 120) {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled()) return;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) return;

  const ctx = new AudioContextClass();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.value = 0.05;

  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    ctx.close();
  }, duration);
}

export function playOrderSound(
  type: "open" | "win" | "loss" = "open"
) {
  switch (type) {
    case "open":
      play(880, 120);
      break;

    case "win":
      play(1200, 180);
      break;

    case "loss":
      play(350, 250);
      break;
  }
}

export function playWinSound() {
  playOrderSound("win");
}

export function playLoseSound() {
  playOrderSound("loss");
}