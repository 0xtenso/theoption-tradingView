import { OHLC, MarketData, TradingPair, TimeFrame } from '@/types/trading';
import { createFallbackResponse, shouldUseFallback } from './fallback-data';

// Exchange Rate API Configuration
const API_BASE_URL = 'https://v6.exchangerate-api.com/v6';
const API_KEY = 'd90d9a7dc56649598a43200d/latest'; // From the provided URL

// Exchange Rate API Response Types
interface ExchangeRateAPIResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

interface TheOptionBalance {
  Balance: number;
  Currency: string;
  Demo: boolean;
  Success: boolean;
  ErrorMessage?: string;
}

interface TheOptionQuote {
  Asset: string;
  Bid: number;
  Ask: number;
  LastUpdate: string;
  Change: number;
  ChangePercent: number;
}

interface TheOptionChartPoint {
  Time: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
}

interface TheOptionMarketDataResponse {
  Data: TheOptionChartPoint[];
  Success: boolean;
  ErrorMessage?: string;
}

interface TheOptionOperatorSiteStatusResponse {
  status: string;
  isActive: boolean;
}

interface TheOptionOperatorSiteStatus {
  IsActive: boolean;
  Message?: string;
  Success: boolean;
  ErrorMessage?: string;
}

// Asset mapping for Exchange Rate API
const ASSET_MAPPING: Record<TradingPair, { from: string; to: string }> = {
  'USDJPY': { from: 'USD', to: 'JPY' },
  'EURUSD': { from: 'EUR', to: 'USD' },
  'GBPJPY': { from: 'GBP', to: 'JPY' },
  'EURJPY': { from: 'EUR', to: 'JPY' },
  'AUDUSD': { from: 'AUD', to: 'USD' },
  'GBPUSD': { from: 'GBP', to: 'USD' },
  'USDCAD': { from: 'USD', to: 'CAD' },
  'USDCHF': { from: 'USD', to: 'CHF' },
  'NZDUSD': { from: 'NZD', to: 'USD' },
  'EURGBP': { from: 'EUR', to: 'GBP' },
};

// Timeframe mapping (used for simulated historical data)
const TIMEFRAME_MAPPING: Record<TimeFrame, string> = {
  [TimeFrame.M1]: '1min',
  [TimeFrame.M5]: '5min',
  [TimeFrame.M15]: '15min',
  [TimeFrame.M30]: '30min',
  [TimeFrame.H1]: '60min',
  [TimeFrame.H4]: '4hour',
  [TimeFrame.D1]: 'daily',
};

