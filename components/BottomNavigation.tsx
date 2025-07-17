'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, TrendingUp, PlusCircle, BarChart3, User } from 'lucide-react';
import { useTradingStore } from '@/store/trading';

export default function BottomNavigation() {
  const [activeTab, setActiveTab] = useState('home');
  const { selectedPair } = useTradingStore();

  const navigationItems = [
    {
      id: 'home',
      label: 'ホーム',
      icon: Home,
      onClick: () => {
        setActiveTab('home');
        // Navigate to home view
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    {
      id: 'chart',
      label: 'チャート',
      icon: BarChart3,
      onClick: () => {
        setActiveTab('chart');
        // Focus on chart area
        const chartElement = document.querySelector('[data-chart]');
        if (chartElement) {
          chartElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    {
      id: 'trade',
      label: '取引',
      icon: PlusCircle,
      onClick: () => {
        setActiveTab('trade');
        // Open TheOption platform
        window.open('https://jp.theoption.com/trading', '_blank', 'noopener,noreferrer');
      }
    },
    {
      id: 'signals',
      label: 'シグナル',
      icon: TrendingUp,
      onClick: () => {
        setActiveTab('signals');
        // Focus on signals panel
        const signalsElement = document.querySelector('[data-signals]');
        if (signalsElement) {
          signalsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    {
      id: 'profile',
      label: 'プロフィール',
      icon: User,
      onClick: () => {
        setActiveTab('profile');
        // Show user information or settings
        alert('プロフィール機能は準備中です');
      }
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-slate-800 border-t border-slate-700 backdrop-blur-lg safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around py-2 px-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={item.onClick}
              className={`
                flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] transition-all duration-200
                ${isActive 
                  ? 'text-primary-400 bg-primary-400/10' 
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                }
              `}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-primary-400' : ''}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-primary-400' : ''}`}>
                {item.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary-400 rounded-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
} 