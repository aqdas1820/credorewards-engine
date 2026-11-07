import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('standalone Node.js SDK example produces reproducible synthetic rewards', () => {
  const entry = fileURLToPath(new URL('../examples/node-consumer.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [entry], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), {
    cardId: 'fictional-grocery',
    totalRewardsPaise: 3200,
    netAnnualValuePaise: 2200,
    winnerCardIds: ['fictional-grocery'],
    januaryGroceryRewardsPaise: 3000
  });
});
