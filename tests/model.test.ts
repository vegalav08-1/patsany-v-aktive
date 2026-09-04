import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSETS, GAME, STAGES } from '../src/config/game';
import { GameModel, createRoute, timeAtDistance, type RoadObject } from '../src/game/model';

const isolated = () => {
  const model = new GameModel();
  model.start('economy-test');
  model.objects = [];
  model.route = [];
  return model;
};
let nextId = 100_000;
const object = (type: RoadObject['type'], value: number, assetId?: RoadObject['assetId']): RoadObject =>
  ({ id: nextId++, type, value, assetId, lane: 1, y: GAME.impactY, label: 'Тест', processed: false, hitAt: 0 });
const approximately = (actual: number, expected: number, epsilon = 0.0001) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≈ ${expected}`);
const advance = (model: GameModel, seconds: number, hz = 60) => {
  const target = Math.min(GAME.duration, model.elapsed + seconds);
  while (model.state === 'playing' && model.elapsed < target - 1e-9) model.update(Math.min(1 / hz, target - model.elapsed));
};

test('purchase transfers cash to an asset without creating capital', () => {
  const model = isolated();
  model.cash = 30_000;
  model.applyCollision(object('asset', 25_000, 'coffee'));
  assert.equal(model.cash, 5_000);
  assert.deepEqual(model.ownedAssets, ['coffee']);
  assert.equal(model.netWorth, 30_000);
  assert.equal(model.incomePerSecond, 2_000);
});

test('insufficient money neither buys nor penalizes', () => {
  const model = isolated();
  model.cash = 24_999;
  model.applyCollision(object('asset', 25_000, 'coffee'));
  assert.equal(model.cash, 24_999);
  assert.deepEqual(model.ownedAssets, []);
  assert.equal(model.events.at(-1)?.type, 'insufficient');
});

test('a collision and an asset can each be processed only once', () => {
  const model = isolated();
  const cash = object('cash', 50_000);
  model.applyCollision(cash);
  model.applyCollision(cash);
  assert.equal(model.cash, 50_000);
  const coffee = object('asset', 25_000, 'coffee');
  model.applyCollision(coffee);
  model.applyCollision(coffee);
  model.applyCollision(object('asset', 25_000, 'coffee'));
  assert.equal(model.cash, 25_000);
  assert.deepEqual(model.ownedAssets, ['coffee']);
});

test('fractional income is preserved across 30, 60 and 120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    const model = isolated();
    model.ownedAssets = ['coffee', 'shop'];
    advance(model, 7.125, hz);
    approximately(model.cash, 22_000 * 7.125);
  }
});

test('a purchase inside a frame earns income only after its exact crossing', () => {
  const model = isolated();
  model.cash = 25_000;
  const coffee = object('asset', 25_000, 'coffee');
  coffee.hitAt = 0.075;
  model.objects.push(coffee);
  model.update(0.1);
  approximately(model.cash, 50);
  approximately(model.netWorth, 25_050);
});

test('income before and after a loss in one frame uses the exact loss time', () => {
  const model = isolated();
  model.cash = 100_000;
  model.ownedAssets = ['coffee'];
  const loss = object('loss', 0.2);
  loss.hitAt = 0.05;
  model.objects.push(loss);
  model.update(0.1);
  approximately(model.cash, (100_000 + 2_000 * 0.05) * 0.8 + 2_000 * 0.05);
  assert.equal(model.events.filter(event => event.type === 'loss').length, 1);
});

test('pause, menu and results freeze both income and active time', () => {
  const model = isolated();
  model.ownedAssets = ['coffee'];
  advance(model, 1);
  const cash = model.cash;
  const elapsed = model.elapsed;
  model.pause();
  for (let i = 0; i < 100; i++) model.update(0.1);
  assert.equal(model.cash, cash);
  assert.equal(model.elapsed, elapsed);
  model.resume();
  advance(model, 1);
  approximately(model.cash, cash + 2_000);
  model.menu();
  model.update(0.1);
  approximately(model.cash, cash + 2_000);
  model.state = 'playing';
  model.elapsed = 89.95;
  const beforeFinish = model.cash;
  model.update(0.1);
  assert.equal(model.state, 'results');
  assert.equal(model.elapsed, 90);
  approximately(model.cash, beforeFinish + 100);
  model.update(0.1);
  approximately(model.cash, beforeFinish + 100);
  assert.equal(model.events.filter(event => event.type === 'finish').length, 1);
});

test('loss never makes cash negative, preserves assets and grants 0.8s protection', () => {
  const model = isolated();
  model.cash = 100_000;
  model.ownedAssets = ['coffee'];
  model.applyCollision(object('loss', 0.2));
  assert.equal(model.cash, 80_000);
  model.applyCollision(object('loss', 0.2));
  assert.equal(model.cash, 80_000);
  assert.deepEqual(model.ownedAssets, ['coffee']);
  advance(model, 0.81);
  model.applyCollision(object('loss', 2));
  assert.equal(model.cash, 0);
  assert.equal(model.netWorth, 25_000);
});

test('all five visual stages follow peak capital and never regress on loss', () => {
  const model = isolated();
  assert.equal(model.stage, 0);
  for (let stage = 1; stage < STAGES.length; stage++) {
    model.cash = STAGES[stage]!.threshold;
    model.update(0);
    assert.equal(model.stage, stage);
  }
  model.applyCollision(object('loss', 0.99));
  assert.equal(model.stage, 4);
  assert.equal(model.peakNetWorth, 100_000_000);
  assert.equal(model.netWorth, 1_000_000);
});

test('skipping thresholds emits only one transition to the final opened stage', () => {
  const model = isolated();
  model.applyCollision(object('cash', 12_000_000));
  assert.equal(model.stage, 3);
  assert.equal(model.events.filter(event => event.type === 'stage').length, 1);
});

test('restart resets the whole economy, position, timer, protection and events', () => {
  const model = isolated();
  model.cash = 5_000_000;
  model.ownedAssets = ['coffee', 'shop'];
  model.moveTo(0);
  advance(model, 2);
  model.applyCollision(object('loss', 0.2));
  model.pause();
  model.start('new-track');
  assert.equal(model.state, 'playing');
  assert.equal(model.seed, 'new-track');
  assert.equal(model.cash, 0);
  assert.deepEqual(model.ownedAssets, []);
  assert.equal(model.incomePerSecond, 0);
  assert.equal(model.netWorth, 0);
  assert.equal(model.peakNetWorth, 0);
  assert.equal(model.stage, 0);
  assert.equal(model.elapsed, 0);
  assert.equal(model.lane, 1);
  assert.equal(model.playerLane, 1);
  assert.equal(model.protectedUntil, 0);
  assert.deepEqual(model.events, []);
});

test('route is reproducible by seed/version and independent of progress', () => {
  assert.deepEqual(createRoute('friends'), createRoute('friends'));
  assert.notDeepEqual(createRoute('friends'), createRoute('another'));
  const left = new GameModel();
  const right = new GameModel();
  left.start('same');
  right.start('same');
  right.ownedAssets = ASSETS.map(asset => asset.id);
  advance(left, 30);
  advance(right, 30);
  assert.deepEqual(left.route, right.route);
});

test('seeded routes guarantee physically reachable safe paths and visible offers', () => {
  for (let seed = 0; seed < 100; seed++) {
    let previousLane = 1;
    let previousTime = 0;
    for (const row of createRoute(`fair-${seed}`)) {
      assert.ok(!row.hazards.includes(row.safeLane));
      assert.ok(Math.abs(row.safeLane - previousLane) <= 1);
      assert.ok(row.hitAt - previousTime >= GAME.minimumReactionSeconds + 2 / GAME.moveSpeed);
      assert.ok(row.spawnAt <= row.visibleAt, 'objects are created before entering the screen');
      assert.ok(row.hitAt - row.visibleAt > 2, 'every object center is on screen more than 2 seconds');
      assert.ok(row.hazards.length < 3);
      previousLane = row.safeLane;
      previousTime = row.hitAt;
    }
  }
});

test('spawn-time inversion remains finite when configured speed is constant', () => {
  approximately(timeAtDistance(0.94, 0.24, 0), 0.94 / 0.24);
  assert.equal(timeAtDistance(-1, 0.24, 0), 0);
  for (const acceleration of [0, 0.00000001, 0.002]) {
    const time = timeAtDistance(5, 0.24, acceleration);
    approximately(0.24 * time + acceleration * time * time / 2, 5);
  }
});

test('normal opening collection can buy the first coffee at 12 seconds', () => {
  const model = new GameModel();
  model.start('first-coffee');
  while (model.elapsed < 12.01) {
    const upcoming = model.route.find(row => row.hitAt > model.elapsed + 0.01);
    if (upcoming) model.moveTo(upcoming.safeLane);
    model.update(1 / 60);
  }
  assert.ok(model.ownedAssets.includes('coffee'));
  const firstOffer = model.route.find(row => row.isAsset)!;
  approximately(firstOffer.hitAt, 12);
});

test('invalid or huge deltas cannot advance the run unpredictably', () => {
  const model = isolated();
  model.update(NaN);
  model.update(-1);
  model.update(Infinity);
  assert.equal(model.elapsed, 0);
  model.update(30);
  assert.equal(model.elapsed, GAME.maxDelta);
});

test('a full timed route has equal economy at 30, 60 and 120 Hz', () => {
  const outcomes = [30, 60, 120].map(hz => {
    const model = new GameModel();
    model.start('refresh-rate');
    let command = 0;
    while (model.state === 'playing') {
      const row = model.route[command];
      if (row && model.elapsed >= row.hitAt - 0.5 - 1e-9) {
        model.moveTo(row.safeLane);
        command++;
      }
      model.update(1 / hz);
    }
    return model;
  });
  for (const result of outcomes) {
    assert.equal(result.elapsed, 90);
    assert.equal(result.stage, outcomes[0]!.stage);
    assert.deepEqual(result.ownedAssets, outcomes[0]!.ownedAssets);
    approximately(result.netWorth, outcomes[0]!.netWorth, 0.05);
  }
});
