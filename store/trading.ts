import { create } from 'zustand';
import { 
  TradingPair, 
  TimeFrame, 
  Signal, 
  MarketData, 
  TradingSettings,
  SignalDirection,
  SignalStrength 
} from '@/types/trading';
import { 
  fetchRealTimeData,
  fetchTraderBalance,
  checkOperatorSiteStatus,
  theOptionAPI
} from '@/lib/theoption-api';
import { 
  sendSignalNotification, 
  showSignalInAppNotification,
  isOptimalTradingTime,
  shouldAvoidNews
} from '@/lib/notifications';

interface TradingStore {
  // State
  selectedPair: TradingPair;
  selectedTimeframe: TimeFrame;
  marketData: Record<TradingPair, MarketData>;
  signals: Signal[];
  settings: TradingSettings;
  isAutoTrading: boolean;
  currentPrice: number;
  
  // Binary Options Specific
  isBinaryMode: boolean;
  countdownActive: boolean;
  lastSignalTime: number;
  
  // API State
  isConnected: boolean;
  lastApiError?: string;
  traderBalance?: number;
  operatorSiteActive: boolean;
  lastStatusCheck?: number;
  
  // Actions
  setSelectedPair: (pair: TradingPair) => void;
  setSelectedTimeframe: (timeframe: TimeFrame) => void;
  updateMarketData: () => void;
  generateSignal: () => void;
  generateBinarySignal: () => void;
  clearSignals: () => void;
  updateSettings: (settings: Partial<TradingSettings>) => void;
  toggleAutoTrading: () => void;
  setBinaryMode: (enabled: boolean) => void;
  
  // API Actions
  initializeAPI: (apiKey?: string) => void;
  refreshBalance: () => void;
  checkPlatformStatus: () => void;
  
  // Utility actions
  startSignalGeneration: () => void;
  stopSignalGeneration: () => void;
}

// 推奨通貨ペア（高勝率）
const RECOMMENDED_PAIRS: TradingPair[] = ['USDJPY', 'EURUSD', 'GBPJPY'];

// デフォルト通貨ペア（Header コンポーネント用）
export const defaultCurrencyPairs = [
  { symbol: 'USDJPY', rate: 85 },
  { symbol: 'EURUSD', rate: 85 },
  { symbol: 'GBPJPY', rate: 80 },
  { symbol: 'EURJPY', rate: 82 },
  { symbol: 'AUDUSD', rate: 78 },
] as const;

// 初期設定
const DEFAULT_SETTINGS: TradingSettings = {
  theoption: {
    apiKey: 'f2971a33515852bd9969ccd9/latest',
    baseUrl: 'https://v6.exchangerate-api.com/v6',
    demoMode: true,
  },
  signals: {
    minConfidence: 70,
    maxSignalsPerHour: 10,
    enableNotifications: true,
    enableSound: true,
    autoTrading: false,
  },
  chart: {
    timeframe: TimeFrame.M1,
    indicators: {
      bollinger: true,
      rsi: true,
      ema20: true,
      volume: true,
    },
    candlestickPatterns: true,
  },
  risk: {
    maxPositionSize: 1000,
    dailyLossLimit: 10000,
    maxConsecutiveLosses: 3,
    stopLossEnabled: false,
  },
};

