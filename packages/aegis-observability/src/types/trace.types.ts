// ============================================
// @aegis/observability - Trace Types
// ============================================

// Tek bir işlem birimi (örnek: bir API çağrısı, DB sorgusu, HTTP isteği)
export type Span = {
  spanId: string;                    // Bu span'in kendi ID'si
  traceId: string;                   // Hangi trace'e ait olduğu (tüm zincirin ID'si)
  operationName: string;             // Ne yapıldı? (örn: "GET /api/users", "SELECT * FROM users")
  duration: number;                  // Ne kadar sürdü? (mikrosaniye cinsinden)
  status: 'ok' | 'error';            // Başarılı mı, hata mı?
  tags: Record<string, any>;         // Ekstra bilgiler (http.method, db.instance, vs.)
  logs: SpanLog[];                   // Bu span içinde oluşan loglar
  startTime: Date;                   // Başlangıç zamanı
  endTime: Date;                     // Bitiş zamanı
};

// Bir span içindeki log kaydı (örnek: "DB sorgusu başladı", "Cache hit oldu")
export type SpanLog = {
  timestamp: Date;                   // Log'un oluştuğu an
  fields: Record<string, any>;       // Log içeriği (message, error, vs.)
};

// Başka bir servise yapılan çağrı (servisler arası iletişim)
export type ServiceCall = {
  serviceName: string;               // Hangi servis çağrıldı? (örn: "payment-service")
  operationName: string;             // Hangi operasyon? (örn: "processPayment")
  duration: number;                  // Ne kadar sürdü? (ms)
  status: 'ok' | 'error';            // Başarılı mı, hata mı?
};

// Bir trace'in tam detayları (tüm zincir)
export type TraceDetails = {
  traceId: string;                   // Trace ID (tüm istek zincirinin ID'si)
  spans: Span[];                     // Bu trace içindeki tüm span'ler (servisler arası zincir)
  duration: number;                  // Trace'in toplam süresi (ms)
  status: 'success' | 'error';       // Genel durum
  serviceCalls: ServiceCall[];       // Zincir içindeki tüm servis çağrıları
  timestamp: Date;                   // Trace'in başladığı zaman
};

// Uygulama logu (servislerin yazdığı standart loglar)
export type LogEntry = {
  timestamp: Date;                   // Log zamanı
  level: string;                     // Log seviyesi (info, warn, error, debug)
  message: string;                   // Log mesajı
  traceId?: string;                  // Hangi trace'e ait? (opsiyonel - bağlantı için)
  spanId?: string;                   // Hangi span'e ait? (opsiyonel)
  [key: string]: any;                // Ekstra alanlar (userID, ip, vs.)
};

// Trace ve log'ları birleştirilmiş veri
export type CorrelatedData = {
  traceId: string;                   // Hangi trace?
  spans: Span[];                     // O trace'e ait span'ler
  logs: LogEntry[];                  // O trace'le ilgili log'lar
  correlatedEvents: Array<{          // Span ve log'ların eşleştirilmiş hali
    span: Span;                      // Bir span
    logs: LogEntry[];                // O span ile ilgili log'lar
  }>;
};

// Prometheus sorgusu (metrik toplama sistemi)
export type PrometheusQuery = {
  expression: string;                // PromQL sorgusu (örn: "http_requests_total{status='500'}")
  start: Date;                       // Sorgu başlangıç zamanı
  end: Date;                         // Sorgu bitiş zamanı
  step?: string;                     // Veri aralığı (örn: "30s", "1m")
};

// Prometheus'dan dönen metrik sonucu
export type MetricResult = {
  metric: Record<string, string>;    // Metrik etiketleri (örn: { endpoint: "/api/users", method: "GET" })
  value: number[];                   // [timestamp, value] formatında (örnek: [1640995200, 42])
  timestamps: Date[];                // Zaman damgaları dizisi
};