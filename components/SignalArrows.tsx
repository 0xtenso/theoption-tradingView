'use client';

import { useEffect, useState } from 'react';
import { useTradingStore } from '@/store/trading';
import { Signal } from '@/types/trading';
import { TrendingUp, TrendingDown, Timer } from 'lucide-react';

interface SignalArrowData {
  id: string;
  x: number;
  y: number;
  direction: 'HIGH' | 'LOW';
  confidence: number;
  timestamp: number;
  countdown?: number; // カウントダウン機能
}

interface DailyHighLow {
  high: number;
  low: number;
  highTime: number;
  lowTime: number;
}

export default function SignalArrows({ chartContainerRef }: { chartContainerRef: React.RefObject<HTMLDivElement> }) {
  const [signalArrows, setSignalArrows] = useState<SignalArrowData[]>([]);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const [dailyHighLow, setDailyHighLow] = useState<DailyHighLow>({ 
    high: 0, 
    low: 0, 
    highTime: 0, 
    lowTime: 0 
  });
  const [isMounted, setIsMounted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const { 
    signals, 
    selectedPair, 
    marketData,
    currentPrice 
  } = useTradingStore();

  const data = marketData[selectedPair];

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // カウントダウン機能の追加
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    // カウントダウンイベントリスナー
    const handleCountdown = (event: Event) => {
      const customEvent = event as CustomEvent<{ signal: Signal; duration: number }>;
      const { duration } = customEvent.detail;
      setCountdown(duration);

      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    };

    window.addEventListener('startTradeCountdown', handleCountdown);
    
    return () => {
      window.removeEventListener('startTradeCountdown', handleCountdown);
    };
  }, [isMounted]);

  // チャートサイズの監視
  useEffect(() => {
    if (!isMounted) return;

    const updateDimensions = () => {
      if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        setChartDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    
    if (!chartContainerRef.current) return;
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(chartContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [chartContainerRef, isMounted]);

  // 日次高安値の計算（動的更新）
  useEffect(() => {
    if (!isMounted || !data?.price || !data?.ohlc || data.ohlc.length === 0) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    // 今日のデータのみをフィルタ
    const todayPrices = data.ohlc
      .filter(h => h.timestamp >= todayTimestamp)
      .concat([{ 
        timestamp: Date.now(), 
        open: data.price,
        high: data.price,
        low: data.price,
        close: data.price,
        volume: 0
      }]); // 現在価格も含む
    
    if (todayPrices.length === 0) return;
    
    let dailyHigh = todayPrices[0].close;
    let dailyLow = todayPrices[0].close;
    let highTime = todayPrices[0].timestamp;
    let lowTime = todayPrices[0].timestamp;
    
    todayPrices.forEach(price => {
      const priceValue = price.close;
      if (priceValue > dailyHigh) {
        dailyHigh = priceValue;
        highTime = price.timestamp;
      }
      if (priceValue < dailyLow) {
        dailyLow = priceValue;
        lowTime = price.timestamp;
      }
    });
    
    setDailyHighLow({ 
      high: dailyHigh, 
      low: dailyLow, 
      highTime, 
      lowTime 
    });
  }, [data, isMounted]);

  // シグナル矢印の生成と位置計算
  useEffect(() => {
    if (!isMounted || signals.length === 0 || chartDimensions.width === 0) return;

    const newArrows: SignalArrowData[] = signals
      .filter(signal => Date.now() - signal.timestamp < 300000) // 5分以内のシグナルのみ
      .map(signal => {
        // チャート内での位置を計算（概算）
        const timeRatio = Math.min((Date.now() - signal.timestamp) / 300000, 1);
        const x = chartDimensions.width * (0.1 + timeRatio * 0.8); // 左10%から右90%の範囲
        
        // 価格に基づくY位置の計算
        const priceRange = dailyHighLow.high - dailyHighLow.low;
        const priceRatio = priceRange > 0 ? 
          (signal.entryPrice - dailyHighLow.low) / priceRange : 0.5;
        const y = chartDimensions.height * (0.9 - priceRatio * 0.8); // 上下10%のマージン

        return {
          id: signal.id,
          x: Math.max(50, Math.min(chartDimensions.width - 50, x)),
          y: Math.max(30, Math.min(chartDimensions.height - 30, y)),
          direction: signal.direction,
          confidence: signal.confidence,
          timestamp: signal.timestamp,
          countdown: signal.timestamp + 15000 > Date.now() ? 
            Math.ceil((signal.timestamp + 15000 - Date.now()) / 1000) : undefined,
        };
      });

    setSignalArrows(newArrows);
  }, [signals, chartDimensions, dailyHighLow, isMounted]);

  // レンダリング
  if (!isMounted || chartDimensions.width === 0 || chartDimensions.height === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 日次高安値ライン */}
      {dailyHighLow.high > 0 && dailyHighLow.low > 0 && (
        <>
          {/* 高値ライン */}
          <div 
            className="absolute left-0 right-0 border-t-2 border-red-500 border-dashed opacity-60"
            style={{ 
              top: `${((dailyHighLow.high - dailyHighLow.low) > 0 ? 
                10 : 50)}%`
            }}
          >
            <span className="absolute right-2 -top-6 text-xs text-red-600 font-medium bg-white px-2 py-1 rounded shadow">
              日次高値: {dailyHighLow.high.toFixed(3)}
            </span>
          </div>
          
          {/* 安値ライン */}
          <div 
            className="absolute left-0 right-0 border-t-2 border-blue-500 border-dashed opacity-60"
            style={{ 
              bottom: `${((dailyHighLow.high - dailyHighLow.low) > 0 ? 
                10 : 50)}%`
            }}
          >
            <span className="absolute right-2 -bottom-6 text-xs text-blue-600 font-medium bg-white px-2 py-1 rounded shadow">
              日次安値: {dailyHighLow.low.toFixed(3)}
            </span>
          </div>
        </>
      )}

      {/* カウントダウン表示 */}
      {countdown !== null && countdown > 0 && (
        <div className="absolute top-4 left-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <Timer size={16} />
            <span className="font-bold">エントリーまで: {countdown}秒</span>
          </div>
        </div>
      )}

      {/* シグナル矢印 */}
      {signalArrows.map((arrow) => (
        <div
          key={arrow.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
            arrow.direction === 'HIGH' 
              ? 'text-green-500' 
              : 'text-red-500'
          }`}
          style={{
            left: `${arrow.x}px`,
            top: `${arrow.y}px`,
            animation: arrow.countdown ? 'bounce 1s infinite' : 'none',
          }}
        >
          <div className="relative">
            {/* 矢印アイコン */}
            <div className={`text-3xl drop-shadow-lg ${
              arrow.countdown ? 'animate-pulse' : ''
            }`}>
              {arrow.direction === 'HIGH' ? '🚀' : '📉'}
            </div>
            
            {/* 信頼度表示 */}
            <div className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 
              text-xs font-bold px-2 py-1 rounded shadow-lg ${
              arrow.direction === 'HIGH' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {arrow.confidence}%
            </div>
            
            {/* カウントダウン */}
            {arrow.countdown && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                {arrow.countdown}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 