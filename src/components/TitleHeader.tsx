import React from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { motion } from 'motion/react';

interface TitleHeaderProps {
  appTitle: string;
  onChangeTitle: (newTitle: string) => void;
}

export function TitleHeader({ appTitle, onChangeTitle }: TitleHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [tempTitle, setTempTitle] = React.useState(appTitle);

  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim();
    if (trimmed) {
      onChangeTitle(trimmed);
    } else {
      setTempTitle(appTitle);
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitle = () => {
    setTempTitle(appTitle);
    setIsEditingTitle(false);
  };

  return (
    <header className="mb-12 group">
      <div className="flex items-center gap-4 mb-2 min-h-[48px]">
        {isEditingTitle ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 w-full max-w-2xl"
          >
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') handleCancelTitle();
              }}
              autoFocus
              className="bg-slate-900 border-2 border-emerald-500/50 rounded-xl px-4 py-2 text-3xl font-extrabold text-white w-full outline-none focus:border-emerald-500 transition-all shadow-lg shadow-emerald-950/20"
            />
            <button 
              onClick={handleSaveTitle}
              className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg transition-all"
            >
              <Check className="w-5 h-5" />
            </button>
            <button 
              onClick={handleCancelTitle}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        ) : (
          <>
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-extrabold text-white tracking-tight cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => {
                setTempTitle(appTitle);
                setIsEditingTitle(true);
              }}
            >
              {appTitle}
            </motion.h2>
            <button 
              onClick={() => {
                setTempTitle(appTitle);
                setIsEditingTitle(true);
              }}
              className="p-2 opacity-0 group-hover:opacity-100 bg-slate-800/50 hover:bg-slate-800 text-slate-400 rounded-lg transition-all"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      <motion.p 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="text-slate-400 max-w-2xl"
      >
        Management and tracking of material distribution across regional centers. 
        Real-time synchronization and analytical oversight.
      </motion.p>
    </header>
  );
}
