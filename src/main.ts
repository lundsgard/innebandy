import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PlayerFigure } from './player-figure';
import { FloorballGame, type Keepers } from './game-state';
import { batchPlayers } from './player-batch';
import { createHall } from './arena';
import { createRink } from './rink-view';
import { PLAYER_HEIGHT, GOAL_CROSSBAR_Y, GOAL_POST_RADIUS, SHOT_SPEED } from './rink-dimensions';
import { Goalkeeper } from './goalkeeper';
import { BALL_RADIUS, GOAL_Z, projectileAt, shotVelocity } from './shot-rules';
import { playerSurname, ROSTERS, TEAMS } from './teams';
import { CrowdAudio } from './crowd-audio';
import './style.css';

const host = document.querySelector<HTMLDivElement>('#game')!;
const feedback = document.querySelector<HTMLParagraphElement>('#feedback')!;
const goalCounter = document.querySelector<HTMLSpanElement>('#goals')!;
const shotCounter = document.querySelector<HTMLSpanElement>('#shots')!;
const saveCounter = document.querySelector<HTMLSpanElement>('#saves')!;
const celebration = document.querySelector<HTMLDivElement>('#celebration')!;
const passCounter = document.querySelector<HTMLSpanElement>('#passes')!;
const controlledLabel = document.querySelector<HTMLSpanElement>('#controlled-player')!;
const game = new FloorballGame();
const awayCounter = document.querySelector<HTMLSpanElement>('#away-goals')!;
const matchClock = document.querySelector<HTMLOutputElement>('#match-clock')!;
const startButton = document.querySelector<HTMLButtonElement>('#start-match')!;
const matchCover = document.querySelector<HTMLDivElement>('#match-cover')!;
const startCoverButton = document.querySelector<HTMLButtonElement>('#start-cover')!;
const switchButton = document.querySelector<HTMLButtonElement>('#switch-player')!;
const cameraButton = document.querySelector<HTMLButtonElement>('#camera-mode')!;
const crowdSoundButton = document.querySelector<HTMLButtonElement>('#crowd-sound')!;
const crowdCheerButton = document.querySelector<HTMLButtonElement>('#crowd-cheer')!;
const crowdCaption = document.querySelector<HTMLParagraphElement>('#crowd-caption')!;
const crowdAudio = new CrowdAudio(document.querySelector<HTMLAudioElement>('#crowd-voice')!, text => { crowdCaption.textContent = `Läktaren: ${text}`; }, import.meta.env.BASE_URL);
crowdSoundButton.addEventListener('click', () => {
  crowdAudio.setEnabled(!crowdAudio.enabled);
  crowdSoundButton.textContent = `Publikljud: ${crowdAudio.enabled ? 'På' : 'Av'}`;
  crowdSoundButton.setAttribute('aria-pressed', String(crowdAudio.enabled));
  crowdCheerButton.disabled = !crowdAudio.enabled;
});
crowdCheerButton.addEventListener('click', () => crowdAudio.cheer());
const rosters = document.querySelector<HTMLDivElement>('#team-rosters')!;
ROSTERS.forEach((roster, team) => {
  const section = document.createElement('section'); const heading = document.createElement('h2');
  heading.textContent = TEAMS[team].name; section.append(heading);
  const list = document.createElement('ul');
  roster.forEach(player => { const item = document.createElement('li'); item.textContent = `${player.number} · ${player.surname}${player.number === 1 ? ' (målvakt)' : ''}`; list.append(item); });
  section.append(list); rosters.append(section);
});
let closeCamera = false;
let crowdCamera = false;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe0dfd5);
scene.fog = new THREE.Fog(0xe0dfd5, 90, 165);
const camera = new THREE.PerspectiveCamera(49, 1, 0.1, 80);
camera.position.set(32, 24, 0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
host.append(renderer.domElement);
const room = new RoomEnvironment();
const environmentGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = environmentGenerator.fromScene(room, 0.04).texture;
scene.environmentIntensity = 0.35;
room.dispose();
environmentGenerator.dispose();
const resizeObserver = new ResizeObserver(() => {
  renderer.setSize(host.clientWidth, host.clientHeight);
  camera.aspect = host.clientWidth / host.clientHeight;
  camera.updateProjectionMatrix();
});
resizeObserver.observe(host);

scene.add(new THREE.HemisphereLight(0xfff8e9, 0x92978c, 1.9));
const sun = new THREE.DirectionalLight(0xfff9ed, 2.0);
sun.position.set(7, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -26;
sun.shadow.camera.right = 26;
sun.shadow.camera.top = 26;
sun.shadow.camera.bottom = -26;
sun.shadow.normalBias = 0.012;
sun.shadow.camera.far = 90;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xf0f4ed, 1.05);
fill.position.set(-8, 12, -12);
scene.add(fill);
const hall = createHall(scene);

function material(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
}
createRink(scene, renderer);
const goalkeepers = [new Goalkeeper(scene, 0), new Goalkeeper(scene, 1)];

const figures = game.players.map(player => new PlayerFigure(scene, player.number, player.team));
const syncFigures = batchPlayers(scene, figures);
const ball = new THREE.Group();
const ballSurface = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 24, 16), material(0xfffdf3));
ballSurface.castShadow = true;
ball.add(ballSurface);
for (let i = 0; i < 26; i++) {
  const y = 1 - (i / 25) * 2;
  const r = Math.sqrt(1 - y * y);
  const angle = i * 2.39996;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.005, 8), new THREE.MeshBasicMaterial({ color: 0x5e706c }));
  const normal = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
  hole.position.copy(normal).multiplyScalar(BALL_RADIUS + 0.0004);
  hole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  ball.add(hole);
}
ball.position.set(game.ball.x, game.ball.y, game.ball.z);
scene.add(ball);
const aimGroup = new THREE.Group();
const aimMaterial = new THREE.MeshBasicMaterial({ color: 0x247c70 });
const aimDots: THREE.Mesh[] = [];
for (let i = 0; i < 24; i++) {
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), aimMaterial);
  aimGroup.add(dot);
  aimDots.push(dot);
}
const targetRing = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.135, 40), new THREE.MeshBasicMaterial({ color: 0x247c70, side: THREE.DoubleSide }));

