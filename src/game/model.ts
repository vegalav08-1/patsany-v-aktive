import { ASSETS, GAME, STAGES, type AssetId } from '../config/game';

export type GameState = 'menu' | 'playing' | 'paused' | 'results';
export type ObjectType = 'cash' | 'asset' | 'loss';
export interface RoadObject {
  id: number;
  type: ObjectType;
  lane: number;
  y: number;
  value: number;
  label: string;
  assetId?: AssetId;
  processed: boolean;
  hitAt: number;
}
export interface GameEvent {
  type: 'cash' | 'asset' | 'loss' | 'stage' | 'insufficient' | 'finish';
  text: string;
  lane: number;
  value?: number;
}
/** A route uses only seed/version; purchases and particles never consume its RNG. */
export interface RouteRow {
  index: number;
  hitAt: number;
  spawnAt: number;
  /** Time the object's center actually enters the top edge of the Canvas. */
  visibleAt: number;
  safeLane: number;
  hazards: number[];
  alternateLane: number | null;
  isAsset: boolean;
  cashLabel: number;
  lossLabel: number;
}

/** Inverse of distance = v*t + a*t²/2, also stable for a constant speed. */
export function timeAtDistance(distance: number, initialSpeed: number, acceleration: number): number {
  return distance <= 0 ? 0 : 2 * distance / (Math.sqrt(initialSpeed ** 2 + 2 * acceleration * distance) + initialSpeed);
}

export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function createRoute(seed: string): RouteRow[] {
  const random = seededRandom(`route-v${GAME.version}:${seed}`);
  const rows: RouteRow[] = [];
  let safeLane = 1;
  let hitAt: number = GAME.firstRowTime;
  for (let index = 0; hitAt < GAME.duration - 0.15; index++) {
    const candidates = [safeLane - 1, safeLane, safeLane + 1].filter(lane => lane >= 0 && lane < GAME.lanes);
    safeLane = candidates[Math.floor(random() * candidates.length)]!;
    const others = [0, 1, 2].filter(lane => lane !== safeLane);
    if (random() < 0.5) others.reverse();
    const isAsset = index >= GAME.firstAssetRow && (index - GAME.firstAssetRow) % GAME.assetEveryRows === 0;
    // The main reward lane is always safe, moves at most one lane per row,
    // and row spacing exceeds reaction + full two-lane movement time.
    const hazards = index < GAME.harmlessOpeningRows ? [] : isAsset || random() < GAME.singleHazardChance ? [others[0]!] : others;
    const alternateLane = isAsset ? others[1]! : null;
    const acceleration = (GAME.finalSpeed - GAME.initialSpeed) / GAME.duration;
    const hitDistance = GAME.initialSpeed * hitAt + acceleration * hitAt * hitAt / 2;
    const spawnAt = timeAtDistance(hitDistance - (GAME.impactY - GAME.spawnY), GAME.initialSpeed, acceleration);
    const visibleAt = timeAtDistance(hitDistance - GAME.impactY, GAME.initialSpeed, acceleration);
    rows.push({ index, hitAt, spawnAt, visibleAt, safeLane, hazards, alternateLane, isAsset,
      cashLabel: Math.floor(random() * GAME.labels.length), lossLabel: Math.floor(random() * GAME.lossLabels.length) });
    // Keep the learning section fixed: 7 cash rows, then coffee at 12.0s.
    const firstAssetTime = GAME.firstRowTime + GAME.initialRowInterval * GAME.firstAssetRow;
    const progress = Math.max(0, (hitAt - firstAssetTime) / (GAME.duration - firstAssetTime));
    hitAt += GAME.initialRowInterval + (GAME.finalRowInterval - GAME.initialRowInterval) * progress;
  }
  return rows;
}

export class GameModel {
  state: GameState = 'menu';
  seed = '';
  elapsed = 0;
  lane = 1;
  playerLane = 1;
  cash = 0;
  ownedAssets: AssetId[] = [];
  peakNetWorth = 0;
  stage = 0;
  objects: RoadObject[] = [];
  events: GameEvent[] = [];
  route: RouteRow[] = [];
  protectedUntil = 0;
  private nextRow = 0;

  get incomePerSecond(): number {
    return ASSETS.reduce((sum, asset) => sum + (this.ownedAssets.includes(asset.id) ? asset.incomePerSecond : 0), 0);
  }
  get netWorth(): number {
    return this.cash + ASSETS.reduce((sum, asset) => sum + (this.ownedAssets.includes(asset.id) ? asset.purchasePrice : 0), 0);
  }
  get remaining(): number { return Math.max(0, GAME.duration - this.elapsed); }

  start(seed: string): void {
    this.seed = seed;
    this.elapsed = 0;
    this.lane = this.playerLane = 1;
    this.cash = 0;
    this.ownedAssets = [];
    this.peakNetWorth = 0;
    this.stage = 0;
    this.objects = [];
    this.events = [];
    this.protectedUntil = 0;
    this.nextRow = 0;
    this.route = createRoute(seed);
    this.state = 'playing';
    this.spawnVisible();
  }
  pause(): void { if (this.state === 'playing') this.state = 'paused'; }
  resume(): void { if (this.state === 'paused') this.state = 'playing'; }
  menu(): void { this.state = 'menu'; this.events = []; }
  moveTo(lane: number): void {
    if (this.state === 'playing' && Number.isFinite(lane)) this.lane = Math.max(0, Math.min(2, Math.round(lane)));
  }
  drainEvents(): GameEvent[] { return this.events.splice(0); }

