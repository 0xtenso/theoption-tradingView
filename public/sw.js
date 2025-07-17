// Service Worker for TheOption Signal Tool
const CACHE_NAME = 'theoption-signal-v1';
const urlsToCache = [
  '/',
  '/icons/signal-icon.png',
  '/icons/badge-icon.png',
  '/icons/trade-icon.png',
  '/icons/chart-icon.png',
  '/icons/close-icon.png',
  '/icons/dismiss-icon.png',
  '/sounds/notification.mp3',
];

// TheOption URLs
const THEOPTION_URLS = {
  web: 'https://jp.theoption.com/trading',
  mobile: 'https://jp.theoption.com/trading',
};

// Install event - キャッシュの初期化
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache initialization failed:', error);
      })
  );
  
  // 新しいService Workerを即座にアクティブ化
  self.skipWaiting();
});

// Activate event - 古いキャッシュの削除
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 全てのクライアントをコントロール
  self.clients.claim();
});

// Fetch event - ネットワークリクエストのインターセプト
self.addEventListener('fetch', (event) => {
  // GETリクエストのみキャッシュ対象
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにある場合はそれを返す
        if (response) {
          return response;
        }
        
        // ネットワークからフェッチ
        return fetch(event.request)
          .then((response) => {
            // レスポンスが無効な場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // ネットワークエラーの場合、オフラインページを返す
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Push event - プッシュ通知の受信
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'TheOption シグナル',
    body: '新しいトレーディングシグナルが発生しました',
    icon: '/icons/signal-icon.png',
    badge: '/icons/badge-icon.png',
    data: { url: THEOPTION_URLS.web }
  };
  
  // プッシュデータがある場合は解析
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Push data parsing failed:', error);
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    image: notificationData.image,
    data: notificationData.data,
    actions: [
      {
        action: 'trade',
        title: 'TheOptionで取引',
        icon: '/icons/trade-icon.png'
      },
      {
        action: 'dismiss',
        title: '閉じる',
        icon: '/icons/close-icon.png'
      }
    ],
    requireInteraction: notificationData.priority === 'high',
    silent: false,
    timestamp: Date.now(),
    tag: notificationData.tag || 'default-signal',
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click event - 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  let url = data.url || THEOPTION_URLS.web;
  
  // アクションに応じてURLを決定
  switch (action) {
    case 'trade':
      // TheOptionで取引
      url = data.url || THEOPTION_URLS.web;
      break;
    case 'dismiss':
      // 何もしない
      return;
    default:
      // デフォルト：TheOptionを開く
      url = data.url || THEOPTION_URLS.web;
  }
  
  // 既存のウィンドウがあるかチェック
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 同じオリジンのクライアントを探す
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // 既存のウィンドウにフォーカス
            return client.focus().then(() => {
              // メッセージを送信して画面更新
              return client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                action: action,
                url: url,
                data: data
              });
            });
          }
        }
        
        // 新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
      .catch((error) => {
        console.error('Notification click handling failed:', error);
      })
  );
});

// Notification close event - 通知が閉じられた時
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // 統計情報の更新（必要に応じて）
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_CLOSED',
          data: event.notification.data
        });
      });
    })
  );
});

// Background sync - バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'sync-signals') {
    event.waitUntil(syncSignals());
  }
});

// Message event - クライアントからのメッセージ
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// ヘルパー関数
async function syncSignals() {
  try {
    // バックグラウンドでシグナルデータを同期
    const response = await fetch('/api/signals/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const signals = await response.json();
      console.log('Signals synced:', signals.length);
      
      // 新しいシグナルがあれば通知
      signals.forEach((signal) => {
        if (signal.isNew) {
          showSignalNotification(signal);
        }
      });
    }
  } catch (error) {
    console.error('Signal sync failed:', error);
  }
}

function showSignalNotification(signal) {
  const title = `🚨 ${signal.symbol} ${signal.direction} シグナル`;
  const body = `信頼度: ${signal.confidence}%\nエントリー価格: ${signal.entryPrice}`;
  
  const options = {
    body: body,
    icon: '/icons/signal-icon.png',
    badge: '/icons/badge-icon.png',
    data: {
      signalId: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      url: generateTheOptionUrl(signal)
    },
    actions: [
      { action: 'trade', title: 'TheOptionで取引' },
      { action: 'dismiss', title: '閉じる' }
    ],
    tag: `signal-${signal.id}`,
    requireInteraction: signal.confidence >= 80
  };
  
  return self.registration.showNotification(title, options);
}

function generateTheOptionUrl(signal) {
  const isMobile = true; // Service Workerではモバイル版を優先
  const baseUrl = isMobile ? THEOPTION_URLS.mobile : THEOPTION_URLS.web;
  
  const params = new URLSearchParams({
    pair: signal.symbol,
    direction: signal.direction.toLowerCase(),
    timeframe: signal.timeframe,
    entry_price: signal.entryPrice.toString(),
    signal_id: signal.id,
    source: 'signal_tool'
  });
  
  return `${baseUrl}?${params.toString()}`;
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// エラーハンドリング
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('Service Worker loaded successfully'); 