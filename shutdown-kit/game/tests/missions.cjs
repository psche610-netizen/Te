// Exercise the real simulation without a renderer. TypeScript is already a dev dependency.
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const resolve = Module._resolveFilename
Module._resolveFilename = function (id, ...args) {
  return resolve.call(this, id.startsWith('@/') ? path.join(root, id.slice(2)) : id, ...args)
}
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename)
const { createSession, stepSession } = require('../lib/game/session.ts')
const { generatorAvailable, MISSIONS } = require('../lib/game/missions.ts')
const { findContext, updateEndgame } = require('../lib/game/objectives.ts')
const { isWalkable } = require('../lib/game/level/pathfinding.ts')
const { routeSafe, updateShift } = require('../lib/game/shift.ts')
const { seededRng } = require('../lib/game/daily.ts')
const { actions } = require('../lib/game/actions.ts')
const { SECTOR_1 } = require('../lib/game/level/sector1.ts')
const { SECTOR_2 } = require('../lib/game/level/sector2.ts')
const { SECTOR_3 } = require('../lib/game/level/sector3.ts')
const { GATE } = require('../lib/game/config.ts')
let runs = 0
for (const level of [SECTOR_1, SECTOR_2, SECTOR_3]) for (const night of [1, 2, 3]) for (let seed = 1; seed <= 12; seed++) {
  const s = createSession(level, { night, rng: seededRng(seed) })
  const replay = createSession(level, { night, rng: seededRng(seed) })
  assert.deepEqual(s.level.generators, replay.level.generators, 'seeded objective sites')
  assert.equal(s.generators.length, MISSIONS[s.mission].count)
  updateShift(s, 0.01)
  assert.ok(routeSafe(s), `${level.id} night ${night} seed ${seed}: initial objective reachable`)
  if (night === 2) {
    assert.equal(s.generators.filter((_, i) => generatorAvailable(s, i)).length, 1)
    const locked = s.order[1], g = s.level.generators[locked]
    Object.assign(s.player, { x: g.x, z: g.z + 1 })
    assert.notDeepEqual(findContext(s), { kind: 'repair', id: locked }, 'inactive relay cannot be used')
  }
  // Resolve one failed trial: no progress, no reward, a noise event.
  s.repair = { generatorId: s.order[0], trial: 'needle', night, quick: false, steady: false }
  actions.repairResult = 'fail'
  stepSession(s, 0.01)
  assert.equal(s.repaired, 0)
  assert.ok(s.noise.events.some(e => e.kind === 'repair-fail'))
  for (const id of s.order) {
    const g = s.level.generators[id]
    const near = [[0,1],[1,0],[0,-1],[-1,0]].find(([dx,dz]) => isWalkable(s.level,g.cx+dx,g.cz+dz))
    assert.ok(near, 'objective has an accessible interaction side')
    Object.assign(s.player, { x: (g.cx+near[0])*2, z: (g.cz+near[1])*2 })
    Object.assign(s.hunter, { x: 1000, z: 1000 })
    s.repair = { generatorId: id, trial: s.generators[id].trial, night, quick: false, steady: false }
    const charges = s.hackCharges
    actions.repairResult = 'success'
    stepSession(s, 0.01)
    assert.ok(s.generators[id].repaired)
    if (night === 1) assert.ok(s.level.cameras.every(c => c.blindTimer > 11))
    if (night === 2) assert.equal(s.hackCharges, Math.min(4, charges + 1))
    if (night === 3) {
      assert.ok(s.shift.interval < 45)
      assert.notEqual(s.hunter.mode, 'patrol', 'overload alerts even a distant hunter')
      assert.ok(s.hunter.focus && Math.hypot(s.hunter.focus.x - g.x, s.hunter.focus.z - g.z) < 3, 'hunter receives the objective location')
    }
    s.shift.safetyTimer = 0
    updateShift(s, 0.01)
    assert.ok(routeSafe(s), `${level.id} night ${night} seed ${seed} id ${id}: next active relay or exit remains reachable`)
  }
  assert.ok(s.gatesPowered)
  const g = s.level.gates[0]
  Object.assign(s.player, { x: g.x, z: g.z })
  s.openingGate = g.id
  updateEndgame(s, GATE.openTime + 0.1)
  assert.equal(s.status, 'escaped', 'opening a powered exit completes the mission')
  const timeout = createSession(level, { night })
  timeout.gatesPowered = true
  timeout.finalChase = 0.1
  updateEndgame(timeout, 0.2)
  assert.equal(timeout.failReason, 'lockdown')
  runs++
}
console.log(`PASS: ${runs} seeded missions; all sectors/nights, relay gating, repair failure, rewards, route safety, escape and lockdown.`)
