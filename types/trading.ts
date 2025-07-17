// Trading Types for TheOption Signal Tool

export type TradingPair = 
  | 'USDJPY' 
  | 'EURUSD' 
  | 'GBPJPY' 
  | 'EURJPY' 
  | 'AUDUSD' 
  | 'GBPUSD' 
  | 'USDCAD' 
  | 'USDCHF' 
  | 'NZDUSD' 
  | 'EURGBP';

export enum TimeFrame {
  M1 = '1m',
  M5 = '5m',
  M15 = '15m',
  M30 = '30m',
  H1 = '1h',
  H4 = '4h',
  D1 = '1d'
}

export type SignalDirection = 'HIGH' | 'LOW';

export type SignalStrength = 'WEAK' | 'MEDIUM' | 'STRONG';

export interface OHLC {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketData {
  symbol: TradingPair;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
  change: number;
  changePercent: number;
  volume?: number;
  ohlc?: OHLC[];
  indicators?: {
    bollinger?: {
      upper: number;
      middle: number;
      lower: number;
      upperExtreme: number;
      lowerExtreme: number;
    };
    ema20?: number;
    rsi?: number;
  };
}

export interface Signal {
  id: string;
  symbol: TradingPair;
  direction: SignalDirection;
  entryPrice: number;
  exitPrice?: number;
  confidence: number;
  strength: SignalStrength;
  timestamp: number;
  createdAt: number;
  expiryTime: number;
  timeframe: TimeFrame;
  indicators: {
    rsi?: number;
    bollingerBands?: {
      upper: number;
      middle: number;
      lower: number;
    };
    ema20?: number;
    volume?: number;
  };
  analysis?: string;
  result?: 'WIN' | 'LOSS' | 'TIE';
  payout?: number;
}

export interface TradingSettings {
  theoption: {
    apiKey?: string;
    baseUrl: string;
    demoMode: boolean;
  };
  signals: {
    minConfidence: number;
    maxSignalsPerHour: number;
    enableNotifications: boolean;
    enableSound: boolean;
    autoTrading: boolean;
  };
  chart: {
    timeframe: TimeFrame;
    indicators: {
      bollinger: boolean;
      rsi: boolean;
      ema20: boolean;
      volume: boolean;
    };
    candlestickPatterns: boolean;
  };
  risk: {
    maxPositionSize: number;
    dailyLossLimit: number;
    maxConsecutiveLosses: number;
    stopLossEnabled: boolean;
  };
}

export interface NotificationMessage {
  id: string;
  title: string;
  body: string;
  type: 'signal' | 'alert' | 'info' | 'error';
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export interface APIStatus {
  connected: boolean;
  lastUpdate: number;
  error?: string;
  latency?: number;
}

export interface TraderBalance {
  balance: number;
  currency: string;
  demo: boolean;
  lastUpdate: number;
}

export interface CurrencyPair {
  symbol: TradingPair;
  name: string;
  rate: number;
  minAmount: number;
  maxAmount: number;
  enabled: boolean;
}

export interface ChartConfig {
  type: 'line' | 'candlestick';
  timeframe: TimeFrame;
  indicators: string[];
  colors: {
    background: string;
    grid: string;
    bullish: string;
    bearish: string;
    signal: string;
  };
}

export interface BacktestResult {
  period: {
    start: number;
    end: number;
  };
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  signals: Signal[];
}

export interface PerformanceMetrics {
  totalSignals: number;
  accuracy: number;
  profitability: number;
  averageConfidence: number;
  bestPair: TradingPair;
  bestTimeframe: TimeFrame;
  dailyStats: {
    date: string;
    signals: number;
    wins: number;
    profit: number;
  }[];
}

// API Response Types
export interface TheOptionResponse<T = any> {
  Success: boolean;
  ErrorMessage?: string;
  Data?: T;
}

export interface TheOptionBalance extends TheOptionResponse {
  Balance: number;
  Currency: string;
  Demo: boolean;
}

export interface TheOptionQuote {
  Symbol: string;
  Bid: number;
  Ask: number;
  Timestamp: number;
}

export interface TheOptionChartData extends TheOptionResponse {
  Bars: {
    Timestamp: number;
    Open: number;
    High: number;
    Low: number;
    Close: number;
    Volume: number;
  }[];
}

export interface TheOptionOperatorSiteStatus extends TheOptionResponse {
  IsActive: boolean;
  Message?: string;
}

// Utility Types
export type ChartDataPoint = {
  x: number;
  y: number;
  timestamp?: number;
};

export type SignalFilter = {
  pair?: TradingPair;
  direction?: SignalDirection;
  minConfidence?: number;
  timeframe?: TimeFrame;
  dateRange?: {
    start: number;
    end: number;
  };
};

export type MarketStatus = 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS' | 'HOLIDAY';

export interface MarketSession {
  name: string;
  timezone: string;
  open: string; // HH:mm format
  close: string; // HH:mm format
  active: boolean;
}

export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  strength: number; // 0-100
}

export interface CandlestickPattern {
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  description: string;
}

export interface NewsEvent {
  id: string;
  title: string;
  currency: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  actual?: number;
  forecast?: number;
  previous?: number;
  timestamp: number;
}

// Store Types
export interface TradingState {
  // Market Data
  selectedPair: TradingPair;
  selectedTimeframe: TimeFrame;
  marketData: Record<TradingPair, MarketData>;
  currentPrice: number;
  
  // Signals
  signals: Signal[];
  activeSignals: Signal[];
  signalHistory: Signal[];
  
  // Trading
  isAutoTrading: boolean;
  isBinaryMode: boolean;
  positions: any[];
  balance?: TraderBalance;
  
  // UI State
  isConnected: boolean;
  lastApiError?: string;
  operatorSiteActive: boolean;
  countdownActive: boolean;
  lastSignalTime: number;
  
  // Settings
  settings: TradingSettings;
}

export interface TradingActions {
  // Market Data Actions
  setSelectedPair: (pair: TradingPair) => void;
  setSelectedTimeframe: (timeframe: TimeFrame) => void;
  updateMarketData: () => void;
  
  // Signal Actions
  generateSignal: () => void;
  generateBinarySignal: () => void;
  clearSignals: () => void;
  
  // Trading Actions
  toggleAutoTrading: () => void;
  setBinaryMode: (enabled: boolean) => void;
  
  // API Actions
  initializeAPI: (apiKey?: string) => void;
  refreshBalance: () => void;
  checkPlatformStatus: () => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<TradingSettings>) => void;
  
  // Utility Actions
  startSignalGeneration: () => void;
  stopSignalGeneration: () => void;
}

export type TradingStore = TradingState & TradingActions;

