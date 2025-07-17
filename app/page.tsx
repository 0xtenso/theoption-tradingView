'use client';

import { useEffect, useState } from 'react';
import { useTradingStore } from '@/store/trading';
import { initializeNotifications } from '@/lib/notifications';
import TradingChart from '@/components/TradingChart';
import SignalPanel from '@/components/SignalPanel';
import Header from '@/components/Header';
import APIStatusIndicator from '@/components/APIStatusIndicator';
import { TrendingUp, TrendingDown, Play, Pause, Settings, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  // Use string instead of NotificationPermission to avoid SSR issues
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { 
    selectedPair,
    currentPrice,
    isAutoTrading,
    isBinaryMode,
    signals,
    operatorSiteActive,
    toggleAutoTrading,
    setBinaryMode,
    updateMarketData,
    generateBinarySignal,
    settings,
    initializeAPI,
  } = useTradingStore();

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 初期化処理
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const initialize = async () => {
      try {
        // 通知権限の初期化
        const permission = await initializeNotifications();
        setNotificationPermission(permission ? 'granted' : 'denied');
        
        // バイナリーモードを有効にする
        setBinaryMode(true);
        
        // API初期化（設定済みのAPIキーがあれば）
        if (settings.theoption.apiKey) {
          console.log('🔧 Initializing with saved API key...');
          initializeAPI(settings.theoption.apiKey);
        } else {
          // APIキーが無い場合は接続テストのみ
          console.log('🔧 Initializing API connection test...');
          initializeAPI();
        }
        
        // マーケットデータの初期更新
        console.log('📊 Loading initial market data...');
        updateMarketData();

        setIsInitialized(true);
        console.log('✅ Application initialization complete');
      } catch (error) {
        console.error('初期化エラー:', error);
        setIsInitialized(true); // エラーでも継続
      }
    };

    initialize();
  }, [isMounted, setBinaryMode, updateMarketData, initializeAPI, settings.theoption.apiKey]);

  // 定期的なマーケットデータ更新
  useEffect(() => {
    if (!isInitialized || !isMounted || typeof window === 'undefined') return;

    // リアルタイムチャート更新 - 毎秒API呼び出しでライブデータを取得
    const interval = setInterval(() => {
      updateMarketData();
    }, 1000); // 1秒ごとにリアルタイム更新

    return () => clearInterval(interval);
  }, [isInitialized, updateMarketData, isMounted]);

  // テストシグナル生成
  const handleTestSignal = () => {
    if (!isMounted || typeof window === 'undefined') return;
    generateBinarySignal();
  };

  // 通知権限要求
  const requestNotificationPermission = async () => {
    if (!isMounted || typeof window === 'undefined' || !('Notification' in window)) return;
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.error('通知権限エラー:', error);
    }
  };

  // Trade click handler for opening jp.theoption.com
  const handleTradeClick = () => {
    // Open TheOption trading page
    window.open('https://jp.theoption.com/trading', '_blank');
  };

  const latestSignal = signals[signals.length - 1];
  const marketData = useTradingStore(state => state.marketData[selectedPair]);

  // SSR中またはマウント前は初期化画面を表示
  if (!isMounted || !isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">TheOption リアルタイム取引ツール</h2>
          <p className="text-gray-600">{!isMounted ? '初期化中...' : 'API接続とデータ読み込み中...'}</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>• API接続状態を確認中</p>
            <p>• プラットフォーム稼働状況を確認中</p>
            <p>• リアルタイムマーケットデータを取得中</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      
      {/* API Status Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <APIStatusIndicator />
              <div className="text-sm text-gray-500">
                現在価格: ¥{currentPrice ? currentPrice.toFixed(3) : '---'}
              </div>
              {/* Platform Status Indicator */}
              {!operatorSiteActive && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  プラットフォーム確認中
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Auto Trading Toggle */}
              <motion.button
                onClick={toggleAutoTrading}
                disabled={!operatorSiteActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isAutoTrading 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : operatorSiteActive 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                whileHover={operatorSiteActive ? { scale: 1.02 } : {}}
                whileTap={operatorSiteActive ? { scale: 0.98 } : {}}
                title={!operatorSiteActive ? 'プラットフォーム稼働待ちのため無効' : ''}
              >
                {isAutoTrading ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isAutoTrading ? '自動取引停止' : '自動取引開始'}
              </motion.button>
              
              {/* Manual Signal Generation */}
              <motion.button
                onClick={generateBinarySignal}
                disabled={!operatorSiteActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  operatorSiteActive 
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                whileHover={operatorSiteActive ? { scale: 1.02 } : {}}
                whileTap={operatorSiteActive ? { scale: 0.98 } : {}}
                title={!operatorSiteActive ? 'プラットフォーム稼働待ちのため無効' : ''}
              >
                <TrendingUp className="w-4 h-4" />
                シグナル生成
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chart Area */}
          <div className="lg:col-span-3">
            <TradingChart />
          </div>
          
          {/* Signal Panel */}
          <div className="lg:col-span-1">
            <SignalPanel onTradeClick={handleTradeClick} />
          </div>
        </div>
      </main>
    </div>
  );
} 