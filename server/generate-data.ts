import { rm } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { generateMenuItems } from './generator';
import { DATASET_FILE, OVERRIDES_FILE, saveDataset } from './persistence';

/** Usage: npm run generate:data -- --count 100000 --seed 7 */
const { values } = parseArgs({
  options: {
    count: { type: 'string', default: '50000' },
    seed: { type: 'string', default: '42' },
  },
});

async function main() {
  const count = Number(values.count);
  const seed = Number(values.seed);
  const items = generateMenuItems(count, seed);
  await saveDataset(items);
  // Edits refer to item ids of the previous dataset, so they no longer apply.
  await rm(OVERRIDES_FILE, { force: true });
  console.log(`Generated ${items.length.toLocaleString()} items (seed ${seed}) -> ${DATASET_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