aimGroup.add(targetRing);
scene.add(aimGroup);
const selection = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.375, 48), new THREE.MeshBasicMaterial({ color: 0x8ed8bd, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
selection.rotation.x = -Math.PI / 2;
scene.add(selection);
const controlledArrow = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.25, 3), new THREE.MeshBasicMaterial({ color: 0xf6d888 }));
controlledArrow.rotation.z = Math.PI;
scene.add(controlledArrow);
const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24), new THREE.MeshBasicMaterial({ color: 0x172a30, transparent: true, opacity: 0.22, depthWrite: false }));
ballShadow.rotation.x = -Math.PI / 2;
scene.add(ballShadow);

const pressed = new Set<string>();
const touchDirections = new Map<number, { x: number; z: number }>();
let activePointer: number | null = null;
let animationTime = 0;
const shootButton = document.querySelector<HTMLButtonElement>('#shoot')!;
const passButton = document.querySelector<HTMLButtonElement>('#pass')!;
const heightInput = document.querySelector<HTMLInputElement>('#shot-height')!;
const heightLabel = document.querySelector<HTMLOutputElement>('#height-value')!;
const presets = document.querySelectorAll<HTMLButtonElement>('[data-height]');

function setHeight(height: number) {
  game.targetHeight = THREE.MathUtils.clamp(height, BALL_RADIUS, 1.9);
  heightInput.value = String(game.targetHeight);
  heightLabel.textContent = game.targetHeight < 0.1 ? 'Lågt' : `${game.targetHeight.toFixed(2).replace('.', ',')} m`;
  presets.forEach(button => button.setAttribute('aria-pressed', String(Math.abs(Number(button.dataset.height) - game.targetHeight) < 0.02)));
}
heightInput.addEventListener('input', () => setHeight(Number(heightInput.value)));
presets.forEach(button => button.addEventListener('click', () => {
  setHeight(Number(button.dataset.height));
  host.focus({ preventScroll: true });
}));
setHeight(BALL_RADIUS);

