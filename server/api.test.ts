import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { MenuItem, MenuStats, PagedResult } from '../shared/models';
import { createApp } from './app';
import { generateMenuItems } from './generator';
import { MenuRepository } from './menu-repository';
import { OverridesFile } from './persistence';
import { computeStats, parseItemPatch, parseItemQuery } from './query';

function item(fields: Partial<MenuItem>): MenuItem {
  return {
    id: 1,
    name: 'Classic Burger',
    restaurantId: 1,
    restaurantName: 'Burger Republic',
    branchId: 1,
    branchName: 'Downtown',
    category: 'Burgers',
    price: 10,
    available: true,
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...fields,
  };
}

/** Only ids 2, 7 and 8 match every filter used in the combined-filter tests. */
const fixture = (): MenuItem[] => [
  item({ id: 1, name: 'Classic Burger', price: 9.99 }), // below minPrice
  item({ id: 2, name: 'Spicy Burger', price: 12.49 }),
  item({ id: 3, name: 'Double Burger', price: 14.99, available: false }), // unavailable
  item({ id: 4, name: 'Truffle Burger', price: 18.99, branchId: 2 }), // other branch
  item({ id: 5, name: 'Margherita', category: 'Pizza', price: 11.49 }), // name does not match
  item({ id: 6, name: 'Bacon Burger', price: 13.99, restaurantId: 2, branchId: 3 }), // other restaurant
  item({ id: 7, name: 'Smash Burger', price: 16.49 }),
  item({ id: 8, name: 'Veggie Burger', price: 10.99 }),
];

const combinedFilters = {
  search: 'BURGER',
  restaurantId: '1',
  branchId: '1',
  available: 'true',
  minPrice: '10',
  maxPrice: '20',
  sortBy: 'price',
  sortOrder: 'desc',
  pageSize: '2',
};

function parse(raw: Record<string, string>) {
  const result = parseItemQuery(raw);
  assert.ok(result.ok, 'query should be valid');
  return result.value;
}

describe('item query (filtering, sorting, pagination)', () => {
  it('applies search and all filters together, then sorts and paginates', () => {
    const repository = new MenuRepository(fixture());

    const page1 = repository.query(parse({ ...combinedFilters, page: '1' }));
    const page2 = repository.query(parse({ ...combinedFilters, page: '2' }));

    assert.equal(page1.total, 3);
    assert.deepEqual(page1.items.map((i) => i.id), [7, 2]);
    assert.equal(page2.total, 3);
    assert.deepEqual(page2.items.map((i) => i.id), [8]);
  });

  it('re-sorts after an edit changes the sorted field', () => {
    const repository = new MenuRepository(fixture());
    repository.query(parse({ ...combinedFilters, page: '1' })); // builds the cached price order

    repository.update(8, { price: 19.99 });

    const page1 = repository.query(parse({ ...combinedFilters, page: '1' }));
    assert.deepEqual(page1.items.map((i) => i.id), [8, 7]);
  });

  it('rejects invalid query parameters with readable messages', () => {
    const result = parseItemQuery({ page: '0', pageSize: '500', sortBy: 'color', minPrice: '20', maxPrice: '5' });
    assert.ok(!result.ok);
    assert.equal(result.errors.length, 4);
  });

  it('generates the same dataset for the same seed', () => {
    assert.deepEqual(generateMenuItems(200, 7), generateMenuItems(200, 7));
    assert.notDeepEqual(generateMenuItems(200, 7), generateMenuItems(200, 8));
  });
});

describe('stats', () => {
  it('aggregates over the full dataset or a filtered subset', () => {
    const all = computeStats(fixture());
    assert.equal(all.totalItems, 8);
    assert.equal(all.unavailableItems, 1);
    assert.deepEqual(all.byCategory, [
      { category: 'Burgers', count: 7 },
      { category: 'Pizza', count: 1 },
    ]);

    const restaurant2 = computeStats(fixture(), { restaurantId: 2 });
    assert.equal(restaurant2.totalItems, 1);
    assert.equal(restaurant2.averagePrice, 13.99);
  });
});

describe('item patch validation', () => {
  it('accepts a valid price and availability change', () => {
    assert.deepEqual(parseItemPatch({ price: 12.5, available: false }), {
      ok: true,
      value: { price: 12.5, available: false },
    });
  });

  for (const [label, body] of [
    ['negative price', { price: -1 }],
    ['zero price', { price: 0 }],
    ['too many decimals', { price: 1.234 }],
    ['price as text', { price: '12' }],
    ['read-only field', { name: 'Renamed' }],
    ['empty body', {}],
  ] as const) {
    it(`rejects ${label}`, () => assert.equal(parseItemPatch(body).ok, false));
  }
});

describe('HTTP API', () => {
  let baseUrl: string;
  let dataDir: string;
  let close: () => void;

  before(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'menu-api-'));
    const app = createApp(new MenuRepository(fixture()), new OverridesFile(path.join(dataDir, 'overrides.json')));
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api`;
    close = () => server.close();
  });

  after(async () => {
    close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('PATCH updates the item, the stats and the overrides file', async () => {
    const response = await fetch(`${baseUrl}/items/2`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: false }),
    });
    assert.equal(response.status, 200);
    const updated = (await response.json()) as MenuItem;
    assert.equal(updated.available, false);

    const stats = (await (await fetch(`${baseUrl}/stats`)).json()) as MenuStats;
    assert.equal(stats.unavailableItems, 2);

    const saved = JSON.parse(await readFile(path.join(dataDir, 'overrides.json'), 'utf8'));
    assert.equal(saved['2'].available, false);
  });

  it('returns 400 for an invalid price and leaves the item unchanged', async () => {
    const response = await fetch(`${baseUrl}/items/7`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: -5 }),
    });
    assert.equal(response.status, 400);

    const page = (await (await fetch(`${baseUrl}/items?search=smash`)).json()) as PagedResult<MenuItem>;
    assert.equal(page.items[0].price, 16.49);
  });
});
