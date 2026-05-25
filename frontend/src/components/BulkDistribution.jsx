import React from "react";
import {
  Check,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "../lib/utils";

// Status badge component
function StatusBadge({ status, receivedBy }) {
  const base =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border";

  if (status === "Given") {
    return (
      <span
        className={cn(base, "bg-slate-100 text-slate-700 border-slate-200")}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
        Given · {receivedBy}
      </span>
    );
  }
  if (status === "Pending") {
    return (
      <span
        className={cn(
          base,
          "bg-emerald-50 text-emerald-700 border-emerald-200",
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Pending
      </span>
    );
  }
  if (status === "Not Allowed") {
    return (
      <span className={cn(base, "bg-red-50 text-red-700 border-red-200")}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Restricted
      </span>
    );
  }
  return (
    <span className={cn(base, "bg-slate-100 text-slate-600 border-slate-200")}>
      {status}
    </span>
  );
}

// Feedback banner
function FeedbackBanner({ feedback }) {
  if (!feedback) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconCls: "text-emerald-500",
    },
    warning: {
      icon: AlertTriangle,
      cls: "bg-amber-50 text-amber-800 border-amber-200",
      iconCls: "text-amber-500",
    },
    error: {
      icon: XCircle,
      cls: "bg-red-50 text-red-800 border-red-200",
      iconCls: "text-red-500",
    },
  };

  const { icon: Icon, cls, iconCls } = config[feedback.type] || config.error;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border text-sm font-semibold mb-6 leading-relaxed",
        cls,
      )}
    >
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", iconCls)} />
      <span className="whitespace-normal break-words">{feedback.message}</span>
    </div>
  );
}

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
      return { id, found: false };
    });
  }, [parsedAccountIds, accountMap]);

  // Summary counts for the verification panel header
  const verificationStats = React.useMemo(() => {
    const total = liveAccountLookups.length;
    const pending = liveAccountLookups.filter(
      (l) => l.found && l.status === "Pending",
    ).length;
    const given = liveAccountLookups.filter(
      (l) => l.found && l.status === "Given",
    ).length;
    const notFound = liveAccountLookups.filter((l) => !l.found).length;
    const restricted = liveAccountLookups.filter(
      (l) => l.found && l.status === "Not Allowed",
    ).length;
    return { total, pending, given, notFound, restricted };
  }, [liveAccountLookups]);

  const handleBulkDistribution = () => {
    setBulkFeedback(null);
    const receiverName = bulkReceiverName.trim();

    if (!receiverName) {
      setBulkFeedback({
        type: "error",
        message: "Receiver name is required before processing.",
      });
      return;
    }
    if (parsedAccountIds.length === 0) {
      setBulkFeedback({
        type: "error",
        message:
          "No valid Account IDs found. Please enter at least one account number.",
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
    if (successfulUpdates.length > 0)
      feedbackParts.push(
        `${successfulUpdates.length} record(s) successfully processed.`,
      );
    if (alreadyDistributed.length > 0) {
      const list = alreadyDistributed.map(
        (d) => `Account ${d.accNo} (collected by: ${d.takenBy})`,
      );
      feedbackParts.push(`Already distributed — skipped: ${list.join("; ")}.`);
    }
    if (notAllowedRecords.length > 0)
      feedbackParts.push(
        `Restricted — skipped: ${notAllowedRecords.join(", ")}.`,
      );
    if (notFoundRecords.length > 0)
      feedbackParts.push(
        `Not found in database: ${notFoundRecords.join(", ")}.`,
      );

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
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full mt-4 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-slate-900 font-bold text-lg tracking-tight">
              Bulk Distribution Entry
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Process multiple account updates simultaneously
            </p>
          </div>
          {parsedAccountIds.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {parsedAccountIds.length} accounts
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <FeedbackBanner feedback={bulkFeedback} />

        {/* Two-column layout: form left, verification right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* ── LEFT: Input form ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Account Numbers */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                Account Numbers
              </label>
              <textarea
                value={bulkAccNoInput}
                onChange={(e) => setBulkAccNoInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-3.5 text-sm font-mono font-semibold focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all min-h-[200px] resize-y leading-relaxed"
                placeholder={"1024, 1025\n1026 1027\n1028"}
              />
              <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
                Separate with commas, spaces, or new lines
              </p>
            </div>

            {/* Receiver Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                Receiver Name
              </label>
              <input
                type="text"
                value={bulkReceiverName}
                onChange={(e) => setBulkReceiverName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-3.5 text-sm font-semibold focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all"
                placeholder="Full name of collecting person"
              />
            </div>

            {/* Submit button */}
            <button
              onClick={handleBulkDistribution}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold text-sm py-3 px-4 rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] mt-1"
            >
              <Check className="w-4 h-4" />
              Process Bulk Safe Update
            </button>

            {/* Quick info strip */}
            {parsedAccountIds.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  {
                    label: "Ready",
                    value: verificationStats.pending,
                    color: "text-emerald-700 bg-emerald-50 border-emerald-100",
                  },
                  {
                    label: "Given",
                    value: verificationStats.given,
                    color: "text-slate-600 bg-slate-100 border-slate-200",
                  },
                  {
                    label: "Restricted",
                    value: verificationStats.restricted,
                    color: "text-red-700 bg-red-50 border-red-100",
                  },
                  {
                    label: "Not Found",
                    value: verificationStats.notFound,
                    color: "text-amber-700 bg-amber-50 border-amber-100",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-center",
                      color,
                    )}
                  >
                    <div className="text-lg font-black leading-none">
                      {value}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Verification Reference ── */}
          <div className="lg:col-span-3 flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">
                  Verification Reference
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {liveAccountLookups.length > 0 && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    {liveAccountLookups.length} parsed · O(1) lookup
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white flex-1 shadow-sm">
              {liveAccountLookups.length > 0 ? (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 bg-slate-50 border-b border-slate-200 px-4 py-3">
                    <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Acc No
                    </div>
                    <div className="col-span-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Account Holder
                    </div>
                    <div className="col-span-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Status
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                    {liveAccountLookups.map((lookup, idx) => (
                      <div
                        key={lookup.id}
                        className={cn(
                          "grid grid-cols-12 gap-2 px-4 py-3.5 items-center transition-colors",
                          lookup.found
                            ? lookup.status === "Pending"
                              ? "hover:bg-emerald-50/50"
                              : lookup.status === "Not Allowed"
                                ? "hover:bg-red-50/40"
                                : "hover:bg-slate-50"
                            : "bg-red-50/30 hover:bg-red-50/60",
                        )}
                      >
                        {/* Acc No */}
                        <div className="col-span-3 font-mono text-sm font-bold text-slate-900 truncate">
                          {lookup.found ? lookup.accNo : lookup.id}
                        </div>

                        {/* Full Name */}
                        <div className="col-span-5 text-sm font-semibold truncate">
                          {lookup.found ? (
                            <span className="text-slate-800">
                              {lookup.fullName}
                            </span>
                          ) : (
                            <span className="text-red-600 font-bold text-xs">
                              Not in system
                            </span>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="col-span-4">
                          {lookup.found ? (
                            <StatusBadge
                              status={lookup.status}
                              receivedBy={lookup.receivedBy}
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border bg-red-50 text-red-700 border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                              Missing
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-[280px]">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 mb-1">
                    No accounts entered yet
                  </p>
                  <p className="text-xs text-slate-400 font-medium max-w-[220px] leading-relaxed">
                    Type account numbers on the left to verify records here in
                    real time.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
