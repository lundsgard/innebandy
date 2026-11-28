export const CHEERS = {
  heja: 'Heja Nykvarn! Heja Nykvarn!',
  komigen: 'Kom igen Nykvarn! Kämpa Nykvarn!',
  lundsgard: 'Snyggt Lundsgård! Heja Nykvarn!',
  mal: 'Jaaa! Mål för Nykvarn! Heja Nykvarn!',
} as const;
type Cheer = keyof typeof CHEERS;

// Färdiga svenska ljudfiler fungerar även utan en svensk talsyntesröst i webbläsaren.
export class CrowdAudio {
  enabled = true;
  private nextCheer = 9;
  private turn = 0;
  private score = 0;
  private request = 0;
  constructor(private audio: HTMLAudioElement, private caption: (text: string) => void, private base = './') {
    audio.preload = 'auto'; audio.volume = 0.72;
  }
  get cheering() { return this.enabled && !this.audio.paused && !this.audio.ended; }
  stop() { this.request++; this.audio.pause(); this.audio.currentTime = 0; }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) { this.stop(); this.caption('Publikljudet är av.'); }
    else this.cheer('heja');
  }
  start() {
    this.stop(); this.score = 0; this.turn = 0; this.nextCheer = 9;
    if (this.enabled) this.cheer('heja');
  }
  cheer(kind: Cheer = 'heja') {
    if (!this.enabled) return;
    this.stop();
    const request = this.request;
    this.audio.src = `${this.base}audio/${kind}.wav`;
    this.caption(CHEERS[kind]);
    void this.audio.play().catch(() => {
      if (request === this.request && this.enabled) this.caption('Tryck på Heja Nykvarn! för att starta ljudet.');
    });
    this.nextCheer = 9;
  }
  update(dt: number, running: boolean, homeGoals: number, lundsgardHasBall: boolean, visible: boolean) {
    if (!visible || !running) {
      if (!this.audio.paused) this.stop();
      return;
    }
    if (homeGoals > this.score) { this.score = homeGoals; this.cheer('mal'); return; }
    this.score = homeGoals;
    if (!this.enabled) return;
    this.nextCheer -= dt;
    if (this.nextCheer <= 0 && this.audio.paused) {
      this.cheer(lundsgardHasBall && this.turn % 2 === 1 ? 'lundsgard' : this.turn % 2 === 0 ? 'komigen' : 'heja');
      this.turn++;
    }
  }
}
