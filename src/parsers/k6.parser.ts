export interface K6Metric {
  avg: number;
  min: number;
  max: number;
  p90: number;
  p95: number;
}

export interface K6Report {
  type: 'k6';
  stats: {
    totalRequests: number;
    failedRequests: number;
    successRate: number;
    duration: number;
  };
  metrics: {
    httpReqDuration: K6Metric;
    httpReqFailed: number;
    httpReqs: number;
  };
}

export function parseK6(rawJson: Record<string, unknown>): K6Report {
  const metrics = rawJson['metrics'] as Record<string, Record<string, number>>;

  const httpReqDuration = metrics['http_req_duration'] || {};
  const httpReqFailed = metrics['http_req_failed'] || {};
  const httpReqs = metrics['http_reqs'] || {};

  const totalRequests = httpReqs['count'] || 0;
  const failedRate = httpReqFailed['rate'] || 0;
  const failedRequests = Math.round(totalRequests * failedRate);
  const successRate = Math.round((1 - failedRate) * 100);

  return {
    type: 'k6',
    stats: {
      totalRequests,
      failedRequests,
      successRate,
      duration: httpReqDuration['avg'] || 0,
    },
    metrics: {
      httpReqDuration: {
        avg: httpReqDuration['avg'] || 0,
        min: httpReqDuration['min'] || 0,
        max: httpReqDuration['max'] || 0,
        p90: httpReqDuration['p(90)'] || 0,
        p95: httpReqDuration['p(95)'] || 0,
      },
      httpReqFailed: failedRate,
      httpReqs: totalRequests,
    },
  };
}
