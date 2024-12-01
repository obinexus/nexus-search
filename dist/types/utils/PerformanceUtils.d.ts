export declare class PerformanceMonitor {
    private metrics;
    constructor();
    measure<T>(name: string, fn: () => Promise<T>): Promise<T>;
    private recordMetric;
    getMetrics(): Record<string, {
        avg: number;
        min: number;
        max: number;
        count: number;
    }>;
    private average;
    clear(): void;
}
