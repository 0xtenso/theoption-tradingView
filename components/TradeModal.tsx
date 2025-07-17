'use client';

import { motion } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TradeModal({ isOpen, onClose }: TradeModalProps) {
  const handleTradeClick = () => {
    // TheOptionの取引画面を開く
    window.open('https://jp.theoption.com/trading', '_blank');
    onClose();
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
        className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">TheOptionで取引</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-gray-600 mb-2">
            TheOption取引プラットフォームに移動します
          </p>
          <p className="text-sm text-gray-500">
            シグナル情報を元に取引を開始してください
          </p>
        </div>

        <div className="space-y-3">
          <motion.button
            onClick={handleTradeClick}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <ExternalLink size={18} />
            TheOptionを開く
          </motion.button>

          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            キャンセル
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
} 