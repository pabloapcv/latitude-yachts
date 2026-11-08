import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fleetSummary, loadFleet, searchYachts } from '../lib/fleet.ts';

describe('fleet', () => {
  it('loads the slim catalog', () => {
    const fleet = loadFleet();
    assert.equal(fleet.length, 273);
    assert.ok(fleet.every((y) => y.prices && Object.keys(y.prices).length));
  });

  it('filters Miami Beach yachts around 40 ft', () => {
    const found = searchYachts({ area: 'Miami Beach', minSize: 35, maxSize: 45, limit: 6 });
    assert.ok(found.length >= 1);
    assert.ok(found.every((y) => y.area === 'Miami Beach'));
    assert.ok(found.every((y) => y.size >= 35 && y.size <= 45));
  });

  it('filters by listed 4h price', () => {
    const found = searchYachts({ maxPrice: 800, duration: '4h', limit: 8 });
    assert.ok(found.length >= 1);
    assert.ok(found.every((y) => y.prices['4h'] <= 800));
  });

  it('requires jacuzzi when asked', () => {
    const found = searchYachts({ jacuzzi: true, limit: 8 });
    assert.ok(found.length >= 1);
    assert.ok(found.every((y) => y.jacuzzi));
  });

  it('summarizes the fleet without inventing counts', () => {
    const summary = fleetSummary();
    assert.match(summary, /273 listed vessels/);
    assert.match(summary, /21–124 ft/);
  });
});
