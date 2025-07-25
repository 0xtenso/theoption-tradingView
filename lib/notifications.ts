import { Signal, NotificationMessage, SignalDirection } from '@/types/trading';
import { formatPrice, formatTime } from '@/lib/utils';

// Simple fallback functions to prevent errors
const vibrate = (pattern: number[]) => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
};

// jp.theoption.com プラットフォームのURL
const THEOPTION_URLS = {
  web: 'https://v6.exchangerate-api.com/v6/d90d9a7dc56649598a43200d/latest/USD',
  mobile: 'https://v6.exchangerate-api.com/v6/d90d9a7dc56649598a43200d/latest/USD',
  trade: {
    web: 'https://v6.exchangerate-api.com/v6/d90d9a7dc56649598a43200d/latest/USD',
    mobile: 'https://v6.exchangerate-api.com/v6/d90d9a7dc56649598a43200d/latest/USD',
  },
  direct: 'https://v6.exchangerate-api.com/v6/d90d9a7dc56649598a43200d/latest/USD', // 直接取引画面
};

let notificationPermission: string = 'default'; // Use string instead of NotificationPermission for SSR
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

// Browser environment check helper
function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

// 通知の初期化
export async function initializeNotifications(): Promise<boolean> {
  // ブラウザ環境チェック
  if (!isBrowserEnvironment() || !('Notification' in window)) {
    console.warn('通知がサポートされていません');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    return permission === 'granted';
  } catch (error) {
    console.error('通知初期化エラー:', error);
    return false;
  }
}

// jp.theoption.comリンク生成
function generateTheOptionLink(symbol: string, direction: SignalDirection): string {
  try {
    // 新しい取引画面URLを返す
    return 'https://jp.theoption.com/trading';
  } catch (error) {
    console.error('jp.theoption.comリンク生成エラー:', error);
    return 'https://jp.theoption.com/trading';
  }
}

// シグナル通知の送信（jp.theoption.com用）
export function sendSignalNotification(signal: Signal): void {
  // ブラウザ環境チェック
  if (!isBrowserEnvironment() || !('Notification' in window)) {
    console.log('通知スキップ: ブラウザ環境ではありません');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('通知スキップ: 権限がありません');
    return;
  }

  try {
    // jp.theoption.comへの直接リンク生成
    const tradeUrl = generateTheOptionLink(signal.symbol, signal.direction);
    
    const title = `${signal.symbol} ${signal.direction} シグナル`;
    const body = `信頼度: ${signal.confidence}% | エントリー価格: ${signal.entryPrice.toFixed(3)}
手法: 順方向×逆装着の反転ゾーン一点突破
1分取引推奨`;
    
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: signal.id,
      requireInteraction: true,
      data: {
        url: tradeUrl,
        signalId: signal.id,
        platform: 'theoption',
      }
    });

    notification.onclick = () => {
      if (isBrowserEnvironment()) {
        // jp.theoption.comの取引画面を開く
        window.open(tradeUrl, '_blank', 'noopener,noreferrer');
        notification.close();
        
        // カウントダウンイベントを発火
        const countdownEvent = new CustomEvent('startTradeCountdown', {
          detail: { signal, duration: 15 }
        });
        window.dispatchEvent(countdownEvent);
      }
    };

    // 信頼度に応じてバイブレーション
    if (signal.confidence >= 85 && isBrowserEnvironment() && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
      } catch (e) {
        // バイブレーション失敗を無視
      }
    }

    // 通知音（可能な場合）
    playNotificationSound(signal.confidence);
    
  } catch (error) {
    console.error('通知送信エラー:', error);
  }
}

// アプリ内通知表示
export function showSignalInAppNotification(signal: Signal): void {
  // ブラウザ環境チェック
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    console.log(`${signal.symbol} ${signal.direction} シグナル (信頼度: ${signal.confidence}%)`);
    
    // カスタムイベントを発火（UI側でキャッチ可能）
    if (isBrowserEnvironment() && window.dispatchEvent) {
      const event = new CustomEvent('signalGenerated', {
        detail: signal
      });
      window.dispatchEvent(event);
    }
  } catch (error) {
    console.error('アプリ内通知エラー:', error);
  }
}

// 通知音再生
function playNotificationSound(confidence: number): void {
  // ブラウザ環境チェック
  if (!isBrowserEnvironment() || typeof Audio === 'undefined') {
    return;
  }

  try {
    // 信頼度に応じて音を変える
    const frequency = confidence >= 85 ? 800 : 600;
    
    // Web Audio APIが利用可能な場合
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  } catch (error) {
    console.error('音声再生エラー:', error);
  }
}

// 最適な取引時間判定
export function isOptimalTradingTime(): boolean {
  try {
    if (!isBrowserEnvironment()) {
      return true; // SSR時は常にtrue
    }

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;
    
    // 東京時間 9:00-11:00 (540-660分)
    const tokyoStart = 9 * 60;
    const tokyoEnd = 11 * 60;
    
    // ヨーロッパ時間 15:00-17:00 (900-1020分)  
    const europeStart = 15 * 60;
    const europeEnd = 17 * 60;
    
    return (currentTime >= tokyoStart && currentTime <= tokyoEnd) ||
           (currentTime >= europeStart && currentTime <= europeEnd);
  } catch (error) {
    console.error('取引時間判定エラー:', error);
    return true;
  }
}

