import React from "react";
import { Check, Search } from "lucide-react";
import { cn } from "../lib/utils";

export default function BulkDistribution({
  accountMap = new Map(),
  onBulkUpdateSuccess,
}) {
  const [bulkAccNoInput, setBulkAccNoInput] = React.useState("");
  const [bulkReceiverName, setBulkReceiverName] = React.useState("");
  const [bulkFeedback, setBulkFeedback] = React.useState(null);

  const parsedAccountIds = React.useMemo(() => {
    if (!bulkAccNoInput || !bulkAccNoInput.trim()) return [];

    return Array.from(
      new Set(
        bulkAccNoInput
          .split(/[\s,\n]+/)
          .map((s) => s.replace(/[^0-9]/g, "").trim())
          .filter(Boolean),
      ),
    );
  }, [bulkAccNoInput]);

  const liveAccountLookups = React.useMemo(() => {
    return parsedAccountIds.map((id) => {
      const item = accountMap.get(id);
      if (item) {
        return {
          id,
          found: true,
          accNo: item.AccNo,
          fullName: item.Full_Name,
          status: item.Status,
          receivedBy: item.Received_By || "Unknown",
        };
      }
      return {
        id,
        found: false,
      };
    });
  }, [parsedAccountIds, accountMap]);

  const handleBulkDistribution = () => {
    setBulkFeedback(null);
    const receiverName = bulkReceiverName.trim();

    if (!receiverName) {
      setBulkFeedback({
        type: "error",
        message: "Error: Receiver name is required.",
      });
      return;
    }

    if (parsedAccountIds.length === 0) {
      setBulkFeedback({
        type: "error",
        message: "Error: No valid Account IDs found.",
      });
      return;
    }

    const successfulUpdates = [];
    const alreadyDistributed = [];
    const notAllowedRecords = [];
    const notFoundRecords = [];

    parsedAccountIds.forEach((id) => {
      const item = accountMap.get(id);
      if (!item) {
        notFoundRecords.push(id);
      } else if (item.Status === "Given") {
        alreadyDistributed.push({
          accNo: item.AccNo,
          takenBy: item.Received_By || "Unknown",
        });
      } else if (item.Status === "Not Allowed") {
        notAllowedRecords.push(id);
      } else if (item.Status === "Pending") {
        successfulUpdates.push(item);
      }
    });

    if (successfulUpdates.length > 0) {
      onBulkUpdateSuccess(successfulUpdates, receiverName);
    }

    const feedbackParts = [];
    if (successfulUpdates.length > 0) {
      feedbackParts.push(`Success: Processed ${successfulUpdates.length} records.`);
    }
    if (alreadyDistributed.length > 0) {
      const formattedAlready = alreadyDistributed.map(
        (d) => `Account ${d.accNo} - Already collected by: ${d.takenBy}`,
      );
      feedbackParts.push(`Skipped accounts: ${formattedAlready.join("; ")}`);
    }
    if (notAllowedRecords.length > 0) {
      feedbackParts.push(
        `Skipped restricted accounts: ${notAllowedRecords.join(", ")}.`,
      );
    }
    if (notFoundRecords.length > 0) {
      feedbackParts.push(
        `Accounts not found in database: ${notFoundRecords.join(", ")}.`,
      );
    }

    setBulkFeedback({
      type:
        successfulUpdates.length > 0
          ? "success"
          : notFoundRecords.length > 0 ||
              notAllowedRecords.length > 0 ||
              alreadyDistributed.length > 0
            ? "warning"
            : "error",
      message: feedbackParts.join(" "),
    });

    setBulkAccNoInput("");
    setBulkReceiverName("");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm w-full mt-4">
      <div className="mb-5">
        <h2 className="text-slate-900 font-bold text-lg tracking-tight mb-1">
          Bulk Distribution Entry
        </h2>
        <p className="text-xs text-slate-700 font-semibold">
          Process multiple account updates simultaneously
        </p>
      </div>

      {bulkFeedback && (
        <div
          className={cn(
            "mb-5 p-3 rounded-md text-sm font-bold border whitespace-normal break-words",
            bulkFeedback.type === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : bulkFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-slate-100 text-slate-900 border-slate-200",
          )}
        >
          {bulkFeedback.message}
        </div>
      )}

      <div className="md:grid md:grid-cols-12 md:gap-6 items-start w-full">
        <div className="md:col-span-7 flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Account Numbers
            </label>
            <textarea
              value={bulkAccNoInput}
              onChange={(e) => setBulkAccNoInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-500 rounded-lg p-3 text-[15px] font-semibold focus:bg-white focus:border-slate-400 focus:outline-none transition-all min-h-[220px] resize-y whitespace-normal break-words"
              placeholder="e.g. 1024, 1025 (comma or space separated)"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Bulk Receiver Name
            </label>
            <input
              type="text"
              value={bulkReceiverName}
              onChange={(e) => setBulkReceiverName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-500 rounded-lg p-3 text-[15px] font-semibold focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
              placeholder="Name of person collecting"
            />
          </div>

          <button
            onClick={handleBulkDistribution}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold text-sm py-2.5 px-4 rounded-lg shadow-sm transition-colors duration-150 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Check className="w-4 h-4" />
            Process Bulk Safe Update
          </button>
        </div>

        <div className="md:col-span-5 mt-6 md:mt-0 border border-slate-200 bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Verification Reference
              </h3>
              <p className="text-xs font-semibold text-slate-700">
                {parsedAccountIds.length} unique account numbers parsed
              </p>
            </div>
            <div className="bg-slate-100 border border-slate-200 text-slate-900 rounded-md px-2.5 py-1 text-xs font-bold">
              O(1)
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {liveAccountLookups.length > 0 ? (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                <div className="grid grid-cols-12 gap-3 bg-slate-100 border-b border-slate-200 px-3 py-2">
                  <div className="col-span-3 text-[11px] font-bold uppercase tracking-wide text-slate-900 whitespace-normal break-words">
                    Acc No
                  </div>
                  <div className="col-span-9 text-[11px] font-bold uppercase tracking-wide text-slate-900 whitespace-normal break-words">
                    Account Holder Name / Status
                  </div>
                </div>

                {liveAccountLookups.map((lookup) => (
                  <div
                    key={lookup.id}
                    className="grid grid-cols-12 gap-3 px-3 py-3 bg-white text-slate-900"
                  >
                    <div className="col-span-3 font-mono font-bold text-sm text-slate-900 whitespace-normal break-words">
                      {lookup.found ? lookup.accNo : lookup.id}
                    </div>
                    <div className="col-span-9 text-sm font-bold text-slate-900 whitespace-normal break-words">
                      {lookup.found ? (
                        <>
                          <span className="text-slate-900 whitespace-normal break-words">
                            {lookup.fullName}
                          </span>
                          <span className="mt-1 inline-flex font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-xs whitespace-normal break-words">
                            {lookup.status}
                            {lookup.status === "Given"
                              ? ` (Already collected by: ${lookup.receivedBy})`
                              : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-red-800 font-bold whitespace-normal break-words">
                          Account not found in system
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-slate-200 bg-slate-100 rounded-lg px-4 py-10 text-center text-slate-900">
                <Search className="w-5 h-5 mx-auto mb-2 text-slate-900" />
                <p className="text-sm font-bold whitespace-normal break-words">
                  Enter account numbers to verify records instantly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
