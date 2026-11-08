import fleetData from '../data/fleet.json' with { type: 'json' };

export type Yacht = {
  id: string;
  name: string;
  brand: string;
  size: number;
  year?: number;
  area: string;
  location: string;
  jacuzzi: boolean;
  jetski: boolean;
  prices: Record<string, number>;
  category: string;
  capacity?: number;
  group_label: string;
  tier: string;
};

export type YachtSearch = {
  query?: string;
  area?: string;
  minSize?: number;
  maxSize?: number;
  minPrice?: number;
  maxPrice?: number;
  duration?: '4h' | '6h' | '8h';
  guests?: number;
  jacuzzi?: boolean;
  jetski?: boolean;
  limit?: number;
};

const AREA_ALIASES: Array<[RegExp, string]> = [
  [/miami beach|south beach|haulinover|haulover/i, 'Miami Beach'],
  [/brickell|downtown|miami river/i, 'Downtown / Brickell / Miami River'],
  [/fort lauderdale|ft lauderdale|broward|las olas/i, 'Fort Lauderdale / Broward'],
  [/key biscayne|rickenbacker/i, 'Key Biscayne / Rickenbacker'],
  [/north miami|aventura|sunny isles/i, 'North Miami / Aventura'],
  [/coconut grove|coral gables|grove/i, 'Coconut Grove / Coral Gables'],
  [/boca|palm beach/i, 'Boca Raton / Palm Beach'],
  [/greater miami/i, 'Greater Miami Area'],
];

let cache: Yacht[] | null = null;

export function loadFleet(): Yacht[] {
  if (cache) return cache;
  cache = fleetData as Yacht[];
  return cache;
}

export function normalizeArea(input?: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed || /^all$/i.test(trimmed)) return undefined;
  for (const [pattern, area] of AREA_ALIASES) {
    if (pattern.test(trimmed)) return area;
  }
  const fleet = loadFleet();
  const exact = fleet.find((y) => y.area.toLowerCase() === trimmed.toLowerCase());
  return exact?.area ?? trimmed;
}

function durationPrice(yacht: Yacht, duration: '4h' | '6h' | '8h' = '4h'): number | undefined {
  return yacht.prices[duration] ?? yacht.prices['4h'];
}

export function searchYachts(params: YachtSearch = {}): Yacht[] {
  const fleet = loadFleet();
  const area = normalizeArea(params.area);
  const duration = params.duration ?? '4h';
  const query = (params.query || '').trim().toLowerCase();
  const limit = Math.min(Math.max(params.limit ?? 6, 1), 8);

  const matches = fleet.filter((yacht) => {
    if (area && yacht.area !== area && !yacht.area.toLowerCase().includes(area.toLowerCase()) && !area.toLowerCase().includes(yacht.area.toLowerCase())) {
      const loc = `${yacht.area} ${yacht.location}`.toLowerCase();
      if (!loc.includes(area.toLowerCase())) return false;
    }
    if (params.minSize != null && yacht.size < params.minSize) return false;
    if (params.maxSize != null && yacht.size > params.maxSize) return false;
    const price = durationPrice(yacht, duration);
    if (price == null) return false;
    if (params.minPrice != null && price < params.minPrice) return false;
    if (params.maxPrice != null && price > params.maxPrice) return false;
    if (params.guests != null && yacht.capacity != null && yacht.capacity < params.guests) return false;
    if (params.jacuzzi && !yacht.jacuzzi) return false;
    if (params.jetski && !yacht.jetski) return false;
    if (query) {
      const hay = `${yacht.name} ${yacht.brand} ${yacht.category} ${yacht.area} ${yacht.location}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  matches.sort((a, b) => (durationPrice(a, duration) ?? 0) - (durationPrice(b, duration) ?? 0));
  return matches.slice(0, limit);
}

export function formatYacht(yacht: Yacht): Record<string, unknown> {
  return {
    id: yacht.id,
    name: yacht.name,
    brand: yacht.brand,
    size_ft: yacht.size,
    year: yacht.year,
    area: yacht.area,
    category: yacht.category,
    listed_capacity_estimate: yacht.capacity,
    amenities: {
      jacuzzi: yacht.jacuzzi,
      jet_ski: yacht.jetski,
    },
    listed_weekend_rates_usd: yacht.prices,
    listing_path: `#vessel/${yacht.id}`,
  };
}

export function fleetSummary(): string {
  const fleet = loadFleet();
  const sizes = fleet.map((y) => y.size);
  const prices = fleet.map((y) => y.prices['4h']).filter((n): n is number => typeof n === 'number');
  const byArea = new Map<string, number>();
  const bySize = { '21-40ft': 0, '41-70ft': 0, '71-124ft': 0 };
  for (const yacht of fleet) {
    byArea.set(yacht.area, (byArea.get(yacht.area) || 0) + 1);
    if (yacht.size <= 40) bySize['21-40ft']++;
    else if (yacht.size <= 70) bySize['41-70ft']++;
    else bySize['71-124ft']++;
  }
  const areaLines = [...byArea.entries()].sort((a, b) => b[1] - a[1]).map(([area, n]) => `${area}: ${n}`).join('; ');
  return [
    `${fleet.length} listed vessels, ${Math.min(...sizes)}–${Math.max(...sizes)} ft.`,
    `Listed 4-hour weekend rates range from $${Math.min(...prices).toLocaleString()} to $${Math.max(...prices).toLocaleString()} USD.`,
    `Size mix: ${bySize['21-40ft']} day boats 21–40 ft, ${bySize['41-70ft']} yachts 41–70 ft, ${bySize['71-124ft']} larger yachts 71–124 ft.`,
    `${fleet.filter((y) => y.jacuzzi).length} listings mention a jacuzzi; ${fleet.filter((y) => y.jetski).length} mention a jet ski.`,
    `Boarding areas: ${areaLines}.`,
    'Guest counts on listings are editorial estimates, not USCG certificates.',
  ].join(' ');
}
