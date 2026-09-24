'use client';

import React from 'react';
import Avatar from '../ui/Avatar';

interface Lead {
  phone: string;
  name: string;
  intent: string;
  summary: string;
  last_message_at: string;
  is_converted: boolean;
  is_dnd: boolean;
  total_messages?: number;
  unread_count?: number; // wait, do we have unread messages in the database? Let's check
}

interface LeadListItemProps {
  lead: Lead;
  isActive: boolean;
  onClick: () => void;
}

function cleanLeadName(name: string): string {
  if (!name) return 'Unknown';
  return name
    .replace(/~\{([^}]+)\}~/g, '$1')
    .replace(/^\{([^}]+)\}$/, '$1')
    .trim() || 'Unknown';
}

export default function LeadListItem({ lead, isActive, onClick }: LeadListItemProps) {
  // Format relative time/timestamp (similar to WhatsApp Web time)
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
      }
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return 'yesterday';
      }
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const rawName = lead.name && lead.name !== '~' ? lead.name : lead.phone;
  const name = cleanLeadName(rawName);
  const time = formatTime(lead.last_message_at);

  // Intent-based left border coloring
  let borderLeftColor = '';
  if (lead.is_dnd) {
    borderLeftColor = 'border-l-[3px] border-l-text-subtle';
  } else if (lead.is_converted || lead.intent === 'converted') {
    borderLeftColor = 'border-l-[3px] border-l-success';
  } else if (lead.intent === 'hot') {
    borderLeftColor = 'border-l-[3px] border-l-danger';
  } else if (lead.intent === 'warm') {
    borderLeftColor = 'border-l-[3px] border-l-warning';
  }

  // Display name color
  const nameColor = 'text-text-primary dark:text-[#E9EDEF]';

  return (
    <div
      onClick={onClick}
      className={`h-[72px] flex items-center gap-3 px-4 border-b border-[#E5E7EB] dark:border-[#2A3942] cursor-pointer select-none transition-colors ${borderLeftColor} ${
        isActive
          ? 'bg-[#F0F2F5] dark:bg-[#2A3942]'
          : 'bg-white hover:bg-surface-0 dark:bg-transparent dark:hover:bg-[#1F2C33]'
      }`}
    >
      <Avatar
        name={name}
        phone={lead.phone}
        intent={lead.intent}
        size="lg"
      />

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <span className={`text-[15px] font-semibold truncate ${nameColor}`}>
            {name}
          </span>
          <span className="text-[12px] text-text-muted dark:text-[#8696A0] font-sans font-medium whitespace-nowrap">
            {time}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[13.5px] text-text-muted dark:text-[#8696A0] truncate font-sans font-medium pr-2">
            {lead.summary || 'No conversation details.'}
          </span>
          
          {/* Unread badge or intent tag indicator */}
          {lead.unread_count && lead.unread_count > 0 ? (
            <span className="w-5 h-5 rounded-full bg-brand text-white text-[10px] font-black flex items-center justify-center shrink-0">
              {lead.unread_count}
            </span>
          ) : (
            lead.intent && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                lead.intent === 'hot'
                  ? 'bg-danger-bg text-danger border-danger/20 dark:bg-danger-bg/10 dark:border-danger/30'
                  : lead.intent === 'warm'
                  ? 'bg-warning-bg text-warning border-warning/20 dark:bg-warning-bg/10 dark:border-warning/30'
                  : lead.intent === 'converted'
                  ? 'bg-success-bg text-success border-success/20 dark:bg-success-bg/10 dark:border-success/30'
                  : 'bg-info-bg text-info border-info/20 dark:bg-info-bg/10 dark:border-info/30'
              }`}>
                {lead.intent}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
