import { OHLC, MarketData, TradingPair, TimeFrame } from '@/types/trading';

// TheOption API Configuration
// Use the correct API base URL for TheOption platform
const API_BASE_URL = 'https://platformapi.theoption.com';
const CLIENT_SERVICE_URL = `${API_BASE_URL}/Client.svc`;

// API Endpoints (adjusted for correct API path)
const ENDPOINTS = {
  TRADER_BALANCE: `${CLIENT_SERVICE_URL}/GetTraderBalance`,
  MARKET_DATA: `${CLIENT_SERVICE_URL}/GetMarketData`,
  CHART_DATA: `${CLIENT_SERVICE_URL}/GetChartData`,
  ASSET_LIST: `${CLIENT_SERVICE_URL}/GetAssetList`,
  QUOTES: `${CLIENT_SERVICE_URL}/GetQuotes`,
  OPERATOR_SITE_ACTIVE: `${CLIENT_SERVICE_URL}/IsOperatorSiteActive`,
} as const;

// TheOption API Response Types
interface TheOptionBalanceResponse {
  data: {
    balanceInformation: {
      balance: number;
      bonusBalance: number;
      BonusInfo: any;
      Cashback: any;
    };
    retentionInformation: {
      status: string;
      campaignName: string;
      errors: string[];
      data: Array<{
        Key: string;
        Value: string;
      }>;
    };
  };
  status: string;
  timestamp: string;
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
  data: {
    isActive: boolean;
  };
  status: string;
  timestamp: string;
}

interface TheOptionOperatorSiteStatus {
  IsActive: boolean;
  Message?: string;
  Success: boolean;
  ErrorMessage?: string;
}

// TheOption Asset mapping
const ASSET_MAPPING: Record<TradingPair, string> = {
  'USDJPY': 'USD/JPY',
  'EURUSD': 'EUR/USD',
  'GBPJPY': 'GBP/JPY',
  'EURJPY': 'EUR/JPY',
  'AUDUSD': 'AUD/USD',
  'GBPUSD': 'GBP/USD',
  'USDCAD': 'USD/CAD',
  'USDCHF': 'USD/CHF',
  'NZDUSD': 'NZD/USD',
  'EURGBP': 'EUR/GBP',
};

// Timeframe mapping
const TIMEFRAME_MAPPING: Record<TimeFrame, string> = {
  [TimeFrame.M1]: '1',
  [TimeFrame.M5]: '5',
  [TimeFrame.M15]: '15',
  [TimeFrame.M30]: '30',
  [TimeFrame.H1]: '60',
  [TimeFrame.H4]: '240',
  [TimeFrame.D1]: '1440',
};

class TheOptionAPIService {
  private apiKey?: string;
  private sessionToken?: string;
  private lastRequestTime = 0;
  private requestDelay = 50; // Reduced delay for real-time updates (ms)
  private sessionID = "BBDB8E9FD9CCEC8E399ED56BD25DCB"; // Default session ID

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  // Rate limiting helper
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