// Technical indicator calculation functions
function calculateIndicators(ohlcData: any[]): any {
  if (!ohlcData || ohlcData.length === 0) {
    return {
      bollinger: {
        upper: [],
        middle: [],
        lower: [],
        upperExtreme: [],
        lowerExtreme: [],
      },
      ema20: [],
      rsi: [],
    };
  }

  const closes = ohlcData.map(d => d.close);
  const period = 20;
  
  // Simple Moving Average for Bollinger Bands
  const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
  
  // Standard Deviation
  const variance = closes.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  // Bollinger Bands
  const upperBB = sma + (2 * stdDev);
  const lowerBB = sma - (2 * stdDev);
  const upperExtreme = sma + (3 * stdDev);
  const lowerExtreme = sma - (3 * stdDev);
  
  // EMA20 (simplified)
  let ema = closes[0];
  const multiplier = 2 / (period + 1);
  for (let i = 1; i < closes.length; i++) {
    ema = (closes[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  // RSI (simplified)
  const gains = [];
  const losses = [];
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const rs = avgGain / (avgLoss || 1);
  const rsi = 100 - (100 / (1 + rs));

  return {
    bollinger: {
      upper: upperBB,
      middle: sma,
      lower: lowerBB,
      upperExtreme,
      lowerExtreme,
    },
    ema20: ema,
    rsi,
  };
}

// Real-time signal generation using API data
function generateRealTimeSignal(
  pair: TradingPair, 
  ohlcData: any[], 
  indicators: any
): Signal | null {
  if (!ohlcData || ohlcData.length === 0) return null;
  
  const latestCandle = ohlcData[ohlcData.length - 1];
  const currentPrice = latestCandle.close;
  
  // Signal conditions based on technical analysis
  const { bollinger, ema20, rsi } = indicators;
  
  // Analyze price conditions and generate signal
  let direction: SignalDirection | null = null;
  let confidence = 35; // Base confidence for BB extreme + RSI condition
  const reasons: string[] = [];
  
  // HIGH signal conditions
  if (currentPrice <= bollinger.lowerExtreme && rsi <= 30) {
    direction = 'HIGH';
    confidence += 25; // Strong oversold + extreme BB
  }
  // Additional HIGH conditions
  else if (currentPrice <= bollinger.lower && rsi <= 35) {
    direction = 'HIGH';
    confidence += 15; // Moderate oversold
  }
  // LOW signal conditions
  else if (currentPrice >= bollinger.upperExtreme && rsi >= 70) {
    direction = 'LOW';
    confidence += 25; // Strong overbought + extreme BB  
  }
  // Additional LOW conditions
  else if (currentPrice >= bollinger.upper && rsi >= 65) {
    direction = 'LOW';
    confidence += 15; // Moderate overbought
  }
  
  // EMA trend confirmation
  if (Math.abs(currentPrice - ema20) / currentPrice < 0.001) {
    confidence += 20;
    reasons.push('EMA20水平トレンド確認');
  }
  
  // Volume and volatility checks
  if (latestCandle.volume && latestCandle.volume > 0) {
    confidence += 15;
    reasons.push('十分な出来高');
  }
  
  // Minimum confidence threshold
  if (!direction || confidence < 70) {
    return null;
  }
  
  return {
    id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    symbol: pair,
    timeframe: TimeFrame.M1,
    direction,
    strength: confidence >= 85 ? 'STRONG' :
        confidence >= 75 ? 'MEDIUM' : 'WEAK',
    entryPrice: currentPrice,
    expiryTime: 1, // 1 minute
    indicators,
    confidence,
    analysis: reasons.join(', '),
    createdAt: Date.now(),
  };
}

export const useTradingStore = create<TradingStore>((set, get) => {
  let marketDataInterval: NodeJS.Timeout;
  let signalGenerationInterval: NodeJS.Timeout;
  let statusCheckInterval: NodeJS.Timeout;

  return {
    // Initial state
    selectedPair: 'USDJPY',
    selectedTimeframe: TimeFrame.M1,
    marketData: {} as Record<TradingPair, MarketData>,
    signals: [],
    settings: DEFAULT_SETTINGS,
    isAutoTrading: false,
    currentPrice: 0,
    isBinaryMode: true,
    countdownActive: false,
    lastSignalTime: 0,
    
    // API State
    isConnected: false,
    lastApiError: undefined,
    traderBalance: undefined,
    operatorSiteActive: false,
    lastStatusCheck: undefined,

    // Actions
    setSelectedPair: (pair) => {
      set({ selectedPair: pair });
      get().updateMarketData();
    },

    setSelectedTimeframe: (timeframe) => {
      set({ selectedTimeframe: timeframe });
      get().updateMarketData();
    },

    updateMarketData: async () => {
      const { selectedPair, selectedTimeframe } = get();
      
      try {
        // Fetch real-time data from TheOption API
        const { ohlcData, marketData } = await fetchRealTimeData(
          selectedPair, 
          selectedTimeframe, 
          100
        );
        
        // Calculate indicators with real data
        const indicators = calculateIndicators(ohlcData);
        
        // Update market data with real API data
        const updatedData: MarketData = {
          ...marketData,
          ohlc: ohlcData,
          indicators,
        };

        set((state) => ({
          marketData: {
            ...state.marketData,
            [selectedPair]: updatedData,
          },
          currentPrice: marketData.price,
          isConnected: true,
          lastApiError: undefined,
        }));
        
      } catch (error) {
        console.error('Failed to fetch real-time market data:', error);
        set({ 
          isConnected: false,
          lastApiError: error instanceof Error ? error.message : 'API connection failed',
        });
      }
    },

    generateSignal: () => {
      get().generateBinarySignal();
    },

    generateBinarySignal: async () => {
      const { selectedPair, selectedTimeframe, settings, lastSignalTime, marketData, operatorSiteActive } = get();
      
      try {
        // Check if platform is active before generating signals
        if (!operatorSiteActive) {
          console.log('⚠️ TheOption platform is not active - skipping signal generation');
          return;
        }

        // Check signal interval (minimum 2 minutes)
        const timeSinceLastSignal = Date.now() - lastSignalTime;
        if (timeSinceLastSignal < 120000) {
          console.log('シグナル間隔が短すぎます。待機中...');
          return;
        }

        // Trading time checks
        if (!isOptimalTradingTime()) {
          console.log('推奨取引時間外です');
          return;
        }

        if (shouldAvoidNews()) {
          console.log('指標発表時間のため回避します');
          return;
        }

        // Get current market data
        const currentMarketData = marketData[selectedPair];
        if (!currentMarketData || !currentMarketData.ohlc) {
          console.log('マーケットデータが不足しています');
          await get().updateMarketData();
          return;
        }

        // Generate signal using real-time data
        const signal = generateRealTimeSignal(
          selectedPair,
          currentMarketData.ohlc,
          currentMarketData.indicators
        );

        if (signal && settings.signals?.enableNotifications) {
          console.log(`🎯 リアルタイムシグナル生成: ${signal.symbol} ${signal.direction} (信頼度: ${signal.confidence}%)`);
          
          set((state) => ({
            signals: [...state.signals, signal],
            lastSignalTime: Date.now(),
            countdownActive: true,
          }));

          // Send notifications
          sendSignalNotification(signal);
          showSignalInAppNotification(signal);
          
          // End countdown after 15 seconds
          setTimeout(() => {
            set({ countdownActive: false });
          }, 15000);
        }
      } catch (error) {
        console.error('Real-time signal generation failed:', error);
      }
    },

    clearSignals: () => {
      set({ signals: [] });
    },

    updateSettings: (newSettings) => {
      set((state) => ({
        settings: {
          ...state.settings,
          ...newSettings,
        },
      }));
    },

    toggleAutoTrading: () => {
      const { isAutoTrading } = get();
      
      if (!isAutoTrading) {
        get().startSignalGeneration();
      } else {
        get().stopSignalGeneration();
      }
      
      set({ isAutoTrading: !isAutoTrading });
    },

    setBinaryMode: (enabled) => {
      set({ isBinaryMode: enabled });
      
      if (enabled) {
        console.log('🎯 バイナリーオプションモードを有効にしました');
        console.log('📊 リアルタイムAPI使用: TheOption Platform');
        console.log('⏰ 推奨時間: 東京 9-11時、ヨーロッパ 15-17時');
        console.log('💱 推奨通貨ペア: USD/JPY, EUR/USD, GBP/JPY');
      }
    },

    // API Actions
    initializeAPI: (apiKey?: string) => {
      if (apiKey) {
        theOptionAPI.setApiKey(apiKey);
      }
      
      // Test connection with status and balance check
      get().checkPlatformStatus();
      get().refreshBalance();
    },

    refreshBalance: async () => {
      try {
        const balance = await fetchTraderBalance();
        
        if (balance.Success) {
          set({ 
            traderBalance: balance.Balance,
            isConnected: true,
            lastApiError: undefined,
          });
        } else {
          throw new Error(balance.ErrorMessage || 'Failed to fetch balance');
        }
      } catch (error) {
        console.error('Failed to fetch trader balance:', error);
        set({ 
          isConnected: false,
          lastApiError: error instanceof Error ? error.message : 'Balance fetch failed',
        });
      }
    },

    checkPlatformStatus: async () => {
      try {
        const status = await checkOperatorSiteStatus();
        
        if (status.Success) {
          set({ 
            operatorSiteActive: status.IsActive,
            lastStatusCheck: Date.now(),
            lastApiError: status.IsActive ? undefined : 'Platform is not currently active',
          });
          
          if (status.IsActive) {
            console.log('✅ TheOption platform is active and ready for trading');
          } else {
            console.log('⚠️ TheOption platform is currently inactive', status.Message);
          }
        } else {
          throw new Error(status.ErrorMessage || 'Failed to check platform status');
        }
      } catch (error) {
        console.error('Failed to check platform status:', error);
        set({ 
          operatorSiteActive: false,
          lastApiError: error instanceof Error ? error.message : 'Status check failed',
        });
      }
    },

    // Utility actions
    startSignalGeneration: () => {
      const { isBinaryMode } = get();
      
      // Market data periodic update (every 1 second for real-time)
      if (marketDataInterval) clearInterval(marketDataInterval);
      marketDataInterval = setInterval(() => {
        get().updateMarketData();
      }, 1000); // 1秒ごとにリアルタイム更新

      // Platform status check (every 5 minutes)
      if (statusCheckInterval) clearInterval(statusCheckInterval);
      statusCheckInterval = setInterval(() => {
        get().checkPlatformStatus();
      }, 300000); // 5 minutes

      // Signal generation periodic execution
      if (signalGenerationInterval) clearInterval(signalGenerationInterval);
      
      if (isBinaryMode) {
        // Binary mode: Check every minute (high precision)
        signalGenerationInterval = setInterval(() => {
          get().generateBinarySignal();
        }, 60000); // 1 minute
      } else {
        // Normal mode: Every 3 minutes
        signalGenerationInterval = setInterval(() => {
          get().generateSignal();
        }, 180000); // 3 minutes
      }

      console.log(`🟢 リアルタイム自動シグナル生成を開始 (${isBinaryMode ? 'バイナリー' : '通常'}モード)`);
    },

    stopSignalGeneration: () => {
      if (marketDataInterval) {
        clearInterval(marketDataInterval);
        marketDataInterval = undefined as any;
      }
      
      if (signalGenerationInterval) {
        clearInterval(signalGenerationInterval);
        signalGenerationInterval = undefined as any;
      }

      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = undefined as any;
      }
      
      console.log('🔴 自動シグナル生成を停止');
    },
  };
}); 