// 指標発表回避
export function shouldAvoidNews(): boolean {
  try {
    if (!isBrowserEnvironment()) {
      return false; // SSR時は常にfalse
    }

    const now = new Date();
    const day = now.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // 週末は取引を避ける
    if (day === 0 || day === 6) {
      return true;
    }
    
    // 主要指標発表時間（大まかな時間）
    const avoidTimes = [
      { hour: 8, minute: 30 }, // 日本GDP等
      { hour: 10, minute: 30 }, // 中国指標
      { hour: 16, minute: 30 }, // 独指標
      { hour: 18, minute: 30 }, // 欧指標  
      { hour: 21, minute: 30 }, // 米指標
      { hour: 23, minute: 30 }, // 米指標
    ];
    
    // 指標発表前後30分は避ける
    return avoidTimes.some(avoidTime => {
      const avoidMinutes = avoidTime.hour * 60 + avoidTime.minute;
      const currentMinutes = hour * 60 + minute;
      return Math.abs(currentMinutes - avoidMinutes) <= 30;
    });
  } catch (error) {
    console.error('指標回避判定エラー:', error);
    return false;
  }
}

// テスト通知送信
export function sendTestNotification(): void {
  if (!isBrowserEnvironment() || !('Notification' in window)) {
    console.warn('通知がサポートされていません');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('通知権限がありません');
    return;
  }

  try {
    const notification = new Notification('🎯 テスト通知', {
      body: 'バイナリーオプションシグナルツールが正常に動作しています',
      icon: '/favicon.ico',
    });

    setTimeout(() => {
      notification.close();
    }, 3000);
  } catch (error) {
    console.error('テスト通知エラー:', error);
  }
}

// アプリ内通知の表示
export function showInAppNotification(message: string, type: 'success' | 'warning' | 'error' = 'success'): void {
  if (!isBrowserEnvironment() || typeof document === 'undefined') {
    console.log(`アプリ内通知: ${message}`);
    return;
  }
  
  try {
    // カスタムトースト通知を表示
    const toast = document.createElement('div');
    toast.className = `
      fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm
      ${type === 'success' ? 'bg-green-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}
      text-white font-medium animate-slide-down
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 3秒後に自動削除
    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  } catch (error) {
    console.error('アプリ内通知の表示に失敗:', error);
  }
}

// 通知設定の確認
export function checkNotificationSupport(): {
  supported: boolean;
  permission: string; // Changed from NotificationPermission for SSR compatibility
  serviceWorker: boolean;
} {
  if (!isBrowserEnvironment()) {
    return {
      supported: false,
      permission: 'default',
      serviceWorker: false,
    };
  }
  
  return {
    supported: 'Notification' in window,
    permission: notificationPermission,
    serviceWorker: 'serviceWorker' in navigator,
  };
}

// 通知権限の再要求
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isBrowserEnvironment() || !('Notification' in window)) {
    return false;
  }
  
  try {
    notificationPermission = await Notification.requestPermission();
    return notificationPermission === 'granted';
  } catch (error) {
    console.error('通知権限要求エラー:', error);
    return false;
  }
}

// 全通知のクリア
export function clearAllNotifications(): void {
  if (!isBrowserEnvironment() || !serviceWorkerRegistration) {
    return;
  }
  
  try {
    serviceWorkerRegistration.getNotifications().then(notifications => {
      notifications.forEach(notification => notification.close());
    });
  } catch (error) {
    console.error('通知クリアエラー:', error);
  }
}

// デスクトップ通知のスタイル設定
export function createRichNotification(signal: Signal): NotificationOptions {
  const direction = signal.direction === 'HIGH' ? '📈' : '📉';
  const confidence = signal.confidence >= 80 ? '🔥' : signal.confidence >= 60 ? '⚡' : '💡';
  
  return {
    body: `${direction} ${signal.symbol} ${signal.direction}
${confidence} 信頼度: ${signal.confidence}%
価格: ${formatPrice(signal.entryPrice, signal.symbol)}
${formatTime(signal.timestamp)}`,
    icon: '/icons/signal-icon.png',
    tag: `signal-${signal.symbol}-${signal.timeframe}`,
  };
}

// 通知の統計情報
interface NotificationStats {
  sent: number;
  clicked: number;
  dismissed: number;
  lastSent: number;
}

let notificationStats: NotificationStats = {
  sent: 0,
  clicked: 0,
  dismissed: 0,
  lastSent: 0,
};

export function updateNotificationStats(action: 'sent' | 'clicked' | 'dismissed'): void {
  if (!isBrowserEnvironment()) {
    return;
  }
  
  notificationStats[action]++;
  if (action === 'sent') {
    notificationStats.lastSent = Date.now();
  }
  
  // ローカルストレージに保存
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('notification_stats', JSON.stringify(notificationStats));
    } catch (error) {
      console.error('通知統計の保存に失敗:', error);
    }
  }
}

export function getNotificationStats(): NotificationStats {
  if (!isBrowserEnvironment() || typeof localStorage === 'undefined') {
    return { ...notificationStats };
  }
  
  try {
    const saved = localStorage.getItem('notification_stats');
    if (saved) {
      notificationStats = JSON.parse(saved);
    }
  } catch (error) {
    console.error('通知統計の読み込みに失敗:', error);
  }
  
  return { ...notificationStats };
} 