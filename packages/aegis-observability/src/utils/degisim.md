 SEMBOL BEYANI — utils/anomaly-algorithms.ts
#	Fonksiyon	İmza	README Kanıtı (birebir alıntı)
1	calculateZScore	(dataPoints: number[], value: number) => number	README: "detectZScoreAnomaly → Z-score algoritması ile anomali tespiti"
2	calculateIQR	(dataPoints: number[]) => { q1: number; q3: number; iqr: number; lowerBound: number; upperBound: number }	README: "detectIQRAnomaly → IQR (Interquartile Range) ile robust anomali tespiti"
3	decomposeSeasonal	(dataPoints: number[], period: number) => { trend: number; seasonal: number[]; residual: number[] }	README: "detectSeasonalAnomaly → Basit Moving Average Decomposition" + 6 adımlı algoritma açık
4	calculateSpikePercentage	(baselineValue: number, peakValue: number) => number	README: "SpikeDetectionResult → increasePercentage: number"
5	normalizeScore	(rawScore: number, weight: number) => number	README: "zScore_normalized = min(100, abs(zScore) * 20)" ve "iqrScore_normalized = min(100, abs(iqrScore) * 25)"
6	mapScoreToSeverity	(score: number) => AnomalySeverity	README: "Severity Mapping → 0-25 low / 26-50 medium / 51-75 high / 76-100 critical"



SEMBOL BEYANI — utils/metric-helpers.ts
#	Fonksiyon	İmza	README Kanıtı (birebir alıntı)
7	getOrCreateCacheEntry	<T>(cache: Map<string, T>, key: string, factory: () => T) => T	README: "Cache Map<string, Metrics> ile tutulur" + "Metric instance'ları singleton'dır"
8	normalizeMetricName	(name: string, prefix: string) => string	README: "metricPrefix: 'aegis_'" + "Metrik adları snake_case"
9	validateLabelSet	(metricName: string, existingKeys: string[], newKeys: string[]) => void	README: "Aynı metric + farklı label key → AppError('LABEL_MISMATCH', ...)"
10	buildCacheKey	(...parts: string[]) => string	README: "Endpoint+method başına singleton (cache'li)"

Bağımlılık Beyanı (Kural 13):

Dosya	Import	Kaynak	Kanıt
anomaly-algorithms.ts	AnomalySeverity	../types/metrics.types	README: "export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'"
metric-helpers.ts	AppError	@aegis/core	README: "core | AppError | (code, message, statusCode, details?) => AppError"