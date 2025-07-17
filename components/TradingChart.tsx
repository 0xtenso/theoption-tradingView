'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement,
} from 'chartjs-chart-financial';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { useTradingStore } from '@/store/trading';
import { formatPrice } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3, Settings, Wifi, WifiOff } from 'lucide-react';
import SignalArrows from './SignalArrows';

// Chart.js registration
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  LineController,
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TradingChart() {
  const chartRef = useRef<ChartJS>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [showIndicators, setShowIndicators] = useState(true);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('line');
  const [isMounted, setIsMounted] = useState(false);
  
  const { 
    selectedPair, 
    selectedTimeframe, 
    marketData, 
    isConnected, 
    lastApiError,
    updateMarketData 
  } = useTradingStore();

  // Client-side only rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Execute only on client-side
    if (!isMounted) return;

    try {
      // Get real-time market data from store
      const currentMarketData = marketData[selectedPair];
      
      if (!currentMarketData || !currentMarketData.ohlc || currentMarketData.ohlc.length === 0) {
        // If no data available, trigger update
        updateMarketData();
        return;
      }

      const ohlcData = currentMarketData.ohlc;
      const indicators = currentMarketData.indicators;

      // Convert to Chart.js format
      const candlestickData = ohlcData.map((candle) => ({
        x: new Date(candle.timestamp),
        o: candle.open,
        h: candle.high,
        l: candle.low,
        c: candle.close,
      }));

      // Line chart data (using close prices)
      const lineData = ohlcData.map((candle) => ({
        x: new Date(candle.timestamp),
        y: candle.close,
      }));

      // Prepare datasets
      const datasets: any[] = [];

      if (chartType === 'candlestick') {
        datasets.push({
          type: 'candlestick',
          label: selectedPair,
          data: candlestickData,
          color: {
            up: '#22c55e',
            down: '#ef4444',
            unchanged: '#6b7280',
          },
        });
      } else {
        datasets.push({
          type: 'line',
          label: selectedPair,
          data: lineData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.1,
        });
      }

      // Add technical indicators if enabled
      if (showIndicators && indicators) {
        const timestamps = ohlcData.map(candle => new Date(candle.timestamp));
        
        // Bollinger Bands
        if (indicators?.bollinger && typeof indicators.bollinger.upper === 'number') {
          const upperBand = timestamps.map(time => ({
            x: time,
            y: indicators.bollinger!.upper,
          }));
          const lowerBand = timestamps.map(time => ({
            x: time,
            y: indicators.bollinger!.lower,
          }));
          const middleBand = timestamps.map(time => ({
            x: time,
            y: indicators.bollinger!.middle,
          }));

          datasets.push(
            {
              type: 'line',
              label: 'BB Upper',
              data: upperBand,
              borderColor: 'rgba(239, 68, 68, 0.5)',
              backgroundColor: 'transparent',
              fill: false,
              pointRadius: 0,
            },
            {
              type: 'line',
              label: 'BB Middle',
              data: middleBand,
              borderColor: 'rgba(107, 114, 128, 0.5)',
              backgroundColor: 'transparent',
              fill: false,
              pointRadius: 0,
            },
            {
              type: 'line',
              label: 'BB Lower',
              data: lowerBand,
              borderColor: 'rgba(34, 197, 94, 0.5)',
              backgroundColor: 'transparent',
              fill: false,
              pointRadius: 0,
            }
          );
        }

        // EMA20
        if (typeof indicators.ema20 === 'number') {
          const emaData = timestamps.map(time => ({
            x: time,
            y: indicators.ema20,
          }));

          datasets.push({
            type: 'line',
            label: 'EMA20',
            data: emaData,
            borderColor: 'rgba(168, 85, 247, 0.8)',
            backgroundColor: 'transparent',
            fill: false,
            pointRadius: 0,
          });
        }
      }

      setChartData({
        datasets,
      });
    } catch (error) {
      console.error('Chart data preparation failed:', error);
    }
  }, [selectedPair, selectedTimeframe, isMounted, chartType, showIndicators, marketData, updateMarketData]);

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          filter: (legendItem: any) => {
            return !legendItem.text.includes('BB') || showIndicators;
          },
        },
      },
      title: {
        display: true,
        text: `${selectedPair} - ${selectedTimeframe} (Real-time)`,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatPrice(value, selectedPair)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'minute' as const,
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Price',
        },
        position: 'right' as const,
      },
    },
  };

  if (!isMounted) {
    return (
      <div className="bg-white rounded-lg border p-4 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {selectedPair} リアルタイムチャート
          </h2>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="w-4 h-4" />
                <span className="text-sm">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm">Disconnected</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <button
            onClick={() => setChartType(chartType === 'candlestick' ? 'line' : 'candlestick')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              chartType === 'candlestick'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          
          {/* Indicators Toggle */}
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              showIndicators
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="relative p-4">
        {!isConnected ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">API接続エラー</h3>
              <p className="text-gray-600 mb-4">
                TheOption APIに接続できません
              </p>
              {lastApiError && (
                <p className="text-sm text-red-600 mb-4">
                  エラー: {lastApiError}
                </p>
              )}
              <button
                onClick={updateMarketData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                再接続を試行
              </button>
            </div>
          </div>
        ) : chartData ? (
          <div ref={containerRef} className="h-96">
            <Chart ref={chartRef} type="line" data={chartData} options={options} />
            <SignalArrows chartContainerRef={containerRef} />
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">リアルタイムデータを読み込み中...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 