import React from "react";
import { AnalyticsHeader } from "./components/AnalyticsHeader";
import { ExcelUpload } from "./components/ExcelUpload";
import { DistributionTable } from "./components/DistributionTable";
import { ResetModal } from "./components/ResetModal";
import { DataIntegrityReport } from "./components/DataIntegrityReport";
import { RecentUpdates } from "./components/RecentUpdates";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { TitleHeader } from "./components/TitleHeader";
import {
  LayoutDashboard,
  FileSpreadsheet,
  RefreshCcw,
  Cloud,
  CloudOff,
  Loader2,
  Edit3,
  Check,
  X,
  User,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { cn } from "./lib/utils";

const saveToLocalExcelFile = (fullData) => {
  fetch("http://localhost:5000/api/save-all", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(fullData)
  }).catch(err => console.error("Local save-all failed:", err));
};

const updateSingleItemLocalExcel = (hofId, updates) => {
  fetch("http://localhost:5000/api/update-item", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ hofId, updates })
  }).catch(err => console.error("Local update-item failed:", err));
};

export default function App() {
  const [data, setData] = React.useState([]);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [supabaseStatus, setSupabaseStatus] = React.useState("disconnected");
  const [errorMessage, setErrorMessage] = React.useState(null);
  const [appTitle, setAppTitle] = React.useState(
    () =>
      localStorage.getItem("app_distribution_title") ||
      "Tashrif Gilaf Distribution",
  );
  const [lastRefreshed, setLastRefreshed] = React.useState(new Date());
  const [dismissedRecentIds, setDismissedRecentIds] = React.useState(new Set());
  const [dbKeys, setDbKeys] = React.useState([]);
  const [importStats, setImportStats] = React.useState(null);

  // Helper to normalize Supabase data to App types (handles case sensitivity)
  const normalizeData = (items) => {
    return items.map((item) => {
      const rawStatus = item.Status ?? item.status ?? "Pending";
      let normalizedStatus = "Pending";
      let extractedReceiver = "";

      const s = String(rawStatus).trim().toLowerCase();
      if (s.includes("given")) {
        normalizedStatus = "Given";
        // Try to extract name after "given to" or "given "
        // Regular expression handles various formats: "Given to Name", "Given: Name", "Given - Name", etc.
        const match = String(rawStatus).match(
          /(?:given|distribution)\s*(?::|-|to)?\s*(.+)/i,
        );
        if (match && match[1]) {
          extractedReceiver = match[1].trim();
        }
      } else if (s.includes("not allow")) {
        normalizedStatus = "Not Allowed";
      } else if (s === "pending") {
        normalizedStatus = "Pending";
      }

      return {
        id: item.id,
        SN: item.SN ?? item.sn ?? item.S_N ?? item.index ?? "",
        AccNo:
          item.AccNo ??
          item.ACCNO ??
          item.accno ??
          item.acc_no ??
          item.Account_No ??
          item.AccountNo ??
          "",
        Full_Name:
          item.Full_Name ?? item.full_name ?? item.name ?? item.FULL_NAME ?? "",
        HOF_ID: item.HOF_ID ?? item.hof_id ?? item.HOF_id ?? "",
        Status: normalizedStatus,
        Received_By: (
          item.Received_By ||
          item.received_by ||
          item.ReceivedBy ||
          item.receivedby ||
          item.receiver ||
          item.given_to ||
          item.Given_To ||
          extractedReceiver ||
          ""
        ).trim(),
        Update_Date: item.Update_Date ?? item.update_date ?? undefined,
        Update_Day: item.Update_Day ?? item.update_day ?? undefined,
        Update_Time: item.Update_Time ?? item.update_time ?? undefined,
      };
    });
  };

  const scrollToHofId = (hofId) => {
    // Dispatch a custom event that the table component can listen to
    window.dispatchEvent(
      new CustomEvent("jump-to-hof", {
        detail: { hofId },
      }),
    );
  };

  // Helper to map App updates to Supabase columns using detected schema
  const prepareUpdatesWithSchema = (updates, currentEntry) => {
    const mapped = {};

    // Process Status and Received_By (Given_To in user schema)
    const status = updates.Status ?? currentEntry?.Status ?? "Pending";
    const receiver = (
      updates.Received_By ??
      currentEntry?.Received_By ??
      ""
    ).trim();
    const statusString =
      status === "Given" && receiver ? `Given to ${receiver}` : status;

    // Use user's exact schema keys if detected, else best guess
    const getBestKey = (standardKey, alternates) => {
      if (dbKeys.includes(standardKey)) return standardKey;
      for (const alt of alternates) {
        if (dbKeys.includes(alt)) return alt;
      }
      // Case insensitive fallback
      const found = dbKeys.find(
        (k) => k.toLowerCase() === standardKey.toLowerCase(),
      );
      return found || standardKey;
    };

    if (updates.Status !== undefined || updates.Received_By !== undefined) {
      mapped[getBestKey("Status", ["status"])] = statusString;
      mapped[
        getBestKey("Given_To", ["given_to", "Received_By", "received_by"])
      ] = receiver;
    }

    if (updates.Update_Date !== undefined) {
      const key = getBestKey("Update_Date", ["update_date"]);
      mapped[key] = updates.Update_Date;
    }
    if (updates.Update_Day !== undefined) {
      const key = getBestKey("Update_Day", ["update_day"]);
      mapped[key] = updates.Update_Day;
    }
    if (updates.Update_Time !== undefined) {
      const key = getBestKey("Update_Time", ["update_time"]);
      mapped[key] = updates.Update_Time;
    }

    return mapped;
  };

  // Helper to map App updates to Supabase columns
  const prepareUpdates = (updates, currentEntry, caseType = "Pascal") => {
    const mapped = {};

    // Process Status and Received_By
    const status = updates.Status ?? currentEntry?.Status ?? "Pending";
    const receiver = (
      updates.Received_By ??
      currentEntry?.Received_By ??
      ""
    ).trim();
    const statusString =
      status === "Given" && receiver ? `Given to ${receiver}` : status;

    const setKey = (key, value) => {
      if (caseType === "lower") mapped[key.toLowerCase()] = value;
      else if (caseType === "upper") mapped[key.toUpperCase()] = value;
      else mapped[key] = value;
    };

    if (updates.Status !== undefined || updates.Received_By !== undefined) {
      setKey("Status", statusString);
      if (updates.Received_By !== undefined) {
        setKey("Received_By", receiver);
      }
    }

    if (updates.Update_Date !== undefined)
      setKey("Update_Date", updates.Update_Date);
    if (updates.Update_Day !== undefined)
      setKey("Update_Day", updates.Update_Day);
    if (updates.Update_Time !== undefined)
      setKey("Update_Time", updates.Update_Time);

    return mapped;
  };

  // Load from Supabase or localStorage on mount
  React.useEffect(() => {
    const initData = async () => {
      const getLocalData = () => {
        const savedData = localStorage.getItem("rumal_distribution_data");
        if (savedData) {
          try {
            return JSON.parse(savedData);
          } catch (e) {
            console.error("Failed to parse saved data", e);
          }
        }
        return [];
      };

      if (!isSupabaseConfigured) {
        setSupabaseStatus("disconnected");
        const localData = getLocalData();
        setData(localData);
        saveToLocalExcelFile(localData);
        setIsLoaded(true);
        return;
      }

      // 1. Try Supabase
      console.log("Fetching initial data from members table...");
      const { data: supabaseData, error } = await supabase
        .from("members")
        .select("*");

      if (error) {
        console.error("Supabase Initialization Error:", error);
        setSupabaseStatus("error");
        const detail =
          error.message === "PGRST116"
            ? 'Table "members" not found.'
            : error.message;
        setErrorMessage(detail);
        const localData = getLocalData();
        setData(localData);
        saveToLocalExcelFile(localData);

        // Show a more helpful message for common Supabase issues
        if (
          error.message.includes("FetchError") ||
          error.message.includes("Failed to fetch")
        ) {
          console.warn("Network issue or Supabase URL is incorrect.");
        } else if (error.code === "42P01") {
          console.error('Table "members" does not exist in your database.');
        }
      } else if (supabaseData && supabaseData.length > 0) {
        setSupabaseStatus("connected");
        setErrorMessage(null);
        // Detect keys from first record
        const first = supabaseData[0];
        setDbKeys(Object.keys(first));
        console.log("Detected DB columns:", Object.keys(first));

        const normalized = normalizeData(supabaseData);
        console.log(
          "Successfully loaded and normalized data:",
          normalized.length,
          "records",
        );
        setData(normalized);
        localStorage.setItem(
          "rumal_distribution_data",
          JSON.stringify(normalized),
        );
        saveToLocalExcelFile(normalized);
      } else {
        // Connected but cloud is empty - use local
        console.log(
          'Supabase connected but "members" table is empty or data is missing.',
        );
        setSupabaseStatus("connected");
        setErrorMessage(null);
        const local = getLocalData();
        setData(local);
        saveToLocalExcelFile(local);
      }
      setIsLoaded(true);
    };

    initData();
  }, []);

  const syncToCloud = async (entries) => {
    if (!isSupabaseConfigured || entries.length === 0) return;

    setIsSyncing(true);
    try {
      // Filter out entries without a valid HOF_ID and deduplicate
      const validEntries = entries.filter(
        (e) =>
          e.HOF_ID !== null &&
          e.HOF_ID !== undefined &&
          String(e.HOF_ID).trim() !== "",
      );

      const uniqueEntriesMap = new Map();
      validEntries.forEach((entry) =>
        uniqueEntriesMap.set(entry.HOF_ID, entry),
      );
      const uniqueEntries = Array.from(uniqueEntriesMap.values());

      if (uniqueEntries.length === 0) {
        console.warn("No valid entries to sync (missing HOF_ID)");
        return;
      }

      // Prepare entries for Cloud Sync
      const entriesToPush = uniqueEntries.map((e) => {
        const statusString =
          e.Status === "Given" && e.Received_By
            ? `Given to ${e.Received_By}`
            : e.Status;

        // Exact mapping to user's schema columns
        const payload = {
          Status: statusString,
          Given_To: e.Received_By,
          Full_Name: e.Full_Name,
          HOF_ID: e.HOF_ID,
          AccNo: e.AccNo,
          SN: e.SN,
        };

        // Add id if we have one or generate from HOF_ID (since it's text PK)
        payload.id = e.id || String(e.HOF_ID);

        // Include timestamp fields if they exist
        if (e.Update_Date) payload.Update_Date = e.Update_Date;
        if (e.Update_Day) payload.Update_Day = e.Update_Day;
        if (e.Update_Time) payload.Update_Time = e.Update_Time;

        return payload;
      });

      const { error } = await supabase
        .from("members")
        .upsert(entriesToPush, { onConflict: "id" });

      if (error) {
        // Retry with lowercase mapping if first attempt fails
        if (
          error.message.includes("column") ||
          error.message.includes("not found")
        ) {
          const lowercaseEntries = uniqueEntries.map((e) => {
            const statusString =
              e.Status === "Given" && e.Received_By
                ? `Given to ${e.Received_By}`
                : e.Status;
            return {
              sn: e.SN,
              accno: e.AccNo,
              full_name: e.Full_Name,
              hof_id: e.HOF_ID,
              status: statusString,
              given_to: e.Received_By,
              id: e.id || String(e.HOF_ID),
            };
          });

          const { error: retryError } = await supabase
            .from("members")
            .upsert(lowercaseEntries, { onConflict: "id" });

          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      setSupabaseStatus("connected");
      setErrorMessage(null);
    } catch (error) {
      console.error("Sync Error Details:", error);
      setSupabaseStatus("error");
      setErrorMessage(error.message || "Sync failed");

      let message = "Sync failed.";
      if (error?.message?.includes("404")) {
        message += ' Table "members" not found. Please create it in Supabase.';
      } else if (error?.message?.includes("violates unique constraint")) {
        message += " HOF_ID conflict. Ensure HOF_ID is unique.";
      } else {
        message += ` ${error?.message || ""}. Check console for details.`;
      }

      alert(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpload = async (newData) => {
    // Collect specific issues
    const emptyEntries = newData.filter(
      (e) =>
        e.HOF_ID === null ||
        e.HOF_ID === undefined ||
        String(e.HOF_ID).trim() === "",
    );
    const validEntries = newData.filter(
      (e) =>
        e.HOF_ID !== null &&
        e.HOF_ID !== undefined &&
        String(e.HOF_ID).trim() !== "",
    );

    // Find duplicates and their names
    const duplicateEntries = [];
    const seenIds = new Set();
    const duplicatesAdded = new Set();

    validEntries.forEach((e) => {
      if (seenIds.has(e.HOF_ID)) {
        if (!duplicatesAdded.has(e.HOF_ID)) {
          duplicateEntries.push({
            id: e.HOF_ID,
            name: e.Full_Name || "Unknown",
          });
          duplicatesAdded.add(e.HOF_ID);
        }
      }
      seenIds.add(e.HOF_ID);
    });

    const uniqueEntriesMap = new Map();
    validEntries.forEach((entry) => uniqueEntriesMap.set(entry.HOF_ID, entry));
    const uniqueEntries = Array.from(uniqueEntriesMap.values());

    setImportStats({
      total: newData.length,
      unique: uniqueEntries.length,
      duplicates: duplicateEntries.length,
      skipped: emptyEntries.length,
      duplicateEntries,
      skippedEntries: emptyEntries.map((e) => ({
        name: e.Full_Name || "Unnamed",
        sn: e.SN || "N/A",
      })),
    });

    setData(uniqueEntries);
    localStorage.setItem(
      "rumal_distribution_data",
      JSON.stringify(uniqueEntries),
    );
    saveToLocalExcelFile(uniqueEntries);
    await syncToCloud(uniqueEntries);
  };

  const updateItemRemote = async (hofId, updates) => {
    updateSingleItemLocalExcel(hofId, updates);
    if (isSupabaseConfigured && supabaseStatus === "connected") {
      const currentEntry = data.find(
        (item) => String(item.HOF_ID) === String(hofId),
      );

      try {
        const mappedUpdates = prepareUpdatesWithSchema(updates, currentEntry);
        const recordId = currentEntry?.id;

        let updateError;

        // Strategy: Use 'id' if we have it (it's the primary key)
        if (recordId) {
          const { error } = await supabase
            .from("members")
            .update(mappedUpdates)
            .eq("id", recordId);
          updateError = error;
        } else {
          // Fallback to HOF_ID (Pascal)
          const { error: err1 } = await supabase
            .from("members")
            .update(mappedUpdates)
            .eq("HOF_ID", String(hofId));
          updateError = err1;

          // If no rows affected or error, try hof_id (lower)
          if (updateError) {
            const { error: err2 } = await supabase
              .from("members")
              .update(mappedUpdates)
              .eq("hof_id", String(hofId));
            updateError = err2;
          }
        }

        if (updateError) {
          console.error("Remote update failed:", updateError);
        } else {
          console.log("Remote update successful for:", hofId);
        }
      } catch (err) {
        console.error("Remote update fatal error:", err);
      }
    }
  };

  const getTimestampFields = () => {
    const now = new Date();
    return {
      Update_Date: now.toLocaleDateString("en-GB"),
      Update_Day: now.toLocaleDateString("en-GB", { weekday: "long" }),
      Update_Time: now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  };

  const handleStatusChange = async (hofId, newStatus) => {
    const timestamps = getTimestampFields();
    setData((prev) =>
      prev.map((item) =>
        String(item.HOF_ID) === String(hofId)
          ? { ...item, Status: newStatus, ...timestamps }
          : item,
      ),
    );

    // Remove from dismissed list so it shows up as a fresh update
    setDismissedRecentIds((prev) => {
      const next = new Set(prev);
      next.delete(hofId);
      return next;
    });

    await updateItemRemote(hofId, { Status: newStatus, ...timestamps });
  };

  const handleReceivedByChange = async (hofId, newName) => {
    let updatedStatus;
    const timestamps = getTimestampFields();

    setData((prev) =>
      prev.map((item) => {
        if (String(item.HOF_ID) === String(hofId)) {
          const shouldUpdateStatus =
            newName.trim() !== "" && item.Status === "Pending";
          const newStatus = shouldUpdateStatus ? "Given" : item.Status;
          updatedStatus = newStatus;
          return {
            ...item,
            Received_By: newName,
            Status: newStatus,
            ...timestamps,
          };
        }
        return item;
      }),
    );

    // Remove from dismissed list so it shows up as a fresh update
    setDismissedRecentIds((prev) => {
      const next = new Set(prev);
      next.delete(hofId);
      return next;
    });

    await updateItemRemote(hofId, {
      Received_By: newName,
      ...(updatedStatus ? { Status: updatedStatus } : {}),
      ...timestamps,
    });
  };

  const handleExport = (dataToExport) => {
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DistributionStatus");

    const suffix = dataToExport.length < data.length ? "_Filtered" : "";
    XLSX.writeFile(
      wb,
      `Distribution_Update${suffix}_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleReset = async () => {
    setData([]);
    localStorage.removeItem("rumal_distribution_data");
    saveToLocalExcelFile([]);

    if (isSupabaseConfigured && supabaseStatus === "connected") {
      const { error } = await supabase
        .from("members")
        .delete()
        .neq("HOF_ID", "0"); // Delete everything
      if (error) console.error("Error clearing Supabase:", error);
    }

    setShowResetModal(false);
  };

  const analytics = React.useMemo(
    () => ({
      total: data.length,
      distributed: data.filter((item) => item.Status === "Given").length,
      remaining: data.filter(
        (item) => item.Status === "Pending" || item.Status === "Not Allowed",
      ).length,
    }),
    [data],
  );

  const handleTitleChange = (newTitle) => {
    setAppTitle(newTitle);
    localStorage.setItem("app_distribution_title", newTitle);
  };

  const handleRefresh = async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const { data: supabaseData, error } = await supabase
        .from("members")
        .select("*");

      if (error) throw error;
      if (supabaseData) {
        const normalized = normalizeData(supabaseData);
        setData(normalized);
        localStorage.setItem(
          "rumal_distribution_data",
          JSON.stringify(normalized),
        );
        setLastRefreshed(new Date());
      }
    } catch (e) {
      console.error("Refresh failed", e);
      alert("Failed to refresh: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearItemUpdateInfo = async (hofId) => {
    const updated = data.map((item) =>
      String(item.HOF_ID) === String(hofId)
        ? {
            ...item,
            Update_Date: undefined,
            Update_Day: undefined,
            Update_Time: undefined,
          }
        : item,
    );
    setData(updated);
    localStorage.setItem("rumal_distribution_data", JSON.stringify(updated));
    await updateItemRemote(hofId, {
      Update_Date: null,
      Update_Day: null,
      Update_Time: null,
    });
  };

  const handleDismissRecent = (hofId) => {
    setDismissedRecentIds((prev) => {
      const next = new Set(prev);
      next.add(hofId);
      return next;
    });
  };

  const handleDismissAllRecent = () => {
    const currentIds = recentUpdates.map((item) => item.HOF_ID);
    setDismissedRecentIds((prev) => {
      const next = new Set(prev);
      currentIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const recentUpdates = React.useMemo(() => {
    return [...data]
      .filter(
        (item) => item.Update_Date && !dismissedRecentIds.has(item.HOF_ID),
      )
      .sort((a, b) => {
        const timeA = `${a.Update_Date} ${a.Update_Time}`;
        const timeB = `${b.Update_Date} ${b.Update_Time}`;
        return timeB.localeCompare(timeA);
      })
      .slice(0, 5);
  }, [data, dismissedRecentIds]);

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 text-slate-200">
      {/* Custom Confirmation Modal */}
      <ResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
      />

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <Navbar
        isSyncing={isSyncing}
        supabaseStatus={supabaseStatus}
        errorMessage={errorMessage}
        onRefresh={handleRefresh}
        onResetClick={() => setShowResetModal(true)}
        showResetButton={data.length > 0}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 relative">
        <TitleHeader appTitle={appTitle} onChangeTitle={handleTitleChange} />

        <AnimatePresence mode="wait">
          {data.length === 0 ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-2xl mx-auto py-12"
            >
              <ExcelUpload onUpload={handleUpload} />
            </motion.div>
          ) : (
            <motion.div
              key="data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AnalyticsHeader analytics={analytics} />

              <RecentUpdates
                recentUpdates={recentUpdates}
                lastRefreshed={lastRefreshed}
                onClearAllRecent={handleDismissAllRecent}
                onDismissRecent={handleDismissRecent}
                onCardClick={scrollToHofId}
              />

              <DataIntegrityReport
                importStats={importStats}
                onClose={() => setImportStats(null)}
              />

              <DistributionTable
                data={data}
                onStatusChange={handleStatusChange}
                onReceivedByChange={handleReceivedByChange}
                onClearUpdateInfo={handleClearItemUpdateInfo}
                onExport={handleExport}
                onImportNew={() => setShowResetModal(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
