import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CrowdAudio, CHEERS } from '../src/crowd-audio';
import { ROSTERS, playerSurname } from '../src/teams';
import { FloorballGame } from '../src/game-state';

class TestAudio {
  src = ''; paused = true; ended = false; currentTime = 0; preload = ''; volume = 1; plays: string[] = [];
  play() { this.paused = false; this.ended = false; this.plays.push(this.src); return Promise.resolve(); }
  pause() { this.paused = true; }
}
function fixture() {
  const audio = new TestAudio(); const captions: string[] = [];
  const sound = new CrowdAudio(audio as unknown as HTMLAudioElement, text => captions.push(text), '/innebandy/');
  return { sound, audio, captions };
}

test('alla matchspelare och båda målvakterna har efternamn, Nykvarns nummer 10 heter Lundsgård', () => {
  const game = new FloorballGame();
  game.players.forEach(player => assert.notEqual(playerSurname(player.team, player.number), 'Spelare'));
  assert.equal(playerSurname(0, 10), 'Lundsgård');
  assert.equal(ROSTERS.flat().length, 10);
  for (const team of [0, 1] as const) assert.notEqual(playerSurname(team, 1), 'Spelare');
});

test('hejaropen startar på matchstart, turas om och köar inte över varandra', () => {
  const { sound, audio } = fixture();
  assert.equal(audio.plays.length, 0);
  sound.start(); assert.equal(audio.src, '/innebandy/audio/heja.wav');
  sound.update(12, true, 0, false, true); assert.equal(audio.plays.length, 1);
  audio.paused = true;
  sound.update(1, true, 0, false, true); assert.equal(audio.src, '/innebandy/audio/komigen.wav');
  audio.paused = true;
  sound.update(10, true, 0, true, true); assert.equal(audio.src, '/innebandy/audio/lundsgard.wav');
});

test('hemmamål bryter ett vanligt hejarop en gång; ljud av och dold sida stoppar rösten', () => {
  const { sound, audio, captions } = fixture(); sound.start();
  sound.update(.01, true, 1, false, true); assert.equal(audio.src, '/innebandy/audio/mal.wav');
  sound.update(.01, true, 1, false, true); assert.equal(audio.plays.length, 2);
  sound.setEnabled(false); assert.equal(audio.paused, true);
  sound.update(20, true, 2, true, true); assert.equal(audio.plays.length, 2);
  sound.start(); assert.equal(audio.plays.length, 2);
  sound.setEnabled(true); assert.equal(audio.paused, false);
  sound.update(.01, true, 0, false, false); assert.equal(audio.paused, true);
  assert.ok(captions.includes(CHEERS.mal));
});

test('alla fyra svenska hejarop har verkliga ljuddata som följer med det statiska spelet', () => {
  for (const key of Object.keys(CHEERS)) {
    const wav = readFileSync(new URL(`../public/audio/${key}.wav`, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.ok(wav.length > 44000);
    let peak = 0;
    for (let i = 44; i < wav.length - 1; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
    assert.ok(peak > 1000, `${key} får inte vara tyst`);
  }
});

test('blockerad ljudstart visar en knappinstruktion utan att återuppliva ett avstängt ljud', async () => {
  const audio = new TestAudio(); const captions: string[] = [];
  audio.play = () => Promise.reject(new Error('NotAllowedError'));
  const sound = new CrowdAudio(audio as unknown as HTMLAudioElement, text => captions.push(text));
  sound.start(); await Promise.resolve();
  assert.match(captions.at(-1)!, /Tryck på Heja Nykvarn/);
  sound.cheer(); sound.setEnabled(false); await Promise.resolve();
  assert.equal(captions.at(-1), 'Publikljudet är av.');
});
