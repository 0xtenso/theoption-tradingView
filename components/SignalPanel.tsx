'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { useTradingStore, defaultCurrencyPairs } from '@/store/trading';
import { formatPrice } from '@/lib/utils';

interface SignalPanelProps {
  onTradeClick: () => void;
}

export default function SignalPanel({ onTradeClick }: SignalPanelProps) {
  const { selectedPair, marketData } = useTradingStore();
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [selectedTime, setSelectedTime] = useState(15);
  
  const currentPair = defaultCurrencyPairs.find(pair => pair.symbol === selectedPair);
  const currentData = marketData[selectedPair];
  const currentPrice = currentData?.price || 146.900;
  
  // 金額選択オプション
  const amountOptions = [1000, 5000, 10000, 50000, 100000];
  
  // 時間選択オプション
  const timeOptions = [
    { value: 15, label: '15:55' },
    { value: 30, label: '16:00' },
    { value: 60, label: '16:30' },
  ];

  // カウントダウン表示
  const [countdown, setCountdown] = useState('03:33');
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const seconds = 60 - now.getSeconds();
      const minutes = 2 + Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      setCountdown(`${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header - Currency Pair */}
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="text-lg">🇺🇸</span>
              <span className="text-lg">🇯🇵</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">{selectedPair}</h2>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">購入期限まで残り時間</div>
            <div className="text-sm font-mono text-blue-600">{countdown}</div>
          </div>
        </div>
      </div>

      {/* Payout & Rate */}
      <div className="p-4 bg-white border-b">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{currentPair?.rate || 85}%</div>
            <div className="text-sm text-gray-500">ペイアウト</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{currentPrice.toFixed(3)}</div>
            <div className="text-sm text-gray-500">レート</div>
          </div>
        </div>
      </div>

      {/* Amount Selection */}
      <div className="p-4 bg-white border-b">
        <h3 className="font-medium mb-3 text-gray-700">購入金額</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {amountOptions.map((amount) => (
            <motion.button
              key={amount}
              onClick={() => setSelectedAmount(amount)}
              className={`py-2 px-3 text-sm font-medium rounded transition-all ${
                selectedAmount === amount
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              ¥{amount.toLocaleString()}
            </motion.button>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <input
            type="number"
            value={selectedAmount}
            onChange={(e) => setSelectedAmount(Number(e.target.value))}
            className="flex-1 p-2 border border-gray-300 rounded text-lg font-mono"
            min="1000"
            step="1000"
          />
          <div className="ml-2 text-lg">
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
        </div>
        
        <div className="mt-2 text-right">
          <span className="text-sm text-gray-500">ペイアウト額</span>
          <span className="ml-2 font-bold text-green-600">
            ¥{Math.floor(selectedAmount * ((currentPair?.rate || 85) / 100) + selectedAmount).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Trading Buttons */}
      <div className="p-4 flex-1">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.button
            onClick={() => onTradeClick()}
            className="flex flex-col items-center justify-center py-6 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <TrendingUp className="w-6 h-6 mb-1" />
            <span className="text-lg">HIGH</span>
          </motion.button>
          
          <motion.button
            onClick={() => onTradeClick()}
            className="flex flex-col items-center justify-center py-6 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <TrendingDown className="w-6 h-6 mb-1" />
            <span className="text-lg">LOW</span>
          </motion.button>
        </div>

        <motion.button
          onClick={() => onTradeClick()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          購入
        </motion.button>
      </div>

      {/* Bottom Info */}
      <div className="p-4 bg-gray-100 border-t">
        <div className="bg-red-500 text-white text-center py-2 px-3 rounded text-sm">
          🎯 実行中のお取引はございません。
        </div>
        <div className="mt-2 text-center text-xs text-gray-500">
          全ての取引を表示
        </div>
      </div>
    </div>
  );
} 