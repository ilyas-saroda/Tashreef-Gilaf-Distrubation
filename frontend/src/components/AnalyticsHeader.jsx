import React from 'react';
import { Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const AnalyticsHeader = ({ analytics, onCardClick }) => {
  const cards = [
    {
      title: 'Total Registered',
      value: analytics.total,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-400/10',
      filter: 'All',
    },
    {
      title: 'Total Distributed',
      value: analytics.distributed,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-400/10',
      filter: 'Given',
    },
    {
      title: 'Pending',
      value: analytics.pending ?? analytics.remaining,
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-400/10',
      filter: 'Pending',
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
          onClick={() => onCardClick?.(card.filter)}
          className="mnc-card-global p-6 relative overflow-hidden group cursor-pointer hover:scale-[1.01] hover:border-slate-700 transition-all duration-150"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
              <h4 className="text-3xl font-bold text-slate-900 tracking-tight">
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
