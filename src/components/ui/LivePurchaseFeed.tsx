'use client';

import { useState, useEffect } from 'react';

const DUMMY_FEED = [
  { name: "Rahul", location: "Mumbai", product: "AI Lead Finder System" },
  { name: "Priya", location: "Kerala", product: "Freelancer Client Acquisition Kit" },
  { name: "Arjun", location: "Bangalore", product: "Complete Bundle" },
  { name: "Fatima", location: "Dubai", product: "AI Lead Finder System" },
  { name: "Karan", location: "Delhi", product: "Freelancer Client Acquisition Kit" },
  { name: "Sneha", location: "Hyderabad", product: "Complete Bundle" },
  { name: "Mohammed", location: "UAE", product: "AI Lead Finder System" },
  { name: "Divya", location: "Chennai", product: "Freelancer Client Acquisition Kit" },
  { name: "Vikram", location: "Pune", product: "Complete Bundle" },
  { name: "Ananya", location: "Kochi", product: "AI Lead Finder System" },
];

const TIME_LABELS = [
  "just now", "1 minute ago", "2 minutes ago",
  "4 minutes ago", "7 minutes ago", "12 minutes ago",
  "18 minutes ago", "24 minutes ago", "31 minutes ago",
  "45 minutes ago",
];

export default function LivePurchaseFeed() {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [feed, setFeed] = useState(DUMMY_FEED);

  useEffect(() => {
    // Fetch real purchases
    const fetchPurchases = async () => {
      try {
        const res = await fetch('/api/public/recent-purchases');
        const data = await res.json();
        if (data.purchases && data.purchases.length >= 10) {
          setFeed(data.purchases);
        }
      } catch {}
    };
    fetchPurchases();
  }, []);

  useEffect(() => {
    // Show first notification after 8 seconds
    const initialDelay = setTimeout(() => {
      setVisible(true);
      
      // Rotate every 12 seconds
      const interval = setInterval(() => {
        setVisible(false);
        setTimeout(() => {
          setCurrent(prev => (prev + 1) % feed.length);
          setVisible(true);
        }, 600); // brief hide between rotations
      }, 12000);
      
      return () => clearInterval(interval);
    }, 8000);
    
    return () => clearTimeout(initialDelay);
  }, [feed.length]);

  if (!feed || feed.length === 0) return null;

  const item = feed[current];
  const timeLabel = TIME_LABELS[current % TIME_LABELS.length];

  return (
    <div
      className={`fixed bottom-5 left-4 z-50 transition-all duration-500 ease-out ${
        visible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white dark:bg-[#1A1A18] border border-border-primary rounded-xl shadow-lg p-3 max-w-[240px] flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-green/10 flex items-center justify-center shrink-0 text-[15px]">
          🛒
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[12px] font-semibold text-foreground leading-tight">
            {item.name} from {item.location}
          </p>
          <p className="text-[11px] text-text-muted leading-tight mt-0.5 truncate">
            purchased {item.product}
          </p>
          <p className="text-[10px] text-text-light mt-1">
            {timeLabel}
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-text-light hover:text-foreground text-base leading-none shrink-0 -mt-0.5 -mr-0.5 cursor-pointer"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
