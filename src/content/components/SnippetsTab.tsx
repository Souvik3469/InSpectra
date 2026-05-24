import React, { useState, useRef } from "react";
import {
  Play,
  Trash2,
  Search,
  Code2,
  Pencil,
  Check,
  X,
  Download,
  Upload,
} from "lucide-react";
import { usePanelStore } from "../store";
import { uid } from "../utils/uid";
import type { Snippet } from "../../shared/types";

function exportSnippets(snippets: Snippet[]) {
  const blob = new Blob([JSON.stringify(snippets, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inspectra-snippets.json";
  a.click();
  URL.revokeObjectURL(url);
}

export default function SnippetsTab() {
  const {
    snippets,
    loadSnippetToEditor,
    deleteSnippet,
    updateSnippet,
    addSnippet,
  } = usePanelStore();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const query = search.toLowerCase();
  const filtered = query
    ? snippets.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query),
      )
    : snippets;

  function startEdit(snippet: Snippet) {
    setEditingId(snippet.id);
    setEditingName(snippet.name);
  }

  function commitEdit() {
    if (editingId && editingName.trim())
      updateSnippet(editingId, { name: editingName.trim() });
    setEditingId(null);
    setEditingName("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Snippet[];
        if (!Array.isArray(data)) throw new Error("Invalid format");
        data.forEach((s) => {
          if (s.name && s.code) {
            addSnippet({
              ...s,
              id: uid(),
              createdAt: s.createdAt ?? Date.now(),
              updatedAt: Date.now(),
            });
          }
        });
      } catch {
        setImportError('Import failed: invalid JSON format')
        setTimeout(() => setImportError(null), 3000)
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-1.5 px-2.5 py-2 border-b border-qc-border shrink-0">
        {/* Search */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-qc-surface-2 border border-qc-border rounded-qc-sm focus-within:border-qc-accent transition-colors duration-[120ms]">
          <Search size={13} className="text-qc-text-muted shrink-0" />
          <input
            className="flex-1 text-qc-text text-[12px] min-w-0 placeholder:text-qc-text-subtle"
            type="text"
            placeholder="Search snippets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Export / Import */}
        <div className="flex gap-1">
          <button
            className="inline-flex items-center gap-1 px-[7px] py-[2px] rounded-qc-sm text-[11px] font-medium border border-transparent text-qc-text-muted hover:text-qc-text hover:bg-qc-surface-2 hover:border-qc-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms]"
            onClick={() => snippets.length > 0 && exportSnippets(snippets)}
            disabled={snippets.length === 0}
            title="Export snippets as JSON"
          >
            <Download size={11} />
            Export
          </button>
          <button
            className="inline-flex items-center gap-1 px-[7px] py-[2px] rounded-qc-sm text-[11px] font-medium border border-transparent text-qc-text-muted hover:text-qc-text hover:bg-qc-surface-2 hover:border-qc-border transition-colors duration-[120ms]"
            onClick={() => importRef.current?.click()}
            title="Import snippets from JSON"
          >
            <Upload size={11} />
            Import
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        {importError && (
          <p className="text-[11px] text-qc-error px-1">{importError}</p>
        )}
      </div>

      {/* Snippet list */}
      <div className="flex-1 overflow-y-auto p-1.5 qc-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 px-5 py-10 text-qc-text-muted text-center h-full">
            <Code2 size={36} strokeWidth={1.2} />
            <p className="text-[12px] max-w-[240px] leading-relaxed">
              {snippets.length === 0
                ? "No snippets yet.\nWrite code in the Console tab and click Save."
                : "No snippets match your search."}
            </p>
          </div>
        ) : (
          filtered.map((snippet) => (
            <div
              key={snippet.id}
              className="px-3 py-2.5 border border-qc-border rounded-qc-sm mb-1.5 bg-qc-surface hover:border-qc-border-light hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all duration-[120ms]"
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-[7px]">
                {editingId === snippet.id ? (
                  <div className="flex items-center gap-0.5 flex-1 min-w-0">
                    <input
                      className="flex-1 min-w-0 px-1.5 py-[2px] bg-qc-surface-2 border border-qc-accent rounded-qc-sm text-qc-text text-[12.5px] font-semibold"
                      value={editingName}
                      autoFocus
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onBlur={commitEdit}
                    />
                    <button
                      className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-qc-sm text-qc-text-muted hover:text-qc-text hover:bg-qc-surface-2 transition-colors duration-[120ms]"
                      onClick={commitEdit}
                      title="Save"
                    >
                      <Check size={11} />
                    </button>
                    <button
                      className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-qc-sm text-qc-text-muted hover:text-qc-text hover:bg-qc-surface-2 transition-colors duration-[120ms]"
                      onClick={cancelEdit}
                      title="Cancel"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <span
                    className="text-[12.5px] font-semibold text-qc-text cursor-pointer hover:text-qc-accent transition-colors duration-[120ms]"
                    title="Click to rename"
                    onClick={() => startEdit(snippet)}
                  >
                    {snippet.name}
                  </span>
                )}

                <div className="flex gap-0.5">
                  {editingId !== snippet.id && (
                    <button
                      className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-qc-sm text-qc-text-muted hover:text-qc-text hover:bg-qc-surface-2 transition-colors duration-[120ms]"
                      onClick={() => startEdit(snippet)}
                      title="Rename"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                  <button
                    className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-qc-sm text-qc-text-muted hover:text-qc-text hover:bg-qc-surface-2 transition-colors duration-[120ms]"
                    onClick={() => loadSnippetToEditor(snippet)}
                    title="Load into editor"
                  >
                    <Play size={12} />
                  </button>
                  <button
                    className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-qc-sm text-qc-text-muted hover:text-qc-error transition-colors duration-[120ms]"
                    onClick={() => {
                      if (window.confirm(`Delete snippet "${snippet.name}"?`)) {
                        deleteSnippet(snippet.id);
                      }
                    }}
                    title="Delete snippet"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Code preview */}
              <pre className="font-mono text-[11px] text-qc-text-muted whitespace-pre-wrap break-all leading-[1.55] max-h-[52px] overflow-hidden opacity-80">
                {snippet.code.slice(0, 140)}
                {snippet.code.length > 140 ? "…" : ""}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
