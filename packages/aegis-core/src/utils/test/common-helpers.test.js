// test-common-helpers.ts
import { delay, toJSON } from './common-helpers.js';

async function testHelpers() {
  console.log('🚀 Debug test başlıyor...\n');

  // ============ DELAY TEST ============
  console.log('⏳ Delay testi başlıyor...');
  // 🛑 Breakpoint koy - 1
  await delay(1000);
  console.log('✅ 1 saniye geçti');
  
  // 🛑 Breakpoint koy - 2
  await delay(500);
  console.log('✅ 500ms geçti');
  
  // Aynı ms tekrar çağır (cache kontrolü)
  // 🛑 Breakpoint koy - 3
  await delay(1000);
  console.log('✅ 1 saniye tekrar geçti (cache)\n');

  // ============ TOJSON TEST ============
  console.log('📦 toJSON testi başlıyor...');
  
  // Normal obje testi
  const normalData = {
    name: 'Kanka',
    age: 25,
    date: new Date(),
    hobbies: ['coding', 'gaming'],
    config: {
      env: 'development',
      debug: true
    }
  };
  
  // 🛑 Breakpoint koy - 4
  const normalJson = toJSON(normalData, { pretty: true });
  console.log('Normal obje JSON:\n', normalJson, '\n');

  // ============ CIRCULAR REFERANS TEST ============
  console.log('🔄 Circular referans testi...');
  
  const circularData: any = {
    name: 'Circular Test',
    created: new Date()
  };
  circularData.self = circularData; // Kendine referans
  circularData.map = new Map([['key', 'value']]);
  circularData.set = new Set([1, 2, 3]);
  
  // 🛑 Breakpoint koy - 5
  const circularJson = toJSON(circularData, { pretty: true, maxDepth: 3 });
  console.log('Circular JSON:\n', circularJson, '\n');

  // ============ MAX DEPTH TEST ============
  console.log('📊 Max depth testi...');
  
  const deepData = {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              message: 'Çok derin!'
            }
          }
        }
      }
    }
  };
  
  // 🛑 Breakpoint koy - 6
  const deepJson = toJSON(deepData, { pretty: true, maxDepth: 2 });
  console.log('Depth 2 ile:\n', deepJson, '\n');
  
  // 🛑 Breakpoint koy - 7
  const deepJsonFull = toJSON(deepData, { pretty: true });
  console.log('Sınırsız depth ile:\n', deepJsonFull, '\n');

  // ============ EDGE CASE TEST ============
  console.log('🎯 Edge case testi...');
  
  const edgeData = {
    undefined: undefined,
    null: null,
    nan: NaN,
    infinity: Infinity,
    bigint: 12345678901234567890n,
    symbol: Symbol('test'),
    regex: /test/g,
    error: new Error('Test hatası')
  };
  
  // 🛑 Breakpoint koy - 8
  const edgeJson = toJSON(edgeData, { pretty: true });
  console.log('Edge case JSON:\n', edgeJson, '\n');

  console.log('✅ Tüm testler tamamlandı!');
}

// Hata yakalama
testHelpers().catch((error) => {
  console.error('❌ Test hatası:', error);
});