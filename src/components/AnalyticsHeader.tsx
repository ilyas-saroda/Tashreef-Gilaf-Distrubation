import React from 'react';
import { Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Analytics } from '../types';
import { motion } from 'motion/react';

interface AnalyticsHeaderProps {
  analytics: Analytics;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ analytics }) => {
  const cards = [
    {
      title: 'Total Registered',
      value: analytics.total,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      title: 'Total Distributed',
      value: analytics.distributed,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
    {
      title: 'Remaining',
      value: analytics.remaining,
      icon: AlertCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card, idx) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">{card.title}</p>
              <h4 className="text-3xl font-bold text-white tracking-tight">
                {card.value.toLocaleString()}
              </h4>
            </div>
            <div className={`p-3 rounded-xl ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
          
          {/* Subtle background glow on hover */}
          <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity ${card.bg}`} />
        </motion.div>
      ))}
    </div>
  );
};
