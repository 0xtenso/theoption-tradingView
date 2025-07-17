'use client';

import { useState } from 'react';
import { Search, Globe, User, Settings } from 'lucide-react';
import { useTradingStore } from '@/store/trading';

interface HeaderProps {
  currentPrice?: number;
}

export default function Header({ currentPrice }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedPair, setSelectedPair } = useTradingStore();

  // 主要通貨ペア（直接定義）
  const mainPairs = [
    { symbol: 'USDJPY', rate: 85 },
    { symbol: 'EURUSD', rate: 85 },
    { symbol: 'GBPJPY', rate: 80 },
    { symbol: 'EURJPY', rate: 82 },
    { symbol: 'AUDUSD', rate: 78 },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 左側: ブランドロゴ */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold text-gray-800">HIGHLOW</span>
            </div>

            {/* 通貨ペア表示 */}
            <div className="flex items-center gap-4">
              {mainPairs.map((pair) => {
                const isSelected = selectedPair === pair.symbol;
                return (
                  <button
                    key={pair.symbol}
                    onClick={() => setSelectedPair(pair.symbol as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-800 font-medium' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className="font-medium">{pair.symbol}</span>
                    <span className="text-sm">{pair.rate}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 右側: 検索とユーザー */}
          <div className="flex items-center gap-4">
            {/* 検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="通貨ペアを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* ユーザーアイコン */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Globe size={18} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings size={18} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <User size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 