function updateAim() {
  aimGroup.visible = game.running && game.hasBall;
  if (!aimGroup.visible) return;
  const target = { x: game.targetX, y: game.targetHeight, z: GOAL_Z };
  const launch = shotVelocity(game.ball, target);
  const duration = Math.max(0.12, Math.hypot(target.x - game.ball.x, target.z - game.ball.z) / SHOT_SPEED);
  for (let i = 0; i < aimDots.length; i++) {
    const point = projectileAt(game.ball, launch, duration * (i + 1) / (aimDots.length + 1));
    aimDots[i].position.set(point.x, point.y + 0.015, point.z);
  }
  targetRing.position.set(target.x, target.y, target.z + 0.04);
  (targetRing.material as THREE.MeshBasicMaterial).color.setHex(game.targetHeight > GOAL_CROSSBAR_Y - GOAL_POST_RADIUS - BALL_RADIUS ? 0xe88d68 : 0x9dd8cb);
}
const raycaster = new THREE.Raycaster();
const goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -GOAL_Z);
function aimAt(event: PointerEvent) {
  const bounds = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const point = raycaster.ray.intersectPlane(goalPlane, new THREE.Vector3());
  if (point) game.targetX = THREE.MathUtils.clamp(point.x, -3, 3);
}
renderer.domElement.addEventListener('pointerdown', event => {
  if (game.phase !== 'ready' || activePointer !== null || event.button !== 0) return;
  event.preventDefault();
  host.focus({ preventScroll: true });
  activePointer = event.pointerId;
  renderer.domElement.setPointerCapture(event.pointerId);
  aimAt(event);
});
renderer.domElement.addEventListener('pointermove', event => {
  if (event.pointerId === activePointer && game.phase === 'ready') aimAt(event);
});
renderer.domElement.addEventListener('pointerup', event => {
  if (event.pointerId !== activePointer) return;
  aimAt(event);
  activePointer = null;
  game.shoot();
});
renderer.domElement.addEventListener('pointercancel', () => { activePointer = null; });
renderer.domElement.addEventListener('lostpointercapture', () => { activePointer = null; });
const keyActions = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyP', 'KeyB']);
window.addEventListener('keydown', event => {
  const target = event.target as HTMLElement | null;
  const runningKey = /^Key[WASD]$/.test(event.code) || event.code.startsWith('Arrow');
  if (target?.matches('textarea, select, a, summary')) return;
  if (target?.matches('input') && !(target.matches('input[type="range"]') && /^Key[WASD]$/.test(event.code))) return;
  if (target?.matches('button') && !runningKey) return;
  if (!keyActions.has(event.code)) return;
  event.preventDefault();
  pressed.add(event.code);
  if (!event.repeat) {
    if (event.code === 'Space') game.shoot();
    if (event.code === 'KeyP') game.pass();
    if (event.code === 'KeyB') game.switchPlayer();
  }
});
window.addEventListener('keyup', event => { pressed.delete(event.code); });
function clearInput() {
  pressed.clear();
  touchDirections.clear();
  activePointer = null;
  document.querySelectorAll('[data-move]').forEach(button => button.classList.remove('held'));
}
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); crowdAudio.stop(); } });
window.addEventListener('pagehide', () => crowdAudio.stop());
shootButton.addEventListener('click', () => { host.focus({ preventScroll: true }); game.shoot(); });
passButton.addEventListener('click', () => { host.focus({ preventScroll: true }); game.pass(); });
switchButton.addEventListener('click', () => { host.focus({ preventScroll: true }); game.switchPlayer(); });
function startMatch() { clearInput(); game.start(); crowdAudio.start(); host.focus({ preventScroll: true }); }
startButton.addEventListener('click', startMatch);
startCoverButton.addEventListener('click', startMatch);
cameraButton.addEventListener('click', () => {
  if (closeCamera) { closeCamera = false; crowdCamera = true; }
  else if (crowdCamera) crowdCamera = false;
  else closeCamera = true;
  cameraButton.textContent = crowdCamera ? 'Kamera: Läktaren' : closeCamera ? 'Kamera: Nära' : 'Kamera: Hela planen';
  host.focus({ preventScroll: true });
});
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-move]')) {
  const [x, z] = button.dataset.move!.split(',').map(Number);
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touchDirections.set(event.pointerId, { x, z });
    button.classList.add('held');
  });
  const release = (event: PointerEvent) => {
    touchDirections.delete(event.pointerId);
    button.classList.remove('held');
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}

