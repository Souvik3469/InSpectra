import { useState, useRef, useEffect } from "react";
import { Trash2, Download } from "lucide-react";
import { usePanelStore } from "../store";
import { DetailView } from "./network/DetailView";
import { downloadReport, downloadHar } from "../utils/reportGenerator";
import type { NetworkRequest } from "../../shared/types";

type MethodFilter =
  | "ALL"
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OTHER";

const METHOD_FILTERS: MethodFilter[] = [
  "ALL",
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OTHER",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function methodColor(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "text-qc-accent";
    case "POST":
      return "text-qc-success";
    case "PUT":
      return "text-qc-warn";
    case "DELETE":
      return "text-qc-error";
    case "PATCH":
      return "text-qc-return";
    default:
      return "text-qc-text-muted";
  }
}

function statusColor(status?: number) {
  if (!status) return "";
  if (status < 300) return "text-qc-success";
  if (status < 400) return "text-qc-info";
  if (status < 500) return "text-qc-warn";
  return "text-qc-error";
}

function fmtMs(ms?: number) {
  if (ms == null) return "";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || "");
  } catch {
    return url;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NetworkTab() {
  const {
    networkRequests,
    clearNetworkRequests,
    isRecording,
    toggleRecording,
  } = usePanelStore();
  const [urlFilter, setUrlFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("ALL");
  const [selected, setSelected] = useState<NetworkRequest | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom as new requests arrive
  useEffect(() => {
    if (isRecording && !selected && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [networkRequests.length, isRecording, selected]);

  // Keep detail view in sync with live request updates (pending → resolved)
  useEffect(() => {
    if (selected) {
      const updated = networkRequests.find((r) => r.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [networkRequests]);

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exportSelectedJson() {
    const reqs = networkRequests.filter((r) => checkedIds.has(r.id));
    if (reqs.length === 0) return;
    downloadReport(reqs);
    setCheckedIds(new Set());
  }

  function exportSelectedHar() {
    const reqs = networkRequests.filter((r) => checkedIds.has(r.id));
    if (reqs.length === 0) return;
    downloadHar(reqs);
    setCheckedIds(new Set());
  }

  const sorted = [...networkRequests].sort((a, b) => a.timestamp - b.timestamp);

  const filtered = sorted.filter((r) => {
    if (urlFilter && !r.url.toLowerCase().includes(urlFilter.toLowerCase()))
      return false;
    if (methodFilter !== "ALL") {
      const known = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      if (methodFilter === "OTHER") {
        if (known.includes(r.method.toUpperCase())) return false;
      } else if (r.method.toUpperCase() !== methodFilter) {
        return false;
      }
    }
    return true;
  });

  const allSelected =
    filtered.length > 0 && checkedIds.size === filtered.length;
  const someSelected = checkedIds.size > 0 && !allSelected;

  if (selected) {
    return <DetailView req={selected} onClose={() => setSelected(null)} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-qc-surface border-b border-qc-border shrink-0">
        {/* Record toggle */}
        <button
          className={`inline-flex items-center gap-[5px] px-2 py-[3px] rounded-qc-sm text-[11px] font-medium shrink-0 border transition-colors duration-[120ms] ${
            isRecording
              ? "text-qc-text border-qc-border-light bg-qc-surface-2"
              : "text-qc-text-muted border-qc-border bg-qc-surface-2"
          }`}
          onClick={toggleRecording}
          title={isRecording ? "Pause recording" : "Resume recording"}
        >
          <span
            className={`w-[7px] h-[7px] rounded-full shrink-0 transition-colors duration-[120ms] ${
              isRecording ? "qc-record-dot--active" : "bg-qc-text-subtle"
            }`}
          />
          {isRecording ? "Recording" : "Paused"}
        </button>

        {/* URL filter */}
        <input
          className="flex-1 min-w-0 px-2 py-[3px] bg-qc-surface-2 border border-qc-border rounded-qc-sm text-qc-text text-[11.5px] focus:border-qc-accent transition-colors duration-[120ms] placeholder:text-qc-text-subtle"
          type="text"
          placeholder="Filter URL…"
          value={urlFilter}
          onChange={(e) => setUrlFilter(e.target.value)}
        />

        {/* Method filter */}
        <select
          className="px-[6px] py-[3px] bg-qc-surface-2 border border-qc-border rounded-qc-sm text-qc-text text-[11px] cursor-pointer shrink-0 appearance-none"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
        >
          {METHOD_FILTERS.map((m) => (
            <option
              key={m}
              value={m}
              style={{ background: "#21262d", color: "#e6edf3" }}
            >
              {m === "ALL" ? "All" : m}
            </option>
          ))}
        </select>

        {/* Export selected — two format buttons appear when any row is checked */}
        {checkedIds.size > 0 && (
          <>
            <button
              className="inline-flex items-center gap-1 px-2 py-[3px] rounded-qc-sm border border-qc-accent text-qc-accent text-[11px] font-medium hover:bg-[rgba(88,166,255,0.1)] transition-colors duration-[120ms] shrink-0"
              onClick={exportSelectedJson}
              title={`Download ${checkedIds.size} request${checkedIds.size > 1 ? "s" : ""} as QC JSON report`}
            >
              <Download size={11} />
              JSON ({checkedIds.size})
            </button>
            <button
              className="inline-flex items-center gap-1 px-2 py-[3px] rounded-qc-sm border border-qc-accent text-qc-accent text-[11px] font-medium hover:bg-[rgba(88,166,255,0.1)] transition-colors duration-[120ms] shrink-0"
              onClick={exportSelectedHar}
              title={`Download ${checkedIds.size} request${checkedIds.size > 1 ? "s" : ""} as HAR (Postman / Insomnia / DevTools)`}
            >
              <Download size={11} />
              HAR ({checkedIds.size})
            </button>
          </>
        )}

        {/* Clear */}
        <button
          className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-qc-sm text-qc-text-muted hover:text-qc-text hover:bg-qc-surface-2 transition-colors duration-[120ms]"
          onClick={() => {
            clearNetworkRequests();
            setCheckedIds(new Set());
          }}
          title="Clear all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Column headers */}
      {filtered.length > 0 && (
        <div className="flex items-center px-2 py-[3px] bg-qc-surface border-b border-qc-border shrink-0">
          <span
            className="w-[26px] shrink-0 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              allSelected || someSelected
                ? setCheckedIds(new Set())
                : setCheckedIds(new Set(filtered.map((r) => r.id)));
            }}
          >
            <input
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              type="checkbox"
              className="w-[9px] h-[9px] accent-qc-accent cursor-pointer"
              checked={allSelected}
              onChange={() => {}}
              tabIndex={-1}
            />
          </span>
          <span className="w-[54px] shrink-0 text-[10.5px] font-semibold text-qc-text-subtle uppercase tracking-[0.04em]">
            Method
          </span>
          <span className="flex-1 min-w-0 text-[10.5px] font-semibold text-qc-text-subtle uppercase tracking-[0.04em]">
            URL
          </span>
          <span className="w-[44px] shrink-0 text-[10.5px] font-semibold text-qc-text-subtle uppercase tracking-[0.04em]">
            Status
          </span>
          <span className="w-[44px] shrink-0 text-right text-[10.5px] font-semibold text-qc-text-subtle uppercase tracking-[0.04em]">
            Time
          </span>
        </div>
      )}

      {/* Request list */}
      <div
        className="flex-1 overflow-y-auto min-h-0 qc-scrollbar"
        ref={listRef}
      >
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-qc-text-subtle italic">
            {networkRequests.length === 0
              ? isRecording
                ? "Waiting for network requests…"
                : "Recording is paused."
              : "No requests match the current filter."}
          </div>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              className={`flex items-start px-2 py-1.5 border-b border-[rgba(48,54,61,0.6)] cursor-pointer text-[11.5px] gap-1 transition-colors duration-[80ms] ${
                checkedIds.has(req.id)
                  ? "bg-[rgba(88,166,255,0.07)]"
                  : req.error
                    ? "bg-[rgba(248,81,73,0.04)] hover:bg-[rgba(248,81,73,0.07)]"
                    : "hover:bg-white/[0.03]"
              }`}
              onClick={() => setSelected(req)}
            >
              {/* Checkbox */}
              <span
                className="w-[26px] shrink-0 flex items-center justify-center pt-[2px]"
                onClick={(e) => toggleCheck(req.id, e)}
              >
                <input
                  type="checkbox"
                  className="w-[9px] h-[9px] accent-qc-accent cursor-pointer"
                  checked={checkedIds.has(req.id)}
                  onChange={() => {}} // controlled via onClick on parent span
                  tabIndex={-1}
                />
              </span>

              {/* Method */}
              <span
                className={`w-[54px] shrink-0 font-mono text-[11px] font-bold overflow-hidden text-ellipsis whitespace-nowrap ${methodColor(req.method)}`}
              >
                {req.method}
              </span>

              {/* URL + initiator */}
              <span className="flex-1 min-w-0 flex flex-col gap-px px-1">
                <span
                  className="overflow-hidden text-ellipsis whitespace-nowrap text-qc-text font-mono text-[11px]"
                  title={req.url}
                >
                  {shortUrl(req.url)}
                </span>
                {req.initiator && (
                  <span className="font-mono text-[10px] text-qc-text-subtle overflow-hidden text-ellipsis whitespace-nowrap">
                    {req.initiator}
                  </span>
                )}
              </span>

              {/* Status */}
              <span
                className={`w-[44px] shrink-0 font-mono text-[11px] font-semibold ${
                  req.error
                    ? "text-qc-error"
                    : req.pending
                      ? "text-qc-text-subtle"
                      : statusColor(req.status)
                }`}
              >
                {req.error ? "ERR" : req.pending ? "…" : req.status}
              </span>

              {/* Time */}
              <span className="w-[44px] shrink-0 text-right text-[11px] text-qc-text-subtle">
                {req.pending ? "" : fmtMs(req.duration)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
