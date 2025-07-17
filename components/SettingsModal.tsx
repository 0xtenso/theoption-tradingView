'use client';

import { motion } from 'framer-motion';
import { X, Bell, Filter, Palette } from 'lucide-react';
import { useTradingStore } from '@/store/trading';
import { sendTestNotification } from '@/lib/notifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useTradingStore();

  const handleNotificationToggle = (enabled: boolean) => {
    updateSettings({
      signals: {
        ...settings.signals,
        enableNotifications: enabled,
      },
    });
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-dark-100 rounded-2xl p-6 w-full max-w-md border border-dark-200 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">設定</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-200 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* 通知設定 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={20} className="text-primary-400" />
              <h4 className="font-medium">通知設定</h4>
            </div>
            
            <div className="space-y-3 pl-7">
              <div className="flex items-center justify-between">
                <span>プッシュ通知</span>
                <Toggle
                  checked={settings.signals.enableNotifications}
                  onChange={handleNotificationToggle}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span>通知音</span>
                <Toggle
                  checked={settings.signals.enableSound}
                  onChange={(checked) => updateSettings({ 
                    signals: { ...settings.signals, enableSound: checked }
                  })}
                />
              </div>
              
              <button
                onClick={handleTestNotification}
                className="w-full py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
              >
                通知テスト
              </button>
            </div>
          </div>

          {/* フィルター設定 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Filter size={20} className="text-primary-400" />
              <h4 className="font-medium">フィルター設定</h4>
            </div>
            
            <div className="space-y-3 pl-7">
              <div>
                <label className="block text-sm mb-1">最低信頼度</label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={settings.signals.minConfidence}
                  onChange={(e) => updateSettings({
                    signals: { ...settings.signals, minConfidence: Number(e.target.value) }
                  })}
                  className="w-full"
                />
                <div className="text-sm text-gray-400">{settings.signals.minConfidence}%</div>
              </div>

              
            </div>
          </div>

          {/* 表示設定 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Palette size={20} className="text-primary-400" />
              <h4 className="font-medium">表示設定</h4>
            </div>
            
            <div className="space-y-3 pl-7">
              <div className="flex items-center justify-between">
                <span>出来高表示</span>
                <Toggle
                  checked={settings.chart.indicators.volume}
                  onChange={(checked) => updateSettings({ 
                    chart: { 
                      ...settings.chart, 
                      indicators: { ...settings.chart.indicators, volume: checked }
                    }
                  })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span>テクニカル指標表示</span>
                <Toggle
                  checked={settings.chart.indicators.bollinger}
                  onChange={(checked) => updateSettings({ 
                    chart: { 
                      ...settings.chart, 
                      indicators: { ...settings.chart.indicators, bollinger: checked }
                    }
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-dark-200">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-dark-200 hover:bg-dark-300 text-gray-300 rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// トグルスイッチコンポーネント
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-primary-600' : 'bg-dark-300'
      }`}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        animate={{ x: checked ? 26 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
} 