class TheOptionAPIService {
  private apiKey: string;
  private sessionToken?: string;
  private lastRequestTime = 0;
  private requestDelay = 60000; // Exchange Rate API - Update every 60 seconds (1 minute) to avoid rate limits
  private sessionID = "DEMO_SESSION"; // Demo session ID
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 300000; // Cache for 5 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey || API_KEY;
  }

  // Enhanced rate limiting with exponential backoff
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next API call`);
      await new Promise(resolve =>
        setTimeout(resolve, waitTime)
      );
    }
    this.lastRequestTime = Date.now();
  }

  // Cache management
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      console.log(`Using cached data for ${key}`);
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Generic API request method with enhanced error handling
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check cache first
    const cacheKey = url;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData as T;
    }

    await this.rateLimit();

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config: RequestInit = {
      method: 'GET',
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    let retries = 3;
    let delay = 5000; // Start with 5 second delay

    while (retries > 0) {
      try {
        const response = await fetch(url, config);

        if (response.status === 429) {
          console.warn(`Rate limit hit (429). Retrying in ${delay}ms. Retries left: ${retries - 1}`);
          
          if (retries > 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            retries--;
            continue;
          } else {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
          }
        }

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Check for Exchange Rate API errors
        if (data.result && data.result !== 'success') {
          throw new Error(`Exchange Rate API Error: ${data.result}`);
        }

        // Cache successful response
        this.setCachedData(cacheKey, data);
        return data as T;

      } catch (error) {
        if (retries === 1) {
          console.error(`API Error (${url}):`, error);
          throw error;
        }
        
        console.warn(`Request failed, retrying in ${delay}ms. Error:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        retries--;
      }
    }

    throw new Error('Max retries exceeded');
  }

  // Check if Exchange Rate API is active
  async isOperatorSiteActive(): Promise<TheOptionOperatorSiteStatus> {
    try {
      const testUrl = `${API_BASE_URL}/${this.apiKey}/USD`;
      const response = await this.makeRequest<ExchangeRateAPIResponse>(testUrl);
      
      if (response.result === 'success') {
        return {
          IsActive: true,
          Success: true,
          Message: "Exchange Rate API is operational"
        };
      } else {
        return {
          IsActive: false,
          Success: false,
          ErrorMessage: `API returned: ${response.result}`,
          Message: 'Exchange Rate API is not responding correctly',
        };
      }
    } catch (error) {
      console.error('Failed to check Exchange Rate API status:', error);
      return {
        IsActive: false,
        Success: false,
        ErrorMessage: error instanceof Error ? error.message : 'Failed to check API status',
        Message: 'Exchange Rate API is not responding',
      };
    }
  }

  // Get trader balance (simulated)
  async getTraderBalance(): Promise<TheOptionBalance> {
    try {
      return {
        Balance: 10000, // Demo balance
        Currency: "USD",
        Demo: true,
        Success: true
      };
    } catch (error) {
      console.error('Failed to get trader balance:', error);
      return {
        Balance: 0,
        Currency: "USD",
        Demo: true,
        Success: false,
        ErrorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get exchange rates from Exchange Rate API
  private async getExchangeRates(baseCurrency: string): Promise<ExchangeRateAPIResponse> {
    const url = `${API_BASE_URL}/${this.apiKey}/${baseCurrency}`;
    return this.makeRequest<ExchangeRateAPIResponse>(url);
  }

  // Calculate exchange rate between two currencies
  private calculateCrossRate(rates: Record<string, number>, from: string, to: string): number {
    if (from === to) return 1;
    
    // If we have direct rate
    if (rates[to]) {
      return rates[to];
    }
    
    // For cross rates, we need to calculate via USD
    // This is a simplified approach - in reality you'd need more sophisticated cross-rate calculation
    const fromToUsd = 1 / (rates[from] || 1);
    const toFromUsd = rates[to] || 1;
    return fromToUsd * toFromUsd;
  }

  // Get real-time quotes using Exchange Rate API
  async getQuotes(assets?: string[]): Promise<TheOptionQuote[]> {
    try {
      const quotes: TheOptionQuote[] = [];
      const pairs = assets || Object.keys(ASSET_MAPPING) as TradingPair[];
      
      // Get USD rates first (since our API key provides USD-based rates)
      const usdRates = await this.getExchangeRates('USD');
      
      for (const pairKey of pairs) {
        const pair = ASSET_MAPPING[pairKey as TradingPair];
        if (!pair) continue;
        
        try {
          let rate: number;
          
          if (pair.from === 'USD') {
            // Direct USD to other currency
            rate = usdRates.conversion_rates[pair.to] || 1;
          } else if (pair.to === 'USD') {
            // Other currency to USD (inverse)
            rate = 1 / (usdRates.conversion_rates[pair.from] || 1);
          } else {
            // Cross rate calculation
            const fromToUsd = 1 / (usdRates.conversion_rates[pair.from] || 1);
            const usdToTarget = usdRates.conversion_rates[pair.to] || 1;
            rate = fromToUsd * usdToTarget;
          }
          
          // Add small spread for bid/ask simulation
          const spread = rate * 0.0001; // 1 pip spread
          
          quotes.push({
            Asset: `${pair.from}/${pair.to}`,
            Bid: rate - spread,
            Ask: rate + spread,
            LastUpdate: usdRates.time_last_update_utc,
            Change: 0, // Exchange Rate API doesn't provide change data
            ChangePercent: 0,
          });
        } catch (error) {
          console.error(`Failed to get quote for ${pairKey}:`, error);
        }
      }
      
      return quotes;
    } catch (error) {
      console.error('Failed to get quotes:', error);
      return [];
    }
  }

  // Generate simulated historical data (since Exchange Rate API only provides current rates)
  private generateHistoricalData(currentRate: number, count: number, timeframe: string): TheOptionChartPoint[] {
    const chartPoints: TheOptionChartPoint[] = [];
    const now = new Date();
    
    // Calculate time interval based on timeframe
    let intervalMs: number;
    switch (timeframe) {
      case '1min': intervalMs = 60 * 1000; break;
      case '5min': intervalMs = 5 * 60 * 1000; break;
      case '15min': intervalMs = 15 * 60 * 1000; break;
      case '30min': intervalMs = 30 * 60 * 1000; break;
      case '60min': intervalMs = 60 * 60 * 1000; break;
      case '4hour': intervalMs = 4 * 60 * 60 * 1000; break;
      case 'daily': intervalMs = 24 * 60 * 60 * 1000; break;
      default: intervalMs = 60 * 1000; break;
    }
    
    // Generate historical points with random walk simulation
    let price = currentRate;
    for (let i = count - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMs);
      
      // Simple random walk for demonstration
      const volatility = 0.001; // 0.1% volatility
      const change = (Math.random() - 0.5) * volatility * price;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility * price * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * price * 0.5;
      
      chartPoints.push({
        Time: timestamp.toISOString(),
        Open: open,
        High: high,
        Low: low,
        Close: close,
        Volume: Math.floor(Math.random() * 1000000), // Random volume
      });
      
      price = close;
    }
    
    return chartPoints;
  }

  // Get chart data (simulated historical data based on current rates)
  async getChartData(
    asset: string,
    timeframe: string,
    count: number = 100
  ): Promise<TheOptionChartPoint[]> {
    try {
      // Parse asset string to get from/to currencies
      const [fromCurrency, toCurrency] = asset.split('/');
      
      // Get current rate
      const usdRates = await this.getExchangeRates('USD');
      let currentRate: number;
      
      if (fromCurrency === 'USD') {
        currentRate = usdRates.conversion_rates[toCurrency] || 1;
      } else if (toCurrency === 'USD') {
        currentRate = 1 / (usdRates.conversion_rates[fromCurrency] || 1);
      } else {
        const fromToUsd = 1 / (usdRates.conversion_rates[fromCurrency] || 1);
        const usdToTarget = usdRates.conversion_rates[toCurrency] || 1;
        currentRate = fromToUsd * usdToTarget;
      }
      
      // Generate simulated historical data
      return this.generateHistoricalData(currentRate, count, timeframe);
    } catch (error) {
      console.error(`Failed to get chart data for ${asset}:`, error);
      return [];
    }
  }

  // Convert TheOption data to our OHLC format
  private convertToOHLC(data: TheOptionChartPoint[]): OHLC[] {
    return data.map(point => ({
      timestamp: new Date(point.Time).getTime(),
      open: point.Open,
      high: point.High,
      low: point.Low,
      close: point.Close,
      volume: point.Volume,
    }));
  }

  // Get market data for a trading pair
  async getMarketData(
    pair: TradingPair,
    timeframe: TimeFrame = TimeFrame.M1,
    count: number = 100
  ): Promise<{ ohlcData: OHLC[]; currentPrice: number }> {
    try {
      const assetMapping = ASSET_MAPPING[pair];
      const timeframeStr = TIMEFRAME_MAPPING[timeframe];

      if (!assetMapping) {
        throw new Error(`Unsupported trading pair: ${pair}`);
      }

      const asset = `${assetMapping.from}/${assetMapping.to}`;

      // Get chart data
      const chartData = await this.getChartData(asset, timeframeStr, count);
      const ohlcData = this.convertToOHLC(chartData);

      // Get current price from latest candle or real-time quote
      let currentPrice = 0;
      if (ohlcData.length > 0) {
        currentPrice = ohlcData[ohlcData.length - 1].close;
      } else {
        // Fallback: get from real-time quote
        const quotes = await this.getQuotes([pair]);
        if (quotes.length > 0) {
          currentPrice = (quotes[0].Bid + quotes[0].Ask) / 2;
        }
      }

      return {
        ohlcData,
        currentPrice
      };
    } catch (error) {
      console.error(`Failed to get market data for ${pair}:`, error);
      throw error;
    }
  }

  // Generate MarketData object from Exchange Rate API data
  async generateMarketData(pair: TradingPair): Promise<MarketData> {
    try {
      const quotes = await this.getQuotes([pair]);
      const quote = quotes.find(q => q.Asset === `${ASSET_MAPPING[pair].from}/${ASSET_MAPPING[pair].to}`);

      if (!quote) {
        throw new Error(`No quote data for ${pair}`);
      }

      const price = (quote.Bid + quote.Ask) / 2;

      return {
        symbol: pair,
        price,
        bid: quote.Bid,
        ask: quote.Ask,
        spread: quote.Ask - quote.Bid,
        change: quote.Change,
        changePercent: quote.ChangePercent,
        volume: 0, // FX data doesn't have volume
        timestamp: new Date(quote.LastUpdate).getTime(),
      };
    } catch (error) {
      console.error(`Failed to generate market data for ${pair}:`, error);
      throw error;
    }
  }

  // Set API key for authenticated requests
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  // Set session token (not used in Exchange Rate API)
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }
  
  // Set session ID (not used in Exchange Rate API)
  setSessionID(id: string): void {
    this.sessionID = id;
  }
}

// Export singleton instance
export const theOptionAPI = new TheOptionAPIService();

// Export utility functions
export async function fetchRealTimeData(
  pair: TradingPair,
  timeframe: TimeFrame = TimeFrame.M1,
  count: number = 100
): Promise<{ ohlcData: OHLC[]; marketData: MarketData }> {
  try {
    const [{ ohlcData, currentPrice }, marketData] = await Promise.all([
      theOptionAPI.getMarketData(pair, timeframe, count),
      theOptionAPI.generateMarketData(pair),
    ]);

    return {
      ohlcData,
      marketData: {
        ...marketData,
        price: currentPrice,
      },
    };
  } catch (error) {
    console.error('Failed to fetch real-time data:', error);
    throw error;
  }
}

export async function fetchTraderBalance(): Promise<TheOptionBalance> {
  return theOptionAPI.getTraderBalance();
}

// Check if Exchange Rate API is currently active
export async function checkOperatorSiteStatus(): Promise<TheOptionOperatorSiteStatus> {
  return theOptionAPI.isOperatorSiteActive();
}

export default TheOptionAPIService;
