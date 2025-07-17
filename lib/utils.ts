import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format price according to currency pair
export function formatPrice(price: number, symbol: string): string {
  try {
    if (symbol.includes('JPY')) {
      // JPY pairs typically have 3 decimal places
      return price.toFixed(3);
    } else {
      // Other pairs typically have 5 decimal places
      return price.toFixed(5);
    }
  } catch (error) {
    return price.toString();
  }
}

// Format timestamp to readable time
export function formatTime(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return new Date().toLocaleTimeString();
  }
}

// Format timestamp to readable date
export function formatDate(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return new Date().toLocaleDateString();
  }
}

// Format timestamp to readable date and time
export function formatDateTime(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return new Date().toLocaleString();
  }
}

// Format number with commas
export function formatNumber(num: number): string {
  try {
    return num.toLocaleString('ja-JP');
  } catch (error) {
    return num.toString();
  }
}

// Format percentage
export function formatPercent(value: number): string {
  try {
    return `${value.toFixed(2)}%`;
  } catch (error) {
    return `${value}%`;
  }
}

// Generate unique ID
export function generateId(): string {
  try {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  } catch (error) {
    return Date.now().toString();
  }
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Safe JSON parse
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Safe JSON stringify
export function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
}

// Check if running in browser environment
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Check if running in development mode
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

// Check if running in production mode
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// Get currency pair display name
export function getCurrencyPairName(symbol: string): string {
  const pairs: Record<string, string> = {
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
  return pairs[symbol] || symbol;
}

// Calculate percentage change
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  try {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  } catch {
    return 0;
  }
}

// Round to decimal places
export function roundToDecimals(value: number, decimals: number): number {
  try {
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
  } catch {
    return value;
  }
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Sleep/delay function
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'JPY'): string {
  try {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch {
    return `¥${formatNumber(amount)}`;
  }
} 