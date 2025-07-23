import { OHLC, MarketData, TradingPair, TimeFrame } from '@/types/trading';

// Alpha Vantage API Configuration
// Free API for forex and market data
const API_BASE_URL = 'https://www.alphavantage.co/query';
const FREE_API_KEY = 'BRAHK3JLYS4NQSPG'; // Replace with your actual API key from https://www.alphavantage.co/support/#api-key

// Alpha Vantage API Response Types
interface AlphaVantageBalanceResponse {
  balance: number;
  currency: string;
  demo: boolean;
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

// Alpha Vantage FX Real-time Exchange Rate Response
interface AlphaVantageRealtimeResponse {
  "Realtime Currency Exchange Rate": {
    "1. From_Currency Code": string;
    "2. From_Currency Name": string;
    "3. To_Currency Code": string;
    "4. To_Currency Name": string;
    "5. Exchange Rate": string;
    "6. Last Refreshed": string;
    "7. Time Zone": string;
    "8. Bid Price": string;
    "9. Ask Price": string;
  };
}

// Alpha Vantage FX Intraday Response
interface AlphaVantageIntradayResponse {
  "Meta Data": {
    "1. Information": string;
    "2. From Symbol": string;
    "3. To Symbol": string;
    "4. Last Refreshed": string;
    "5. Interval": string;
    "6. Output Size": string;
    "7. Time Zone": string;
  };
  [key: string]: any; // Time series data
}

// Asset mapping for Alpha Vantage
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

// Timeframe mapping for Alpha Vantage
const TIMEFRAME_MAPPING: Record<TimeFrame, string> = {
  [TimeFrame.M1]: '1min',
  [TimeFrame.M5]: '5min',
  [TimeFrame.M15]: '15min',
  [TimeFrame.M30]: '30min',
  [TimeFrame.H1]: '60min',
  [TimeFrame.H4]: '60min', // Alpha Vantage doesn't have 4h, use 1h
  [TimeFrame.D1]: 'daily',
};

class TheOptionAPIService {
  private apiKey: string;
  private sessionToken?: string;
  private lastRequestTime = 0;
  private requestDelay = 12000; // Alpha Vantage free tier: 5 requests per minute
  private sessionID = "DEMO_SESSION"; // Demo session ID

  constructor(apiKey?: string) {
    this.apiKey = apiKey || FREE_API_KEY;
  }

  // Rate limiting helper - Alpha Vantage free tier is 5 requests per minute
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve =>
        setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  // Generic API request method
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.rateLimit();

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check for Alpha Vantage API errors
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage API Error: ${data['Error Message']}`);
      }
      
      if (data['Note']) {
        throw new Error(`Alpha Vantage API Note: ${data['Note']}`);
      }

      return data as T;
    } catch (error) {
      console.error(`API Error (${url}):`, error);
      throw error;
    }
  }

  // Check if operator site is active (simulated for Alpha Vantage)
  async isOperatorSiteActive(): Promise<TheOptionOperatorSiteStatus> {
    try {
      // Test with a simple API call to check if Alpha Vantage is responding
      const testUrl = `${API_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=JPY&apikey=${this.apiKey}`;
      await this.makeRequest<AlphaVantageRealtimeResponse>(testUrl);
      
      return {
        IsActive: true,
        Success: true,
        Message: "Alpha Vantage API is operational"
      };
    } catch (error) {
      console.error('Failed to check Alpha Vantage API status:', error);
      return {
        IsActive: false,
        Success: false,
        ErrorMessage: error instanceof Error ? error.message : 'Failed to check API status',
        Message: 'Alpha Vantage API is not responding',
      };
    }
  }

  // Get trader balance (simulated for Alpha Vantage)
  async getTraderBalance(): Promise<TheOptionBalance> {
    try {
      // Simulate a demo balance since Alpha Vantage doesn't provide account data
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

  // Get real-time quotes using Alpha Vantage
  async getQuotes(assets?: string[]): Promise<TheOptionQuote[]> {
    try {
      const quotes: TheOptionQuote[] = [];
      const pairs = assets || Object.keys(ASSET_MAPPING) as TradingPair[];
      
      for (const pairKey of pairs) {
        const pair = ASSET_MAPPING[pairKey as TradingPair];
        if (!pair) continue;
        
        const url = `${API_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${pair.from}&to_currency=${pair.to}&apikey=${this.apiKey}`;
        
        try {
          const response = await this.makeRequest<AlphaVantageRealtimeResponse>(url);
          const rate = response["Realtime Currency Exchange Rate"];
          
          const bid = parseFloat(rate["8. Bid Price"]);
          const ask = parseFloat(rate["9. Ask Price"]);
          const currentRate = parseFloat(rate["5. Exchange Rate"]);
          
          quotes.push({
            Asset: `${pair.from}/${pair.to}`,
            Bid: bid || currentRate * 0.9999, // Approximate bid if not available
            Ask: ask || currentRate * 1.0001, // Approximate ask if not available
            LastUpdate: rate["6. Last Refreshed"],
            Change: 0, // Alpha Vantage doesn't provide change in this endpoint
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

  // Get chart data using Alpha Vantage FX Intraday
  async getChartData(
    asset: string,
    timeframe: string,
    count: number = 100
  ): Promise<TheOptionChartPoint[]> {
    try {
      // Parse asset string to get from/to currencies
      const [fromCurrency, toCurrency] = asset.split('/');
      
      let url: string;
      let functionName: string;
      
      if (timeframe === 'daily') {
        functionName = 'FX_DAILY';
        url = `${API_BASE_URL}?function=${functionName}&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${this.apiKey}`;
      } else {
        functionName = 'FX_INTRADAY';
        url = `${API_BASE_URL}?function=${functionName}&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&interval=${timeframe}&apikey=${this.apiKey}`;
      }
      
      const response = await this.makeRequest<AlphaVantageIntradayResponse>(url);
      
      // Find the time series data key
      const timeSeriesKey = Object.keys(response).find(key => 
        key.startsWith('Time Series FX') || key.startsWith('Time Series')
      );
      
      if (!timeSeriesKey || !response[timeSeriesKey]) {
        throw new Error('No time series data found in response');
      }
      
      const timeSeriesData = response[timeSeriesKey];
      const chartPoints: TheOptionChartPoint[] = [];
      
      // Convert Alpha Vantage data to our format
      const timestamps = Object.keys(timeSeriesData)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, count);
      
      for (const timestamp of timestamps) {
        const data = timeSeriesData[timestamp];
        chartPoints.push({
          Time: timestamp,
          Open: parseFloat(data['1. open']),
          High: parseFloat(data['2. high']),
          Low: parseFloat(data['3. low']),
          Close: parseFloat(data['4. close']),
          Volume: 0, // FX data doesn't have volume
        });
      }
      
      // Reverse to get chronological order
      return chartPoints.reverse();
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

  // Generate MarketData object from Alpha Vantage data
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

  // Set session token (not used in Alpha Vantage)
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }
  
  // Set session ID (not used in Alpha Vantage)
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

// Check if Alpha Vantage API is currently active
export async function checkOperatorSiteStatus(): Promise<TheOptionOperatorSiteStatus> {
  return theOptionAPI.isOperatorSiteActive();
}

export default TheOptionAPIService;
