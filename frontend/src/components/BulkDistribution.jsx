import React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/utils";

export default function BulkDistribution({ data, onBulkUpdateSuccess }) {
  const [bulkAccNoInput, setBulkAccNoInput] = React.useState("");
  const [bulkReceiverName, setBulkReceiverName] = React.useState("");
  const [bulkFeedback, setBulkFeedback] = React.useState(null);

  // Live account lookups for Bulk Distribution
  const liveAccountLookups = React.useMemo(() => {
    if (!bulkAccNoInput || !bulkAccNoInput.trim()) return [];
    
    const rawIds = Array.from(new Set(bulkAccNoInput
      .split(/[\s,\n]+/)
      .map((s) => s.replace(/[^0-9]/g, "").trim())
      .filter(Boolean)));
      
    if (rawIds.length === 0) return [];

    return rawIds.map((id) => {
      const item = data.find((d) => String(d.AccNo) === id || String(d.HOF_ID) === id);
      if (item) {
        return {
          id,
          found: true,
          accNo: item.AccNo,
          fullName: item.Full_Name,
          status: item.Status,
          receivedBy: item.Received_By || "Unknown"
        };
      }
      return {
        id,
        found: false
      };
    });
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
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm w-full max-w-2xl mx-auto mt-4">
      <div>
        <h2 className="text-slate-900 font-semibold text-lg tracking-tight mb-1">
          Bulk Distribution Entry
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Process multiple account updates simultaneously
        </p>
      </div>

      <div className="mt-2">
        {bulkFeedback && (
          <div
            className={cn(
              "mb-4 p-3 rounded-md text-sm font-medium border",
              bulkFeedback.type === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : bulkFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            )}
          >
            {bulkFeedback.message}
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              Account Numbers
            </label>
            <textarea
              value={bulkAccNoInput}
              onChange={(e) => setBulkAccNoInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-3 text-[15px] focus:bg-white focus:border-slate-400 focus:outline-none transition-all min-h-[120px] resize-y"
              placeholder="e.g. 1024, 1025 (comma or space separated)"
            />
            {liveAccountLookups.length > 0 && (
              <div className="border-l-2 border-slate-300 bg-slate-50/50 p-3 rounded-r-lg mt-2 flex flex-col gap-2">
                {liveAccountLookups.map((lookup, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[15px] text-slate-900">
                    {lookup.found ? (
                      <>
                        <span className="font-mono font-bold text-slate-600 shrink-0 mt-0.5">[{lookup.accNo}]</span>
                        <span className="font-medium whitespace-normal break-words text-left">
                          {lookup.fullName}
                          {lookup.status === 'Given' && (
                            <span className="inline-flex ml-2 font-medium text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-xs align-middle">
                              (Collected by: {lookup.receivedBy})
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-rose-600">
                        <span className="font-mono font-bold shrink-0">[{lookup.id}]</span>
                        <span className="font-medium">Account not found in system</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              Bulk Receiver Name
            </label>
            <input
              type="text"
              value={bulkReceiverName}
              onChange={(e) => setBulkReceiverName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-3 text-[15px] focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
              placeholder="Name of person collecting"
            />
          </div>
          
          <button
            onClick={handleBulkDistribution}
            className="w-full bg-slate-900 hover:bg-black text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition-colors duration-150 mt-4 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Check className="w-4 h-4" />
            Process Bulk Safe Update
          </button>
        </div>
      </div>
    </div>
  );
}
