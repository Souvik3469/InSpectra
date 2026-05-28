import React from "react";
import { Terminal, Code2, Network, Minus, X } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { usePanelStore } from "../store";
import type { TabId } from "../../shared/types";

interface Props {
  onStartDrag: (e: React.MouseEvent) => void;
}

const TABS: Array<{
  id: TabId;
  label: string;
  Icon: React.FC<LucideProps>;
}> = [
  { id: "console", label: "Console", Icon: Terminal },
  { id: "snippets", label: "Snippets", Icon: Code2 },
  { id: "network", label: "Network", Icon: Network },
];

export default function Header({ onStartDrag }: Props) {
  const { activeTab, setActiveTab, isMinimized, setMinimized, setVisible } =
    usePanelStore();

  return (
    <div
      className="flex items-center gap-1.5 h-10 pl-3 pr-2 bg-insp-surface border-b border-insp-border cursor-grab active:cursor-grabbing shrink-0 select-none"
      onMouseDown={onStartDrag}
    >
      {/* Logo */}
      <div className="flex items-center gap-[7px] shrink-0">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="1"
            y="1"
            width="14"
            height="14"
            rx="3.5"
            fill="#58a6ff"
            fillOpacity="0.15"
          />
          <path
            d="M4 5L7.5 8.5L4 12"
            stroke="#58a6ff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 12H12.5"
            stroke="#58a6ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[12px] font-semibold text-insp-text tracking-[0.02em]">
          InSpectra
        </span>
      </div>

      {/* Tabs — stop drag propagation so clicks still register */}
      <div
        className="flex items-center gap-2 flex-1 px-1"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`inline-flex items-center gap-[5px] px-[9px] py-1 rounded-insp-sm text-[11.5px] font-medium whitespace-nowrap select-none transition-colors duration-[120ms] ${
              activeTab === id
                ? "text-insp-accent bg-[rgba(88,166,255,0.1)]"
                : "text-insp-text-muted hover:text-insp-text hover:bg-insp-surface-2"
            }`}
            onClick={() => {
              setActiveTab(id);
              if (isMinimized) setMinimized(false);
            }}
            title={label}
          >
            <Icon size={12} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Window controls */}
      <div
        className="flex items-center gap-0.5 shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-insp-sm text-insp-text-muted hover:text-insp-text hover:bg-insp-surface-2 transition-colors duration-[120ms]"
          onClick={() => setMinimized(!isMinimized)}
          title={isMinimized ? "Restore" : "Minimize"}
        >
          <Minus size={13} />
        </button>
        <button
          className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-insp-sm text-insp-text-muted hover:text-insp-error hover:bg-[rgba(248,81,73,0.12)] transition-colors duration-[120ms]"
          onClick={() => setVisible(false)}
          title="Close (click toolbar icon to reopen)"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
