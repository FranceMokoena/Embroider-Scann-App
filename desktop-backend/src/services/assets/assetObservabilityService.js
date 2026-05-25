const SLOW_QUERY_MS = Number(process.env.ASSET_API_SLOW_QUERY_MS || 500);

export const createRequestTrace = req => ({
  requestId: req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  path: req.originalUrl,
  method: req.method,
  user: req.user?.username || null,
});

export const runWithAssetApiMetrics = async (operation, trace, fn) => {
  const startedAt = Date.now();

  try {
    const result = await fn();
    const durationMs = Date.now() - startedAt;
    const level = durationMs >= SLOW_QUERY_MS ? 'asset_api_slow_query' : 'asset_api_request';

    console.log(JSON.stringify({
      service: 'desktop-asset-api',
      event: level,
      operation,
      durationMs,
      timestamp: new Date().toISOString(),
      ...trace,
    }));

    return { result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(JSON.stringify({
      service: 'desktop-asset-api',
      event: 'asset_api_error',
      operation,
      durationMs,
      error: error.message,
      timestamp: new Date().toISOString(),
      ...trace,
    }));
    throw error;
  }
};
