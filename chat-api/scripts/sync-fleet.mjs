import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const src = JSON.parse(readFileSync(resolve(root, 'data.json'), 'utf8'));
const slim = [];

for (const yacht of src) {
  const prices = yacht.prices || {};
  if (!Object.keys(prices).length) continue;
  slim.push({
    id: yacht.id,
    name: yacht.name,
    brand: yacht.brand || '',
    size: yacht.size,
    year: yacht.year,
    area: yacht.area || '',
    location: yacht.location || '',
    jacuzzi: Boolean(yacht.jacuzzi),
    jetski: Boolean(yacht.jetski),
    prices: Object.fromEntries(
      Object.entries(prices).filter(([, value]) => value != null).map(([key, value]) => [key, Number(value)]),
    ),
    category: yacht.category || '',
    capacity: yacht.capacity,
    group_label: yacht.group_label || '',
    tier: yacht.tier_group || '',
  });
}

const out = resolve(root, 'chat-api/data/fleet.json');
writeFileSync(out, JSON.stringify(slim));
console.log(`Wrote ${slim.length} yachts to ${out}`);
