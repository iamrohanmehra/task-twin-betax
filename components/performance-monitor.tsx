"use client";

import { useEffect, useState } from "react";

interface PerformanceMetrics {
  loadTime: number;
  queryCount: number;
  timestamp: Date;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV === "development") {
      setIsVisible(true);
    }
  }, []);

  const addMetric = (loadTime: number, queryCount: number) => {
    setMetrics((prev) => [
      { loadTime, queryCount, timestamp: new Date() },
      ...prev.slice(0, 9), // Keep last 10 metrics
    ]);
  };

  const averageLoadTime =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length
      : 0;

  const averageQueryCount =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.queryCount, 0) / metrics.length
      : 0;

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Performance Monitor</h3>
        <button
          onClick={() => setMetrics([])}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Avg Load Time:</span>
          <span
            className={
              averageLoadTime < 1000
                ? "text-green-600"
                : averageLoadTime < 2000
                ? "text-yellow-600"
                : "text-red-600"
            }
          >
            {averageLoadTime.toFixed(0)}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span>Avg Queries:</span>
          <span>{averageQueryCount.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span>Samples:</span>
          <span>{metrics.length}</span>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <div className="text-xs text-gray-500 mb-1">Recent:</div>
          {metrics.slice(0, 3).map((metric, i) => (
            <div key={i} className="text-xs flex justify-between">
              <span>{metric.loadTime}ms</span>
              <span>{metric.queryCount} queries</span>
              <span>{metric.timestamp.toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export the addMetric function for use in other components
export const performanceMonitor = {
  addMetric: (loadTime: number, queryCount: number) => {
    // This will be called from other components
    console.log(`Performance: ${loadTime}ms, ${queryCount} queries`);
  },
};
