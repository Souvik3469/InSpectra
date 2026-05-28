import { useState } from "react";
import { ChevronLeft, FileJson, FileCode2, Check } from "lucide-react";
import { CopyBtn } from "../ui/CopyBtn";
import { BodyBlock } from "./BodyBlock";
import { HeadersTable } from "./HeadersTable";
import { reportToJson, harToJson, toCurl } from "../../utils/reportGenerator";
import { methodColor, statusColor, shortUrl, fmtMs } from "../../utils/network";
import type { NetworkRequest } from "../../../shared/types";

type DetailTab = "request" | "response" | "curl";

interface Props {
  req: NetworkRequest;
  onClose: () => void;
}

export function DetailView({ req, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>("response");
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedHar, setCopiedHar] = useState(false);

  function copyReport() {
    navigator.clipboard.writeText(reportToJson([req])).then(() => {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1500);
    });
  }

  function copyHar() {
    navigator.clipboard.writeText(harToJson([req])).then(() => {
      setCopiedHar(true);
      setTimeout(() => setCopiedHar(false), 1500);
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-insp-surface border-b border-insp-border shrink-0 min-h-[40px]">
        <button
          className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-insp-sm text-insp-text-muted hover:text-insp-text hover:bg-insp-surface-2 transition-colors duration-[120ms]"
          onClick={onClose}
          title="Back"
        >
          <ChevronLeft size={14} />
        </button>

        <span
          className={`font-mono text-[11px] font-bold shrink-0 ${methodColor(req.method)}`}
        >
          {req.method}
        </span>

        <span
          className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-insp-text"
          title={req.url}
        >
          {shortUrl(req.url)}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {req.error ? (
            <span className="font-mono text-[11px] font-semibold text-insp-error">
              ERR
            </span>
          ) : req.pending ? (
            <span className="font-mono text-[11px] font-semibold text-insp-text-subtle">
              …
            </span>
          ) : (
            <span
              className={`font-mono text-[11px] font-semibold ${statusColor(req.status)}`}
            >
              {req.status}
            </span>
          )}
          {req.duration != null && (
            <span className="font-mono text-[11px] text-insp-text-muted">
              {fmtMs(req.duration)}
            </span>
          )}

          {/* Copy QC JSON report */}
          <button
            className="inline-flex items-center gap-1 px-[7px] py-[2px] rounded-insp-sm border border-insp-border text-insp-text-muted text-[11px] font-medium hover:text-insp-text hover:bg-insp-surface-2 transition-colors duration-[120ms]"
            onClick={copyReport}
            title="Copy as QC JSON report (full metadata for developer handoff)"
          >
            {copiedJson ? <Check size={11} /> : <FileJson size={11} />}
            {copiedJson ? "Copied!" : "JSON"}
          </button>

          {/* Copy as HAR (importable by Postman / Insomnia / DevTools) */}
          <button
            className="inline-flex items-center gap-1 px-[7px] py-[2px] rounded-insp-sm border border-insp-border text-insp-text-muted text-[11px] font-medium hover:text-insp-text hover:bg-insp-surface-2 transition-colors duration-[120ms]"
            onClick={copyHar}
            title="Copy as HAR — import directly into Postman, Insomnia, or Chrome DevTools"
          >
            {copiedHar ? <Check size={11} /> : <FileCode2 size={11} />}
            {copiedHar ? "Copied!" : "HAR"}
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex px-2 bg-insp-surface border-b border-insp-border shrink-0">
        {(["request", "response", "curl"] as DetailTab[]).map((t) => (
          <button
            key={t}
            className={`px-5 py-2.5 text-[12px] font-medium border-b-2 transition-colors duration-[120ms] ${
              tab === t
                ? "text-insp-accent border-insp-accent"
                : "text-insp-text-muted border-transparent hover:text-insp-text"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "curl" ? "cURL" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2 insp-scrollbar">
        {tab === "request" && (
          <>
            {/* General — full URL + method + status, selectable */}
            <div className="px-3 pb-3 border-b border-insp-border">
              <h4 className="text-[10.5px] font-semibold text-insp-text-muted uppercase tracking-[0.06em] py-1.5">
                General
              </h4>
              <div className="flex flex-col gap-[5px]">
                <div className="flex gap-2 text-[11px]">
                  <span className="shrink-0 w-[88px] text-insp-text-subtle font-mono">
                    Request URL
                  </span>
                  <span className="flex-1 text-insp-text font-mono break-all select-text">
                    {req.url}
                  </span>
                </div>
                <div className="flex gap-2 text-[11px]">
                  <span className="shrink-0 w-[88px] text-insp-text-subtle font-mono">
                    Method
                  </span>
                  <span
                    className={`font-mono font-bold ${methodColor(req.method)}`}
                  >
                    {req.method}
                  </span>
                </div>
                {req.status != null && (
                  <div className="flex gap-2 text-[11px]">
                    <span className="shrink-0 w-[88px] text-insp-text-subtle font-mono">
                      Status
                    </span>
                    <span
                      className={`font-mono font-semibold ${statusColor(req.status)}`}
                    >
                      {req.status}
                      {req.statusText ? ` ${req.statusText}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-3 pb-2.5 border-b border-insp-border">
              <h4 className="text-[10.5px] font-semibold text-insp-text-muted uppercase tracking-[0.06em] py-1.5">
                Request Headers
              </h4>
              <HeadersTable headers={req.requestHeaders} />
            </div>
            {req.requestBody && (
              <BodyBlock title="Body" text={req.requestBody} />
            )}
          </>
        )}

        {tab === "response" &&
          (req.error ? (
            <p className="px-3 py-3 text-[12px] text-insp-error font-mono">
              {req.error}
            </p>
          ) : req.pending ? (
            <p className="px-3 py-4 text-[12px] text-insp-text-subtle italic">
              Request in progress…
            </p>
          ) : (
            <>
              <div className="px-3 pb-2.5 border-b border-insp-border">
                <h4 className="text-[10.5px] font-semibold text-insp-text-muted uppercase tracking-[0.06em] py-1.5">
                  Response Headers
                </h4>
                <HeadersTable headers={req.responseHeaders} />
              </div>
              {req.responseBody && (
                <BodyBlock title="Body" text={req.responseBody} />
              )}
            </>
          ))}

        {tab === "curl" && (
          <BodyBlock title="cURL Command" text={toCurl(req)} />
        )}
      </div>
    </div>
  );
}
