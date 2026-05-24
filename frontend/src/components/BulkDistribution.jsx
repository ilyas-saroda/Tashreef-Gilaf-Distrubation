import React from "react";
import { Edit3, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export default function BulkDistribution({ data, onBulkUpdateSuccess }) {
  const [isBulkPanelOpen, setIsBulkPanelOpen] = React.useState(false);
  const [bulkAccNoInput, setBulkAccNoInput] = React.useState("");
  const [bulkReceiverName, setBulkReceiverName] = React.useState("");
  const [bulkFeedback, setBulkFeedback] = React.useState(null);

  // Live pre-check warnings for Bulk Distribution
  const livePreCheckWarnings = React.useMemo(() => {
    if (!bulkAccNoInput || !bulkAccNoInput.trim()) return [];
    
    const rawIds = bulkAccNoInput
      .split(/[\s,\n]+/)
      .map((s) => s.replace(/[^0-9]/g, "").trim())
      .filter(Boolean);
      
    if (rawIds.length === 0) return [];

    const warningsMap = new Map();
    rawIds.forEach((id) => {
      const item = data.find((d) => String(d.AccNo) === id || String(d.HOF_ID) === id);
      if (item && item.Status === "Given") {
        warningsMap.set(item.AccNo, {
          accNo: item.AccNo,
          receivedBy: item.Received_By || "Unknown"
        });
      }
    });
    
    return Array.from(warningsMap.values());
  }, [bulkAccNoInput, data]);

  const handleBulkDistribution = () => {
    setBulkFeedback(null);
    if (!bulkReceiverName || bulkReceiverName.trim() === "") {
      setBulkFeedback({ type: "error", message: "Error: Receiver name is required!" });
      return;
    }

    const rawIds = bulkAccNoInput
      .split(/[\s,\n]+/)
      .map((s) => s.replace(/[^0-9]/g, "").trim())
      .filter(Boolean);

    if (rawIds.length === 0) {
      setBulkFeedback({ type: "error", message: "Error: No valid Account IDs found!" });
      return;
    }

    const successfulUpdates = [];
    const alreadyDistributed = [];
    const notAllowedRecords = [];
    const notFoundRecords = [];

    rawIds.forEach((id) => {
      const item = data.find((d) => String(d.AccNo) === id || String(d.HOF_ID) === id);
      if (!item) {
        notFoundRecords.push(id);
      } else {
        if (item.Status === "Given") {
          alreadyDistributed.push({ accNo: item.AccNo, takenBy: item.Received_By || "Unknown" });
        } else if (item.Status === "Not Allowed") {
          notAllowedRecords.push(id);
        } else if (item.Status === "Pending") {
          successfulUpdates.push(item);
        }
      }
    });

    if (successfulUpdates.length > 0) {
      onBulkUpdateSuccess(successfulUpdates, bulkReceiverName.trim());
    }

    const feedbackParts = [];
    if (successfulUpdates.length > 0) {
      feedbackParts.push(`Success! Processed ${successfulUpdates.length} records.`);
    }
    if (alreadyDistributed.length > 0) {
      const formattedAlready = alreadyDistributed.map(d => `Account ${d.accNo} - Already taken by ${d.takenBy}`);
      feedbackParts.push(`⚠️ Skipped Accounts: [${formattedAlready.join("], [")}]`);
    }
    if (notAllowedRecords.length > 0) {
      feedbackParts.push(`Skipped [${notAllowedRecords.join(", ")}] - Account Status is Restricted/Not Allowed.`);
    }
    if (notFoundRecords.length > 0) {
      feedbackParts.push(`Warning: Accounts [${notFoundRecords.join(", ")}] do not exist in the database.`);
    }

    setBulkFeedback({
      type: successfulUpdates.length > 0 ? "success" : (notFoundRecords.length > 0 || notAllowedRecords.length > 0 || alreadyDistributed.length > 0 ? "warning" : "error"),
      message: feedbackParts.join(" | "),
    });

    setBulkAccNoInput("");
    setBulkReceiverName("");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-md">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsBulkPanelOpen(!isBulkPanelOpen)}
      >
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-blue-400" />
          Bulk Distribution Entry
        </h2>
        <button className="text-slate-400 hover:text-slate-200 transition-colors flex items-center">
          {isBulkPanelOpen ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
          <span className="text-xs uppercase tracking-wider font-semibold ml-2">{isBulkPanelOpen ? "Close" : "Open"}</span>
        </button>
      </div>

      <AnimatePresence>
        {isBulkPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-slate-800 mt-4">
              {bulkFeedback && (
                <div
                  className={cn(
                    "mb-4 p-3 rounded text-sm font-medium",
                    bulkFeedback.type === "error"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : bulkFeedback.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  )}
                >
                  {bulkFeedback.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Account Numbers (comma, space, or line break separated)
                  </label>
                  <textarea
                    value={bulkAccNoInput}
                    onChange={(e) => setBulkAccNoInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px] resize-y"
                    placeholder="e.g. 1024, 1025, 1026"
                  />
                  {livePreCheckWarnings.length > 0 && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 text-sm space-y-2">
                      {livePreCheckWarnings.map((w, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-amber-500/80 text-xs">⚠️</span>
                          <span>
                            Pre-check Warning: Account <span className="font-medium text-slate-300">{w.accNo}</span> was already collected
                            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded mx-1">By: {w.receivedBy}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Bulk Receiver Name
                    </label>
                    <input
                      type="text"
                      value={bulkReceiverName}
                      onChange={(e) => setBulkReceiverName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Name of person collecting"
                    />
                  </div>
                  <button
                    onClick={handleBulkDistribution}
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Check className="w-5 h-5" />
                    Process Bulk Safe Update
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}