function textIfChanged(element: HTMLElement, text: string) {
  if (element.textContent !== text) element.textContent = text;
}
const keeperBall = new THREE.Vector3();
const keeperVelocity = new THREE.Vector3();
const cameraTarget = new THREE.Vector3(0, 0, 0);
const desiredCamera = new THREE.Vector3();
let previousSaves = [0, 0];
let lastTime = performance.now();
renderer.setAnimationLoop(time => {
  const dt = Math.min(Math.max(0, (time - lastTime) / 1000), 0.04);
  lastTime = time;
  animationTime += dt;
  const movement = {
    x: Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft')),
    z: Number(pressed.has('KeyS') || pressed.has('ArrowDown')) - Number(pressed.has('KeyW') || pressed.has('ArrowUp')),
  };
  for (const direction of touchDirections.values()) { movement.x += direction.x; movement.z += direction.z; }
  if (!closeCamera) {
    const horizontal = movement.x;
    movement.x = movement.z;
    movement.z = -horizontal;
  }
  keeperBall.set(game.ball.x, game.ball.y, game.ball.z);
  keeperVelocity.set(game.velocity.x, game.velocity.y, game.velocity.z);
  const keeperFrom = goalkeepers.map(keeper => keeper.pose()) as Keepers;
  goalkeepers.forEach(keeper => keeper.update(dt, game.phase, game.phaseTime, animationTime, keeperBall, keeperVelocity));
  game.update(dt, movement, keeperFrom, goalkeepers.map(keeper => keeper.pose()) as Keepers);
  goalkeepers.forEach((keeper, team) => {
    if (game.teamSaves[team] > previousSaves[team]) keeper.save(game.ball.x);
  });
  previousSaves = [...game.teamSaves];
  figures.forEach((figure, index) => {
    const windup = game.phase === 'windup' && game.actionOwner === index ? game.phaseTime / game.actionDuration : 0;
    const follow = game.phase !== 'ready' && game.phase !== 'windup' && game.actionOwner === index;
    figure.update(game.players[index], animationTime, windup, follow);
  });
  syncFigures();
  const carrier = game.carrier === null ? null : game.players[game.carrier];
  if (game.running || game.finished) crowdAudio.update(dt, game.running && !game.finished, game.goals, carrier?.team === 0 && carrier.number === 10, !document.hidden);
  hall.crowd.update(animationTime, crowdAudio.cheering || (game.phase === 'result' && game.result === 'goal' && game.resultTeam === 0));
  ball.position.set(game.ball.x, game.ball.y, game.ball.z);
  ball.rotation.x += dt * (game.phase === 'ready' ? game.controlled.speed : Math.hypot(game.velocity.x, game.velocity.z)) * 7;
  ballShadow.position.set(game.ball.x, 0.008, game.ball.z);
  const shadowScale = 1 + game.ball.y * 0.35;
  ballShadow.scale.setScalar(shadowScale);
  (ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.23 / (1 + game.ball.y);
  selection.position.set(game.controlled.x, 0.012, game.controlled.z);
  controlledArrow.position.set(game.controlled.x, PLAYER_HEIGHT + 0.25, game.controlled.z);
  const focus = game.controlled;
  if (crowdCamera) {
    desiredCamera.set(-6, 3.1, 6);
    cameraTarget.lerp(new THREE.Vector3(-16, 2.0, 3), Math.min(1, dt * 4));
  } else if (closeCamera) {
    desiredCamera.set(focus.x * 0.8 + 0.6, 5.5, focus.z + 9);
    cameraTarget.lerp(new THREE.Vector3(focus.x * 0.3, 0.5, (focus.z + GOAL_Z) / 2), Math.min(1, dt * 4));
  } else {
    const fit = Math.max(1, 1.4 / camera.aspect);
    desiredCamera.set(32 * fit, 24 * fit, 0);
    cameraTarget.lerp(new THREE.Vector3(-1, 1.2, 0), Math.min(1, dt * 4));
  }
  camera.position.lerp(desiredCamera, Math.min(1, dt * 4));
  camera.lookAt(cameraTarget);
  hall.roof.forEach(object => { object.visible = closeCamera && camera.position.y < 8; });
  hall.cutaway.forEach(object => { object.visible = closeCamera; });
  updateAim();
  textIfChanged(goalCounter, String(game.goals));
  textIfChanged(awayCounter, String(game.awayGoals));
  const seconds = Math.ceil(game.remaining);
  textIfChanged(matchClock, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
  matchCover.hidden = game.running || game.finished;
  startButton.textContent = game.finished ? 'Spela igen' : game.running ? 'Ny match' : 'Starta match';
  textIfChanged(shotCounter, String(game.shots));
  textIfChanged(saveCounter, String(game.saves));
  textIfChanged(passCounter, String(game.passes));
  textIfChanged(controlledLabel, `${playerSurname(game.controlled.team, game.controlled.number).toUpperCase()} · ${game.controlled.number}`);
  textIfChanged(feedback, game.message);
  textIfChanged(celebration, game.announcement);
  celebration.classList.toggle('visible', Boolean(game.announcement));
  shootButton.disabled = passButton.disabled = !game.running || game.phase === 'result' || game.phase === 'windup';
  switchButton.disabled = !game.running || game.phase === 'result';
  shootButton.textContent = game.hasBall ? 'Skjut' : 'Bryt';
  passButton.textContent = game.hasBall ? 'Passa' : 'Byt';
  renderer.render(scene, camera);
});
