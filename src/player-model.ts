// Förstärkt grundform för figuren till 3D-skrivaren. Spelets människor byggs i player-figure.ts.
export type Point = [number, number, number];
export type PlayerPart = {
  shape: 'sphere' | 'box' | 'segment';
  color: number;
  position?: Point;
  size?: Point;
  from?: Point;
  to?: Point;
  radius?: number;
  swing?: boolean;
  detail?: boolean;
};

const skin = 0xc99471;
const shirt = 0x226981;
const shorts = 0x183e51;

export const playerParts: PlayerPart[] = [
  { shape: 'box', position: [0, 1.16, 0], size: [0.46, 0.5, 0.32], color: shirt },
  { shape: 'sphere', position: [-0.22, 1.32, 0], size: [0.13, 0.14, 0.16], color: shirt },
  { shape: 'sphere', position: [0.22, 1.32, 0], size: [0.13, 0.14, 0.16], color: shirt },
  { shape: 'sphere', position: [0, 0.86, 0], size: [0.23, 0.15, 0.17], color: shorts },
  { shape: 'box', position: [-0.12, 0.78, 0], size: [0.23, 0.25, 0.33], color: shorts },
  { shape: 'box', position: [0.12, 0.78, 0], size: [0.23, 0.25, 0.33], color: shorts },
  { shape: 'sphere', position: [0, 1.46, 0], size: [0.09, 0.12, 0.09], color: skin },
  { shape: 'sphere', position: [0, 1.64, -0.015], size: [0.14, 0.18, 0.15], color: skin },
  { shape: 'sphere', position: [0, 1.75, 0.015], size: [0.145, 0.09, 0.15], color: 0x342a25 },
  { shape: 'sphere', position: [-0.14, 1.64, 0], size: [0.025, 0.045, 0.035], color: skin },
  { shape: 'sphere', position: [0.14, 1.64, 0], size: [0.025, 0.045, 0.035], color: skin },
  { shape: 'sphere', position: [0, 1.62, -0.158], size: [0.025, 0.035, 0.035], color: skin },
  { shape: 'sphere', position: [-0.052, 1.67, -0.15], size: [0.016, 0.018, 0.012], color: 0x243c40, detail: true },
  { shape: 'sphere', position: [0.052, 1.67, -0.15], size: [0.016, 0.018, 0.012], color: 0x243c40, detail: true },
  { shape: 'segment', from: [-0.13, 0.79, 0], to: [-0.22, 0.48, -0.09], radius: 0.095, color: skin },
  { shape: 'segment', from: [0.13, 0.79, 0], to: [0.23, 0.48, 0.13], radius: 0.095, color: skin },
  { shape: 'segment', from: [-0.22, 0.49, -0.09], to: [-0.25, 0.14, -0.18], radius: 0.078, color: 0xf5f1df },
  { shape: 'segment', from: [0.23, 0.49, 0.13], to: [0.25, 0.14, 0.19], radius: 0.078, color: 0xf5f1df },
  { shape: 'sphere', position: [-0.25, 0.095, -0.24], size: [0.13, 0.1, 0.22], color: shorts },
  { shape: 'sphere', position: [0.25, 0.095, 0.13], size: [0.13, 0.1, 0.22], color: shorts },
  { shape: 'segment', from: [-0.25, 1.30, -0.02], to: [-0.1, 1.09, -0.32], radius: 0.075, color: skin, swing: true },
  { shape: 'segment', from: [-0.1, 1.09, -0.32], to: [0.31, 1.10, -0.352], radius: 0.065, color: skin, swing: true },
  { shape: 'segment', from: [0.25, 1.3, -0.02], to: [0.45, 1.12, -0.12], radius: 0.075, color: skin, swing: true },
  { shape: 'segment', from: [0.45, 1.12, -0.12], to: [0.45, 0.85, -0.425], radius: 0.065, color: skin, swing: true },
  { shape: 'sphere', position: [0.31, 1.10, -0.352], size: [0.08, 0.08, 0.08], color: skin, swing: true },
  { shape: 'sphere', position: [0.45, 0.85, -0.425], size: [0.08, 0.08, 0.08], color: skin, swing: true },
  { shape: 'segment', from: [0.24, 1.22, -0.32], to: [0.84, 0.1, -0.62], radius: 0.035, color: shorts, swing: true },
  { shape: 'segment', from: [0.84, 0.08, -0.62], to: [1.12, 0.08, -0.68], radius: 0.06, color: 0xf28c49, swing: true },
  { shape: 'segment', from: [1.12, 0.08, -0.68], to: [1.22, 0.08, -0.81], radius: 0.06, color: 0xf28c49, swing: true },
];

export const printBall = { position: [1.08, 0.115, -0.92] as Point, radius: 0.115 };