  private positionAt(hitAt: number): number {
    // Integral of linearly rising world speed; identical positions at all FPS.
    const acceleration = (GAME.finalSpeed - GAME.initialSpeed) / GAME.duration;
    const distance = GAME.initialSpeed * (hitAt - this.elapsed) + acceleration * (hitAt * hitAt - this.elapsed * this.elapsed) / 2;
    return GAME.impactY - distance;
  }

  private spawnVisible(): void {
    while (this.nextRow < this.route.length) {
      const row = this.route[this.nextRow]!;
      const y = this.positionAt(row.hitAt);
      if (row.spawnAt > this.elapsed + 1e-10) break;
      this.nextRow++;
      const add = (type: ObjectType, lane: number, value: number, label: string, assetId?: AssetId) => {
        this.objects.push({ id: row.index * 3 + lane, type, lane, value, label, assetId, y, hitAt: row.hitAt, processed: false });
      };
      const asset = row.isAsset ? ASSETS.find(candidate => !this.ownedAssets.includes(candidate.id)) : undefined;
      if (asset) add('asset', row.safeLane, asset.purchasePrice, asset.name, asset.id);
      else add('cash', row.safeLane, GAME.cashValues[this.stage]!, GAME.labels[row.cashLabel]!);
      if (row.alternateLane !== null) add('cash', row.alternateLane, GAME.cashValues[this.stage]!, GAME.labels[row.cashLabel]!);
      for (const lane of row.hazards) add('loss', lane, GAME.lossFractions[row.lossLabel]!, GAME.lossLabels[row.lossLabel]!);
    }
  }

  private updatePeak(): void {
    this.cash = Math.max(0, this.cash);
    this.peakNetWorth = Math.max(this.peakNetWorth, this.netWorth);
    let stage = 0;
    STAGES.forEach((entry, index) => { if (this.peakNetWorth >= entry.threshold) stage = index; });
    if (stage > this.stage) {
      this.stage = stage;
      this.events.push({ type: 'stage', text: STAGES[stage]!.tagline, lane: this.lane, value: stage });
    }
  }

  /** Cash keeps fractional rubles internally. UI alone rounds displayed money. */
  private advanceTo(time: number): void {
    const duration = time - this.elapsed;
    this.cash += this.incomePerSecond * duration;
    const delta = this.lane - this.playerLane;
    this.playerLane += Math.sign(delta) * Math.min(Math.abs(delta), GAME.moveSpeed * duration);
    this.elapsed = time;
    this.updatePeak();
  }

  applyCollision(object: RoadObject): void {
    if (this.state !== 'playing' || object.processed) return;
    object.processed = true;
    if (object.type === 'cash') {
      this.cash += object.value;
      this.events.push({ type: 'cash', text: object.label, lane: object.lane, value: object.value });
    } else if (object.type === 'asset') {
      const asset = ASSETS.find(entry => entry.id === object.assetId);
      if (!asset || this.ownedAssets.includes(asset.id)) return;
      if (this.cash + 1e-7 < asset.purchasePrice) {
        this.events.push({ type: 'insufficient', text: 'Не хватает наличных', lane: object.lane });
      } else {
        this.cash = Math.max(0, this.cash - asset.purchasePrice);
        this.ownedAssets.push(asset.id);
        this.events.push({ type: 'asset', text: asset.name, lane: object.lane, value: asset.purchasePrice });
        // An already purchased business is never left as a duplicate offer.
        for (const pending of this.objects) {
          if (!pending.processed && pending.assetId === asset.id) {
            pending.type = 'cash';
            pending.assetId = undefined;
            pending.value = GAME.cashValues[this.stage]!;
            pending.label = 'Выручка';
          }
        }
      }
    } else if (this.elapsed >= this.protectedUntil) {
      const loss = this.cash * Math.max(0, Math.min(1, object.value));
      this.cash -= loss;
      this.protectedUntil = this.elapsed + GAME.lossProtectionSeconds;
      this.events.push({ type: 'loss', text: object.label, lane: object.lane, value: loss });
    }
    this.updatePeak();
  }

  update(deltaSeconds: number): void {
    if (this.state !== 'playing' || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return;
    const end = Math.min(GAME.duration, this.elapsed + Math.min(deltaSeconds, GAME.maxDelta));
    this.spawnVisible();
    // Split a frame at each spawn/crossing. Purchase timing and the value of a
    // newly appearing reward therefore do not depend on the display frequency.
    while (this.elapsed < end - 1e-10) {
      const nextSpawn = this.route[this.nextRow]?.spawnAt ?? Infinity;
      const nextCrossing = this.objects.reduce((next, object) => object.processed ? next : Math.min(next, object.hitAt), Infinity);
      const boundary = Math.max(this.elapsed, Math.min(end, nextSpawn, nextCrossing));
      this.advanceTo(boundary);
      this.spawnVisible();
      for (const object of this.objects) {
        if (!object.processed && object.hitAt <= this.elapsed + 1e-10) {
          if (Math.abs(this.playerLane - object.lane) <= GAME.collisionTolerance) this.applyCollision(object);
          else object.processed = true;
        }
      }
      if (boundary >= end) break;
    }
    this.advanceTo(end);
    this.spawnVisible();
    for (const object of this.objects) object.y = this.positionAt(object.hitAt);
    this.objects = this.objects.filter(object => object.y < 1.18);
    if (this.elapsed >= GAME.duration - 1e-9) {
      this.elapsed = GAME.duration;
      this.state = 'results';
      this.events.push({ type: 'finish', text: 'Капитал собран', lane: this.lane, value: this.netWorth });
    }
  }
}
