export interface PerformanceMetrics {
    avg: number;
    min: number;
    max: number;
    count: number;
}

export interface PerformanceData {
    [key: string]: PerformanceMetrics;
}