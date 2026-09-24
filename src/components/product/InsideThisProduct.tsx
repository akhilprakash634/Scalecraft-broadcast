'use client';

import { useState } from 'react';
import {
  Sparkles, Search, Wrench, FileText, Video, BookOpen,
  LayoutDashboard, Zap, Copy, Check, ChevronRight,
  ExternalLink, List, Code2, Download, Image as ImageIcon,
  TrendingUp, Clock, Link as LinkIcon, AlertCircle, Play
} from 'lucide-react';

/* ─── Icon Map ─────────────────────────────────────────────── */
const ICON_MAP: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  search: Search,
  tools: Wrench, wrench: Wrench,
  file: FileText, filetext: FileText,
  video: Video,
  book: BookOpen, guide: BookOpen,
  dashboard: LayoutDashboard, layout: LayoutDashboard,
  zap: Zap,
  list: List,
  code: Code2,
  download: Download,
  image: ImageIcon,
  metric: TrendingUp,
  timeline: Clock,
  link: LinkIcon,
  callout: AlertCircle,
};

/* ─── Types ─────────────────────────────────────────────────── */
export type ExplorerItemType =
  | 'text' | 'prompt' | 'video' | 'image' | 'gallery'
  | 'table' | 'timeline' | 'code' | 'download' | 'button'
  | 'callout' | 'metric' | 'link' | 'checklist';

export interface ExplorerItem {
  title: string;
  description?: string;
  type?: ExplorerItemType;
  url?: string;
  src?: string;
  items?: string[];           // checklist rows / gallery srcs
  preview?: string;           // prompt copy text / code content
  caption?: string;           // for image/video
  value?: string;             // for metric
  unit?: string;              // for metric
  rows?: string[][];          // for table [header, ...rows]
  callout_type?: 'info' | 'warning' | 'success' | 'tip';
  steps?: { title: string; desc?: string }[]; // for timeline
}

export interface ExplorerSection {
  title: string;
  icon?: string;
  items: ExplorerItem[];
}

