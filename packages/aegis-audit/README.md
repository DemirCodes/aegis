📋 4 YENİ FONKSİYON PLANLAMASI
1. retryFailedAuditLog(auditLogId: string): Promise<boolean>
Amaç: status: 'failed' olan bir audit log'u tekrar yazmayı dener.

Mantık:

ID ile failed log'u bul

Bulunamazsa false dön

Zaten completed ise false dön (retry gerekmez)

Aynı veriyi kullanarak yeni kayıt oluştur, status: 'completed' yap

Eski failed kaydı sil veya işaretle

Başarılıysa true dön

Kullanım:

typescript
const retried = await service.retryFailedAuditLog('audit_123abc');
// true → log başarıyla tekrar yazıldı
2. purgeOldAuditLogs(olderThan: Date): Promise<number>
Amaç: Belirli tarihten daha eski audit log'ları siler.

Mantık:

olderThan tarihini validate et

timestamp < olderThan koşuluyla toplu sil

Silinen kayıt sayısını dön

Güvenlik: olderThan gelecekte olamaz

Kullanım:

typescript
const deletedCount = await service.purgeOldAuditLogs(new Date('2024-01-01'));
// 1250 → 2024'ten önceki 1250 log silindi
3. getAuditLogByCorrelationId(correlationId: string): Promise<AuditLog[]>
Amaç: Aynı correlationId'ye sahip tüm log'ları getirir.

Mantık:

correlationId validate et

where: { correlationId } ile sorgula

timestamp sıralı dön

Max 500 kayıt

Kullanım:

typescript
const logs = await service.getAuditLogByCorrelationId('trace-xyz-123');
// Aynı request'in tüm audit izi
4. bulkCreateAuditLogs(logs: Array<...>): Promise<number>
Amaç: Birden fazla audit log'u tek seferde yazar.

Mantık:

logs array'ini validate et (boş değil, max 1000)

Her log için generateAuditId, generateChangesSummary, maskSensitiveData uygula

prisma.auditLog.createMany() ile toplu yaz

Yazılan kayıt sayısını dön

Kullanım:

typescript
const count = await service.bulkCreateAuditLogs([
  { userId: 'user-1', entityType: 'User', action: 'CREATE', changes: {...} },
  { userId: 'user-2', entityType: 'Product', action: 'UPDATE', changes: {...} },
]);
// 2 → 2 log yazıldı
📊 TİP GEREKSİNİMLERİ
Yeni tip tanımları:

typescript
// types/audit.types.ts'e eklenecek:

export type BulkCreateAuditLogInput = {
  userId: string;
  entityType: string;
  action: AuditAction;
  changes: Record<string, any>;
  metadata?: AuditMetadata;
};