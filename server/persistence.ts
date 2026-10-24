import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MenuItem } from '../shared/models';
import { generateMenuItems } from './generator';
import { ItemChanges } from './menu-repository';

export const DATA_DIR = path.join(__dirname, 'data');
export const DATASET_FILE = path.join(DATA_DIR, 'menu-items.json');
export const OVERRIDES_FILE = path.join(DATA_DIR, 'overrides.json');

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export async function saveDataset(items: MenuItem[], file = DATASET_FILE): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(items));
}

/** Loads the generated dataset, generating it first on a fresh clone. */
export async function loadDataset(file = DATASET_FILE): Promise<MenuItem[]> {
  const existing = await readJson<MenuItem[]>(file);
  if (existing) return existing;

  const items = generateMenuItems();
  await saveDataset(items, file);
  return items;
}

/**
 * Edits are stored separately from the generated dataset as a small
 * `{ [id]: changes }` file. Writing it is cheap, the base dataset stays
 * reproducible, and `npm run data:reset` undoes all edits.
 */
export class OverridesFile {
  private overrides: Record<string, ItemChanges> = {};
  private pendingWrite: Promise<void> = Promise.resolve();

  constructor(private readonly file = OVERRIDES_FILE) {}

  async load(): Promise<Record<string, ItemChanges>> {
    this.overrides = (await readJson<Record<string, ItemChanges>>(this.file)) ?? {};
    return this.overrides;
  }

  /** Writes are chained so two quick edits can never interleave on disk. */
  save(id: number, changes: ItemChanges): Promise<void> {
    this.overrides[id] = { ...this.overrides[id], ...changes };
    const snapshot = JSON.stringify(this.overrides, null, 2);
    this.pendingWrite = this.pendingWrite
      .catch(() => undefined)
      .then(async () => {
        await mkdir(path.dirname(this.file), { recursive: true });
        await writeFile(this.file, snapshot);
      });
    return this.pendingWrite;
  }
}