/* ─── Item Renderer ─────────────────────────────────────────── */
function ItemCard({ item }: { item: ExplorerItem }) {
  const [copied, setCopied] = useState(false);
  const type = item.type || 'text';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* PROMPT */
  if (type === 'prompt') {
    return (
      <div className="relative bg-bg-secondary border border-border-primary rounded-xl p-4 group hover:border-border-dark transition-all shadow-xs">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="text-[10px] font-extrabold text-accent bg-accent/5 px-2 py-0.5 rounded uppercase tracking-wider border border-accent/10">AI Prompt</span>
          <button
            onClick={() => handleCopy(item.preview || item.description || item.title)}
            className="flex items-center gap-1.5 text-[10.5px] font-bold text-text-muted hover:text-text-primary transition-colors bg-white hover:bg-bg-tertiary border border-border-dark px-2.5 py-1 rounded-md shadow-2xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Prompt'}
          </button>
        </div>
        <p className="text-[13.5px] font-bold text-text-primary leading-snug mb-1">{item.title}</p>
        {item.description && <p className="text-[12px] text-text-muted leading-relaxed mb-2.5">{item.description}</p>}
        {item.preview && (
          <div className="mt-2 bg-white rounded-lg p-3 font-mono text-[11px] text-text-primary leading-relaxed whitespace-pre-wrap border border-border-primary max-h-32 overflow-y-auto">
            {item.preview}
          </div>
        )}
      </div>
    );
  }

  /* CODE */
  if (type === 'code') {
    return (
      <div className="relative bg-bg-secondary border border-border-primary rounded-xl overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-primary bg-white">
          <span className="text-[10.5px] font-bold text-text-muted font-mono">{item.title}</span>
          <button
            onClick={() => handleCopy(item.preview || '')}
            className="flex items-center gap-1 text-[10.5px] text-text-muted hover:text-text-primary transition-colors font-bold cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="p-4 font-mono text-[11px] text-text-primary leading-relaxed overflow-x-auto whitespace-pre-wrap bg-white">
          {item.preview}
        </pre>
      </div>
    );
  }

  /* CHECKLIST */
  if (type === 'checklist') {
    return (
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-4 shadow-xs">
        <p className="text-[13.5px] font-bold text-text-primary mb-2.5">{item.title}</p>
        {item.description && <p className="text-[12px] text-text-muted mb-3">{item.description}</p>}
        {item.items && (
          <ul className="space-y-2">
            {item.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[12.5px] text-text-primary font-medium">
                <span className="text-green font-bold text-[12px] shrink-0 mt-0.5">✓</span>
                {it}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* METRIC */
  if (type === 'metric') {
    return (
      <div className="bg-accent/5 border border-accent/15 rounded-xl p-4 text-center">
        <div className="text-3xl font-heading font-black text-accent leading-tight">
          {item.value}
          {item.unit && <span className="text-lg text-accent/80 ml-1">{item.unit}</span>}
        </div>
        <p className="text-[13px] font-bold text-text-primary mt-1">{item.title}</p>
        {item.description && <p className="text-[11px] text-text-muted mt-0.5">{item.description}</p>}
      </div>
    );
  }

  /* CALLOUT */
  if (type === 'callout') {
    const calloutStyles: Record<string, string> = {
      info: 'bg-accent/5 border-accent/15 text-text-primary',
      warning: 'bg-amber-50 border-amber-200 text-amber-900',
      success: 'bg-green-bg border-green/20 text-green',
      tip: 'bg-purple-50 border-purple-200 text-purple-900',
    };
    const style = calloutStyles[item.callout_type || 'info'];
    return (
      <div className={`border rounded-xl p-4 ${style}`}>
        <p className="text-[13.5px] font-bold mb-1">{item.title}</p>
        {item.description && <p className="text-[12px] leading-relaxed opacity-90">{item.description}</p>}
      </div>
    );
  }

  /* TIMELINE */
  if (type === 'timeline' && item.steps) {
    return (
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-4 space-y-3 shadow-xs">
        <p className="text-[13.5px] font-bold text-text-primary mb-3">{item.title}</p>
        {item.steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[11px] font-black text-accent shrink-0">
                {i + 1}
              </div>
              {i < item.steps!.length - 1 && <div className="w-px flex-1 bg-border-dark mt-1" />}
            </div>
            <div className="pb-3">
              <p className="text-[12.5px] font-bold text-text-primary">{step.title}</p>
              {step.desc && <p className="text-[11.5px] text-text-muted mt-0.5">{step.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* TABLE */
  if (type === 'table' && item.rows) {
    const [header, ...bodyRows] = item.rows;
    return (
      <div className="overflow-x-auto rounded-xl border border-border-primary bg-white shadow-xs">
        <table className="w-full text-[12px]">
          {header && (
            <thead className="bg-bg-secondary border-b border-border-primary">
              <tr>{header.map((h, i) => <th key={i} className="px-3.5 py-2.5 text-left text-text-primary font-bold">{h}</th>)}</tr>
            </thead>
          )}
          <tbody className="divide-y divide-border-primary">
            {bodyRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-bg-secondary/50">
                {row.map((cell, ci) => <td key={ci} className="px-3.5 py-2.5 text-text-muted">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* VIDEO */
  if (type === 'video') {
    return (
      <div className="space-y-2">
        <p className="text-[13.5px] font-bold text-text-primary">{item.title}</p>
        {item.src ? (
          <div className="aspect-video rounded-xl overflow-hidden border border-border-dark shadow-xs bg-black">
            {item.src.includes('youtube') || item.src.includes('youtu.be') ? (
              <iframe src={item.src} className="w-full h-full" allowFullScreen />
            ) : item.src.includes('loom') ? (
              <iframe src={item.src} className="w-full h-full" allowFullScreen />
            ) : (
              <video src={item.src} controls className="w-full h-full" />
            )}
          </div>
        ) : (
          <div className="aspect-video rounded-xl border border-border-primary bg-bg-secondary flex items-center justify-center">
            <Play className="w-8 h-8 text-text-light" />
          </div>
        )}
        {item.description && <p className="text-[11.5px] text-text-muted">{item.description}</p>}
      </div>
    );
  }

  /* IMAGE */
  if (type === 'image') {
    return (
      <div className="space-y-2">
        {item.src && (
          <div className="rounded-xl overflow-hidden border border-border-primary bg-bg-secondary shadow-xs">
            <img src={item.src} alt={item.caption || item.title} className="w-full object-cover" loading="lazy" />
          </div>
        )}
        {(item.title || item.caption) && (
          <p className="text-[11.5px] text-text-muted text-center font-medium">{item.caption || item.title}</p>
        )}
      </div>
    );
  }

  /* GALLERY */
  if (type === 'gallery' && item.items) {
    return (
      <div className="space-y-2">
        <p className="text-[13.5px] font-bold text-text-primary mb-2">{item.title}</p>
        <div className="grid grid-cols-2 gap-2.5">
          {item.items.map((src, i) => (
            <div key={i} className="rounded-lg overflow-hidden border border-border-primary bg-bg-secondary shadow-xs">
              <img src={src} alt={`${item.title} ${i + 1}`} className="w-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* BUTTON */
  if (type === 'button') {
    return (
      <a
        href={item.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-foreground hover:bg-neutral-900 text-white font-bold rounded-xl px-4 py-3 text-[13.5px] transition-all shadow-xs"
      >
        <span>{item.title}</span>
        <ExternalLink className="w-4 h-4" />
      </a>
    );
  }

  /* LINK or DOWNLOAD */
  if (type === 'link' || type === 'download') {
    return (
      <a
        href={item.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-bg-secondary border border-border-primary rounded-xl p-4 hover:border-accent hover:bg-white transition-all group shadow-xs"
      >
        <div>
          <p className="text-[13.5px] font-bold text-text-primary group-hover:text-accent transition-colors">{item.title}</p>
          {item.description && <p className="text-[11.5px] text-text-muted mt-0.5">{item.description}</p>}
        </div>
        {type === 'download'
          ? <Download className="w-4 h-4 text-text-light group-hover:text-accent shrink-0 transition-colors" />
          : <ExternalLink className="w-4 h-4 text-text-light group-hover:text-accent shrink-0 transition-colors" />
        }
      </a>
    );
  }

  /* DEFAULT: text */
  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl p-4 hover:border-border-dark transition-all shadow-xs">
      <p className="text-[13.5px] font-bold text-text-primary leading-snug mb-1">{item.title}</p>
      {item.description && <p className="text-[12px] text-text-muted leading-relaxed">{item.description}</p>}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function InsideThisProduct({ sections }: { sections: ExplorerSection[] | null | undefined }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!sections || sections.length === 0) return null;

  const activeSection = sections[activeIdx];

  return (
    <div className="rounded-card-lg overflow-hidden border border-border-primary bg-bg-secondary shadow-card">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-primary bg-white">
        <span className="text-[11px] font-bold text-accent tracking-[0.15em] uppercase block mb-1">
          INTERACTIVE CENTERPIECE
        </span>
        <h3 className="font-heading text-xl font-black text-text-primary leading-tight">
          Inside the system. <em className="italic-accent">Explore the workspace.</em>
        </h3>
        <p className="text-[13px] text-text-muted mt-1">
          Duplicate directly into your workspace. Duplicates Notion databases, pipeline trackers, and templates after checkout.
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row min-h-[440px]">

        {/* LEFT NAV */}
        <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible p-3 lg:p-4 lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-border-primary bg-bg-secondary scrollbar-none">
          {sections.map((section, idx) => {
            const Icon = ICON_MAP[section.icon?.toLowerCase() || ''] || FileText;
            const isActive = activeIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all cursor-pointer shrink-0 text-left w-full justify-start ${
                  isActive
                    ? 'bg-foreground text-white shadow-md'
                    : 'bg-white text-text-muted hover:text-text-primary border border-border-primary/80 hover:border-border-dark'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{section.title}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-80" />}
              </button>
            );
          })}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 p-5 lg:p-6 bg-white overflow-y-auto max-h-[520px]">
          <div key={activeIdx} className="space-y-3.5 animate-in fade-in duration-200">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border-primary/60">
              {(() => {
                const Icon = ICON_MAP[activeSection.icon?.toLowerCase() || ''] || FileText;
                return <Icon className="w-4 h-4 text-accent shrink-0" />;
              })()}
              <span className="text-[13px] font-extrabold text-text-primary uppercase tracking-wider">{activeSection.title}</span>
              <span className="ml-auto text-[10px] text-text-light font-bold bg-bg-secondary px-2.5 py-0.5 rounded-full border border-border-primary">
                {activeSection.items.length} item{activeSection.items.length !== 1 ? 's' : ''}
              </span>
            </div>

            {activeSection.items.map((item, i) => (
              <ItemCard key={i} item={item} />
            ))}

            {activeSection.items.length === 0 && (
              <div className="text-center text-text-muted italic text-sm py-12">
                No items in this section.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
