import express, { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ApiErrorBody } from '../shared/models';
import { MenuRepository } from './menu-repository';
import { OverridesFile } from './persistence';
import { parseFilters, parseItemPatch, parseItemQuery } from './query';

export interface AppOptions {
  /** Each response is delayed by a random 0..latencyMs, so responses can arrive out of order. */
  latencyMs?: number;
  /** Share of requests (0..1) that fail with a simulated 500 error. */
  errorRate?: number;
}

function sendError(res: Response, status: number, message: string, details?: string[]) {
  const body: ApiErrorBody = { message, details };
  res.status(status).json(body);
}

/** Simulates a real network so loading, error and stale-response handling can be seen in the UI. */
function simulateNetwork({ latencyMs = 0, errorRate = 0 }: AppOptions): RequestHandler {
  return (_req, res, next) => {
    const delay = Math.floor(Math.random() * latencyMs);
    setTimeout(() => {
      if (Math.random() < errorRate) sendError(res, 500, 'Simulated server error');
      else next();
    }, delay);
  };
}

export function createApp(
  repository: MenuRepository,
  overrides: OverridesFile,
  options: AppOptions = {},
) {
  const app = express();
  app.use(express.json());

  if (options.latencyMs || options.errorRate) app.use('/api', simulateNetwork(options));

  app.get('/api/items', (req, res) => {
    const query = parseItemQuery(req.query);
    if (!query.ok) return sendError(res, 400, 'Invalid query parameters', query.errors);
    res.json(repository.query(query.value));
  });

  app.patch('/api/items/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || !repository.has(id)) {
      return sendError(res, 404, `Item ${req.params.id} not found`);
    }

    const patch = parseItemPatch(req.body);
    if (!patch.ok) return sendError(res, 400, 'Invalid item update', patch.errors);

    const changes = { ...patch.value, lastUpdated: new Date().toISOString() };
    // Persist first, so the client is only told "saved" once the edit is on disk.
    await overrides.save(id, changes);
    res.json(repository.update(id, changes));
  });

  app.get('/api/stats', (req, res) => {
    const filters = parseFilters(req.query);
    if (!filters.ok) return sendError(res, 400, 'Invalid query parameters', filters.errors);
    res.json(repository.stats(filters.value));
  });

  app.get('/api/filters', (_req, res) => {
    res.json(repository.filterOptions);
  });

  app.use('/api', (_req, res) => sendError(res, 404, 'Endpoint not found'));

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error(error);
    sendError(res, 500, 'Unexpected server error');
  };
  app.use(handleError);

  return app;
}
