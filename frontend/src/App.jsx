import React from "react";
import { MainDistributionApp } from "./components/MainDistribution/MainDistributionApp";
import { DynamicExcelViewer } from "./components/DynamicViewer/DynamicExcelViewer";
import { Footer } from "./components/Layout/Footer";
import { cn } from "./lib/utils";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  // Purely decoupled entry switcher state
  const [view, setView] = React.useState("main");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Modern Compact View Toggle Bar at the very top */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex justify-between items-center text-xs shadow-sm z-50">
        <span className="text-slate-500 font-medium tracking-wide">System Module View:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setView("main")}
            className={cn(
              "px-3 py-1.5 rounded transition-all font-bold tracking-wide",
              view === "main"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            Module 1: Main Distribution (Sync)
          </button>
          <button
            onClick={() => setView("dynamic")}
            className={cn(
              "px-3 py-1.5 rounded transition-all font-bold tracking-wide",
              view === "dynamic"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            Module 2: Dynamic Viewer (Offline)
          </button>
        </div>
      </div>

      <main className="flex-grow flex flex-col relative w-full">
        <AnimatePresence mode="wait">
          {view === "main" ? (
            <motion.div
              key="main-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col flex-grow w-full"
            >
              <MainDistributionApp currentView={view} onViewToggle={setView} />
            </motion.div>
          ) : (
            <motion.div
              key="dynamic-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col flex-grow max-w-7xl mx-auto w-full px-4 py-8"
            >
              <DynamicExcelViewer />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}