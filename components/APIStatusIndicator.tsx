'use client';

import { useState } from 'react';
import { useTradingStore } from '@/store/trading';
import { formatPrice, formatNumber } from '@/lib/utils';
import { 
  Wifi, 
  WifiOff, 
  Settings, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  X,
  Activity,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface APIStatusIndicatorProps {
  className?: string;
}

export default function APIStatusIndicator({ className = '' }: APIStatusIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  const {
    isConnected,
    lastApiError,
    traderBalance,
    operatorSiteActive,
    lastStatusCheck,
    settings,
    initializeAPI,
    refreshBalance,
    checkPlatformStatus,
    updateSettings,
  } = useTradingStore();

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      updateSettings({
        theoption: {
          ...settings.theoption,
          apiKey: apiKey.trim(),
        }
      });
      initializeAPI(apiKey.trim());
      setApiKey('');
    }
  };

  const getStatusIcon = () => {
    if (isConnected && operatorSiteActive) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    if (isConnected && !operatorSiteActive) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    
    return <WifiOff className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (isConnected && operatorSiteActive) {
      return 'プラットフォーム稼働中';
    }
    
    if (isConnected && !operatorSiteActive) {
      return 'プラットフォーム停止中';
    }
    
    return 'API接続エラー';
  };

  const getStatusColor = () => {
    if (isConnected && operatorSiteActive) return 'bg-green-50 border-green-200';
    if (isConnected && !operatorSiteActive) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Status Indicator */}
      <motion.div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${getStatusColor()}`}
        onClick={() => setShowDetails(!showDetails)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {traderBalance !== undefined && (
          <span className="text-xs bg-white/70 px-2 py-1 rounded">
            ¥{formatNumber(traderBalance)}
          </span>
        )}
        <Settings className="w-3 h-3 opacity-60" />
      </motion.div>

      {/* Details Panel */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border p-4 z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">TheOption API設定</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connection Status */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">API接続状態</span>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm">接続中</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm">未接続</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">プラットフォーム状態</span>
              <div className="flex items-center gap-2">
                {operatorSiteActive ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <Activity className="w-4 h-4" />
                    <span className="text-sm">稼働中</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">停止中</span>
                  </div>
                )}
              </div>
            </div>
            
            {traderBalance !== undefined && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">口座残高</span>
                <span className="text-sm font-mono">¥{formatNumber(traderBalance)}</span>
              </div>
            )}

            {lastStatusCheck && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">最終確認</span>
                <span className="text-xs text-gray-500">
                  {new Date(lastStatusCheck).toLocaleTimeString('ja-JP')}
                </span>
              </div>
            )}
            
            {lastApiError && (
              <div className="flex items-start gap-2 p-2 bg-red-50 rounded text-red-700 text-xs">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{lastApiError}</span>
              </div>
            )}
          </div>

          {/* API Key Configuration */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              APIキー設定
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="APIキーを入力..."
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKey.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
            {settings.theoption.apiKey && (
              <p className="text-xs text-green-600 mt-1">
                ✅ APIキーが設定済みです
              </p>
            )}
          </div>

          {/* API Endpoint Information */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-1">API接続先</h4>
            <p className="text-xs text-blue-700 font-mono">
              https://platformapidemo.theoption.com
            </p>
            <p className="text-xs text-blue-600 mt-1">
              TheOption Platform Demo API
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={refreshBalance}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              <RefreshCw className="w-3 h-3" />
              残高更新
            </button>
            
            <button
              onClick={checkPlatformStatus}
              className="flex items-center gap-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm"
            >
              <Activity className="w-3 h-3" />
              状態確認
            </button>
            
            <button
              onClick={() => initializeAPI()}
              className="flex items-center gap-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-sm"
            >
              <Wifi className="w-3 h-3" />
              再接続
            </button>
          </div>

          {/* Status Warning */}
          {!operatorSiteActive && isConnected && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    プラットフォーム一時停止中
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    TheOptionの取引プラットフォームが現在利用できません。
                    自動シグナル生成は一時停止されています。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-700">
              <strong>重要:</strong> このアプリケーションはTheOptionプラットフォームの
              リアルタイムデータを使用します。プラットフォームが停止中は取引シグナルが
              生成されません。
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
} 