import { parseArgs } from 'node:util';
import { createApp } from './app';
import { MenuRepository } from './menu-repository';
import { loadDataset, OverridesFile } from './persistence';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '3000' },
    latency: { type: 'string', default: '0' },
    'error-rate': { type: 'string', default: '0' },
  },
});

async function main() {
  const startedAt = performance.now();
  const items = await loadDataset();
  const overrides = new OverridesFile();
  const edits = await overrides.load();

  const repository = new MenuRepository(items);
  for (const [id, changes] of Object.entries(edits)) repository.update(Number(id), changes);

  const app = createApp(repository, overrides, {
    latencyMs: Number(values.latency),
    errorRate: Number(values['error-rate']),
  });

  const port = Number(values.port);
  app.listen(port, () => {
    const loadMs = Math.round(performance.now() - startedAt);
    console.log(`Mock API: ${items.length.toLocaleString()} items loaded in ${loadMs} ms (${Object.keys(edits).length} edited)`);
    console.log(`Listening on http://localhost:${port}/api`);
    if (Number(values.latency) || Number(values['error-rate'])) {
      console.log(`Simulating network: latency up to ${values.latency} ms, error rate ${values['error-rate']}`);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