  // Generic API request method with 404 fallback for GET/POST
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    fallbackMethod?: 'GET' | 'POST'
  ): Promise<T> {
    await this.rateLimit();

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      ...(this.sessionToken && { 'X-Session-Token': this.sessionToken }),
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(endpoint, config);

      if (!response.ok) {
        // If 404 and fallbackMethod is set, try fallback
        if (response.status === 404 && fallbackMethod) {
          console.log(`404 error for ${endpoint}, trying ${fallbackMethod} method instead`);
          // Try fallback method (switch GET <-> POST)
          const fallbackConfig: RequestInit = {
            ...config,
            method: fallbackMethod,
          };
          if (fallbackMethod === 'GET') {
            delete fallbackConfig.body;
          } else if (fallbackMethod === 'POST' && !fallbackConfig.body) {
            fallbackConfig.body = JSON.stringify({});
          }
          const fallbackResponse = await fetch(endpoint, fallbackConfig);
          if (!fallbackResponse.ok) {
            throw new Error(`API request failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
          }
          const fallbackData = await fallbackResponse.json();
          return fallbackData as T;
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Check if operator site is active
  async isOperatorSiteActive(): Promise<TheOptionOperatorSiteStatus> {
    try {
      // Try POST first with the correct endpoint
      try {
        const response = await this.makeRequest<TheOptionOperatorSiteStatusResponse>(
          ENDPOINTS.OPERATOR_SITE_ACTIVE,
          {
            method: 'POST',
            body: JSON.stringify({
              operatorName: "TheOption"
            }),
          }
        );
        
        // Convert the new response format to our internal format
        return {
          IsActive: response.data.isActive,
          Success: response.status === "success",
          Message: response.status === "success" ? "Platform is operational" : "Platform status check failed"
        };
      } catch (postError) {
        // If POST fails with 404, try alternative endpoint
        console.log("POST request failed for operator status, trying alternative endpoint");
        
        // Try alternative endpoint with /api/ prefix
        const alternativeEndpoint = `${API_BASE_URL}/api/platform/status`;
        const response = await this.makeRequest<TheOptionOperatorSiteStatusResponse>(
          alternativeEndpoint,
          {
            method: 'GET',
          }
        );
        
        return {
          IsActive: response.data.isActive,
          Success: response.status === "success",
          Message: response.status === "success" ? "Platform is operational" : "Platform status check failed"
        };
      }
    } catch (error) {
      console.error('Failed to check operator site status:', error);
      return {
        IsActive: true, // Default to true to prevent blocking functionality
        Success: false,
        ErrorMessage: error instanceof Error ? error.message : 'Failed to check site status',
        Message: 'Defaulting to active status due to API unavailability',
      };
    }
  }

  // Get trader balance (try POST, fallback to GET if 404)
  async getTraderBalance(): Promise<TheOptionBalance> {
    try {
      // Use the updated API request format with the correct session ID
      const response = await this.makeRequest<TheOptionBalanceResponse>(
        ENDPOINTS.TRADER_BALANCE,
        { 
          method: 'POST', 
          body: JSON.stringify({
            sessionID: this.sessionID,
            returnWithBonus: "true",
            campaignName: "GiveIncentives"
          }) 
        },
        'GET'
      );
      
      // Convert the new response format to our internal format
      if (response.status === "success" && response.data?.balanceInformation) {
        return {
          Balance: response.data.balanceInformation.balance,
          Currency: "JPY", // Default currency
          Demo: true, // Assuming demo account
          Success: true
        };
      } else {
        throw new Error("Invalid balance response format");
      }
    } catch (error) {
      console.error('Failed to get trader balance:', error);
      return {
        Balance: 0,
        Currency: "JPY",
        Demo: true,
        Success: false,
        ErrorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get real-time quotes (GET only)
  async getQuotes(assets?: string[]): Promise<TheOptionQuote[]> {
    const params = new URLSearchParams();
    if (assets && assets.length > 0) {
      params.append('assets', assets.join(','));
    }
    const url = `${ENDPOINTS.QUOTES}${params.toString() ? '?' + params.toString() : ''}`;
    try {
      const response = await this.makeRequest<{ Data: TheOptionQuote[]; Success: boolean }>(url, {
        method: 'GET',
      }, 'POST');
      return response.Data || [];
    } catch (error) {
      console.error('Failed to get quotes:', error);
      return [];
    }
  }

  // Get chart data for specific asset and timeframe (try both GET and POST)
  async getChartData(
    asset: string,
    timeframe: string,
    count: number = 100
  ): Promise<TheOptionChartPoint[]> {
    const params = new URLSearchParams({
      asset,
      timeframe,
      count: count.toString(),
    });
    const url = `${ENDPOINTS.CHART_DATA}?${params.toString()}`;
    
    try {
      // Try GET first with fallback to POST
      try {
        const response = await this.makeRequest<TheOptionMarketDataResponse>(url, {
          method: 'GET',
        }, 'POST');
        
        if (!response.Success) {
          throw new Error(response.ErrorMessage || 'Failed to fetch chart data');
        }
        return response.Data || [];
      } catch (getError) {
        // If GET fails, try POST with parameters in body
        console.log(`GET request failed for chart data, trying POST method`);
        const response = await this.makeRequest<TheOptionMarketDataResponse>(
          ENDPOINTS.CHART_DATA,
          {
            method: 'POST',
            body: JSON.stringify({
              asset,
              timeframe,
              count
            }),
          }
        );
        
        if (!response.Success) {
          throw new Error(response.ErrorMessage || 'Failed to fetch chart data');
        }
        return response.Data || [];
      }
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
      const asset = ASSET_MAPPING[pair];
      const timeframeStr = TIMEFRAME_MAPPING[timeframe];

      if (!asset) {
        throw new Error(`Unsupported trading pair: ${pair}`);
      }

      // Get chart data
      const chartData = await this.getChartData(asset, timeframeStr, count);
      const ohlcData = this.convertToOHLC(chartData);

      // Get current price from latest candle or quotes
      let currentPrice = 0;
      if (ohlcData.length > 0) {
        currentPrice = ohlcData[ohlcData.length - 1].close;
      } else {
        // Fallback: get from quotes
        const quotes = await this.getQuotes([asset]);
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

  // Generate MarketData object from TheOption data
  async generateMarketData(pair: TradingPair): Promise<MarketData> {
    try {
      const asset = ASSET_MAPPING[pair];
      const quotes = await this.getQuotes([asset]);
      const quote = quotes.find(q => q.Asset === asset);

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
        volume: 0,
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

  // Set session token
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }
  
  // Set session ID
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

// Check if TheOption platform is currently active
export async function checkOperatorSiteStatus(): Promise<TheOptionOperatorSiteStatus> {
  return theOptionAPI.isOperatorSiteActive();
}

export default TheOptionAPIService;
