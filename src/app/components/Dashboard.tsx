import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import logoImg from "../../imports/logo.png";
import { api, EventData, EventQrPayloadData, MatchData, UserData, PhotoData, PhotoSelectionData, LeadData, LeadStatsData, PaymentTransactionData, WhatsAppSettingsData, StorageSummaryData, AuditLogData, ValidationSummaryData } from "../api";
import { API_ORIGIN, PUBLIC_APP_URL } from "../config";
import confetti from "canvas-confetti";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, CalendarDays, Upload, Cpu, Search, Users, Download,
  CreditCard, Settings, User, HelpCircle, LogOut, Bell, Plus,
  QrCode, ChevronRight, Eye, MoreHorizontal,
  CheckCircle, Clock, AlertCircle, RefreshCw, Trash2, Edit, Loader2,
  Mail, Phone, MapPin, Lock, Globe, Shield, ShieldCheck,
  Star, MessageSquare, Send, Menu, X, Camera, Image, Sparkles,
  TrendingUp, FileText, IndianRupee, Zap, ChevronDown, Check, Share2,
  UserCheck, Activity, Archive, Smartphone, Home, Folder, List, Grid3X3, Table2, Heart
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import QRCode from "qrcode";

const GOLD = "#c9973a";
const BG = "#0a0c10";
const CARD = "#13161d";
const SIDEBAR_BG = "#0d0f16";
const MUTED = "#8b8fa8";
const BORDER = "rgba(201,151,58,0.12)";
const BORDER_SOFT = "rgba(255,255,255,0.06)";
const TEXT = "#f0ede6";
const GREEN = "#22c55e";
const BLUE = "#3b82f6";
const PURPLE = "#a855f7";
const RED = "#ef4444";
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; color: string }> = {
    Active:     { bg: "rgba(34,197,94,0.15)",  color: GREEN },
    Completed:  { bg: "rgba(139,143,168,0.15)", color: MUTED },
    Queued:     { bg: "rgba(201,151,58,0.15)",  color: GOLD },
    Processing: { bg: "rgba(59,130,246,0.15)",  color: BLUE },
    Pending:    { bg: "rgba(168,85,247,0.15)",  color: PURPLE },
    Failed:     { bg: "rgba(239,68,68,0.15)",   color: RED },
    Paid:       { bg: "rgba(34,197,94,0.15)",   color: GREEN },
    Refunded:   { bg: "rgba(239,68,68,0.15)",   color: RED },
    Success:    { bg: "rgba(34,197,94,0.15)",   color: GREEN },
    "No Match": { bg: "rgba(201,151,58,0.15)",  color: GOLD },
  };
  const s = map[status] ?? { bg: "rgba(139,143,168,0.15)", color: MUTED };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: s.bg, color: s.color, fontWeight: 600 }}>
      {status}
    </span>
  );
};

const CardBox = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`premium-card rounded-2xl p-5 ${className}`} style={{ background: CARD, border: `1px solid ${BORDER}`, ...style }}>
    {children}
  </div>
);

const GoldBtn = ({ children, onClick, small, type = "submit" }: { children: React.ReactNode; onClick?: () => void; small?: boolean; type?: "submit" | "button" }) => (
  <button type={type} onClick={onClick} className="premium-shine tap-lift flex items-center gap-2 rounded-xl transition-all hover:opacity-90 hover:-translate-y-0.5"
    style={{ background: GOLD, color: "#0a0c10", fontWeight: 700, fontSize: small ? "0.75rem" : "0.82rem", padding: small ? "6px 14px" : "8px 18px" }}>
    {children}
  </button>
);

const OutlineBtn = ({ children, onClick, disabled, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: "submit" | "button" }) => (
  <button type={type} onClick={onClick} disabled={disabled} className="tap-lift flex items-center gap-2 rounded-xl transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT, fontWeight: 500, fontSize: "0.82rem", padding: "7px 14px" }}>
    {children}
  </button>
);

const SectionHeader = ({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-5">
    <div>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: TEXT }}>{title}</h2>
      {sub && <p style={{ fontSize: "0.78rem", color: MUTED, marginTop: "2px" }}>{sub}</p>}
    </div>
    {action}
  </div>
);

const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="relative w-full sm:max-w-xs">
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
    <input type="text" placeholder={placeholder ?? "Search..."} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full pl-9 pr-4 py-2 rounded-xl outline-none"
      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
  </div>
);

const getCleanFileName = (name: string) => {
  if (!name) return "photo";
  const rawName = name.split("/").pop()?.split("?")[0] || name;
  const match = rawName.match(/^(.*)_[0-9a-fA-F]{6}(\.[a-zA-Z0-9]+)$/);
  if (match) {
    return match[1] + match[2];
  }
  return rawName;
};

const getPhotoUrl = (name: string) => {
  if (!name) return "";
  if (name.startsWith("http://") || name.startsWith("https://")) return name;
  return `${API_ORIGIN}/static/uploads/photos/${name}`;
};

const getPhotoPreviewUrl = (photo: Pick<PhotoData, "name" | "preview_url">) => {
  if (photo.preview_url) {
    return photo.preview_url.startsWith("http") ? photo.preview_url : `${API_ORIGIN}${photo.preview_url}`;
  }
  return getPhotoUrl(photo.name);
};

const getAssetUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
  return `${API_ORIGIN}${url}`;
};

const createEventId = () => `EV-${Date.now().toString().slice(-6)}`;

const getPublicAppOrigin = () => {
  return (PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
};

const getEventPublicLink = (eventId: string) => {
  return `${getPublicAppOrigin()}/find?event=${encodeURIComponent(eventId)}`;
};

const getClientSelectionLink = (eventId: string) => {
  return `${getPublicAppOrigin()}/client-selection?event=${encodeURIComponent(eventId)}`;
};

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

const loadCanvasImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const drawCenteredText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });
  if (line) lines.push(line);

  lines.slice(0, 2).forEach((lineText, index) => {
    ctx.fillText(lineText, x, y + index * lineHeight);
  });
};

const cleanUrl = (url: string) => {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
};

const cleanInstagram = (url: string) => {
  if (!url) return "";
  if (url.includes("instagram.com/")) {
    const parts = url.split("instagram.com/");
    const handle = parts[parts.length - 1].replace(/\/$/, "");
    return `@${handle}`;
  }
  return url.startsWith("@") ? url : `@${url}`;
};

const cleanWhatsApp = (url: string) => {
  if (!url) return "";
  if (url.includes("wa.me/")) {
    const parts = url.split("wa.me/");
    const num = parts[parts.length - 1].replace(/\/$/, "");
    if (num.startsWith("91") && num.length === 12) {
      return `+91 ${num.slice(2, 7)} ${num.slice(7)}`;
    }
    return `+${num}`;
  }
  return url;
};

const createBrandedQrImage = async ({
  qrDataUrl,
  eventName,
  eventId,
  brandName,
  brandLogo,
  website,
  instagram,
  whatsapp,
  email,
}: {
  qrDataUrl: string;
  eventName: string;
  eventId: string;
  brandName: string;
  brandLogo?: string;
  website?: string;
  instagram?: string;
  whatsapp?: string;
  email?: string;
}) => {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1290;
  const ctx = canvas.getContext("2d");
  if (!ctx) return qrDataUrl;

  // Premium midnight obsidian gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, "#12141c");
  bgGrad.addColorStop(1, "#07080b");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const CHAMPAGNE_GOLD = "#dfb76c";

  // Double gold borders
  // Outer Border
  ctx.strokeStyle = "rgba(223, 183, 108, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, canvas.width - 92, canvas.height - 92);

  // Inner Border
  ctx.strokeStyle = "rgba(223, 183, 108, 0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);

  // Corner decorations (Museum Placard Style brackets)
  const bracketSize = 22;
  ctx.strokeStyle = "rgba(223, 183, 108, 0.85)";
  ctx.lineWidth = 3;
  
  // Top-left
  ctx.beginPath();
  ctx.moveTo(54 + bracketSize, 54); ctx.lineTo(54, 54); ctx.lineTo(54, 54 + bracketSize); ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(canvas.width - 54 - bracketSize, 54); ctx.lineTo(canvas.width - 54, 54); ctx.lineTo(canvas.width - 54, 54 + bracketSize); ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(54 + bracketSize, canvas.height - 54); ctx.lineTo(54, canvas.height - 54); ctx.lineTo(54, canvas.height - 54 - bracketSize); ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(canvas.width - 54 - bracketSize, canvas.height - 54); ctx.lineTo(canvas.width - 54, canvas.height - 54); ctx.lineTo(canvas.width - 54, canvas.height - 54 - bracketSize); ctx.stroke();

  // Header Title
  ctx.textAlign = "center";
  ctx.fillStyle = CHAMPAGNE_GOLD;
  ctx.font = "bold 15px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("OFFICIAL EVENT GALLERY", 450, 98);

  // Logo Ring
  const logoX = 450;
  const logoY = 190;
  const logoRadius = 60;
  
  ctx.save();
  ctx.beginPath();
  ctx.arc(logoX, logoY, logoRadius, 0, Math.PI * 2);
  ctx.strokeStyle = CHAMPAGNE_GOLD;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(logoX, logoY, logoRadius - 3, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#12141c";
  ctx.fillRect(logoX - logoRadius, logoY - logoRadius, logoRadius * 2, logoRadius * 2);

  try {
    if (brandLogo) {
      const logo = await loadCanvasImage(brandLogo);
      ctx.drawImage(logo, logoX - logoRadius, logoY - logoRadius, logoRadius * 2, logoRadius * 2);
    } else {
      throw new Error("No logo");
    }
  } catch {
    ctx.fillStyle = CHAMPAGNE_GOLD;
    ctx.font = "bold 44px Georgia, Garamond, Times New Roman, serif";
    ctx.textBaseline = "middle";
    ctx.fillText((brandName || "M").slice(0, 1).toUpperCase(), logoX, logoY);
  }
  ctx.restore();

  // Brand Name
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 700 40px Georgia, Garamond, serif";
  ctx.letterSpacing = "1.5px";
  drawCenteredText(ctx, brandName || "MasterStudio", 450, 310, 700, 48);

  const qr = await loadCanvasImage(qrDataUrl);
  
  // Draw rounded QR container with a premium drop shadow and thin gold border
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(190, 380, 520, 520, 24);
  ctx.fill();
  
  // Subtle border on white card
  ctx.strokeStyle = "rgba(223, 183, 108, 0.25)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Draw transparent QR inside
  ctx.drawImage(qr, 210, 400, 480, 480);

  // Event Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 700 36px Georgia, Garamond, serif";
  ctx.letterSpacing = "0.5px";
  drawCenteredText(ctx, eventName, 450, 942, 700, 40);

  // Event ID
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText(`ID: ${eventId.toUpperCase()}`, 450, 998);

  // Scan instructions
  ctx.fillStyle = CHAMPAGNE_GOLD;
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("SCAN TO FIND YOUR PHOTOS", 450, 1052);

  // Web gallery link (direct link printed on card)
  const publicLinkText = decodeURIComponent(cleanUrl(getEventPublicLink(eventId)));
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "600 17px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "1.5px";
  ctx.fillText(publicLinkText, 450, 1092);

  // Booking divider line
  ctx.strokeStyle = "rgba(223, 183, 108, 0.15)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(150, 1138);
  ctx.lineTo(750, 1138);
  ctx.stroke();

  // Booking Header
  ctx.fillStyle = CHAMPAGNE_GOLD;
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText("FOR BOOKINGS & PORTFOLIO", 450, 1178);

  // Formatted contact details
  const contactParts = [];
  if (website) contactParts.push(cleanUrl(website));
  if (instagram) contactParts.push(cleanInstagram(instagram));
  if (whatsapp) contactParts.push(cleanWhatsApp(whatsapp));
  if (contactParts.length === 0 && email) contactParts.push(email);

  const contactText = contactParts.join("   |   ");
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 18px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText(contactText || "Powered by MasterStudio", 450, 1230);

  // Reset letter spacing for safety
  ctx.letterSpacing = "normal";

  return canvas.toDataURL("image/png");
};

// PAGE 1 - DASHBOARD HOME
const DASH_STATS = [
  { label: "Total Events",    value: "0", color: BLUE,   icon: CalendarDays },
  { label: "Total Photos",    value: "0", color: GOLD,   icon: Upload },
  { label: "Guests Searched", value: "0", color: GREEN,  icon: Search },
  { label: "Total Downloads", value: "0", color: PURPLE, icon: Download },
];
const CHART_DATA: { date: string; searches: number; downloads: number }[] = [];
const RECENT_EVENTS: { name: string; date: string; photos: string; guests: number; status: string }[] = [];
const TOP_EVENTS: { name: string; searches: number; downloads: number }[] = [];
const QUICK_ACTIONS = [
  { icon: Plus,     label: "Create New Event",  color: GOLD },
  { icon: Upload,   label: "Upload Photos",      color: BLUE },
  { icon: Cpu,      label: "AI Index Photos",    color: GREEN },
  { icon: QrCode,   label: "Generate QR Code",   color: PURPLE },
  { icon: Eye,      label: "View All Events",    color: GOLD },
  { icon: Download, label: "Download Reports",   color: MUTED },
];

function DashboardHome({
  photographerEmail,
  setActiveNav,
}: {
  photographerEmail?: string;
  setActiveNav?: (nav: string) => void;
}) {
  const [stats, setStats] = useState({
    "Total Events": { val: "0", sub: "0 Active" },
    "Total Photos": { val: "0", sub: "Uploaded" },
    "Guests Searched": { val: "0", sub: "This Month" },
    "Total Downloads": { val: "0", sub: "This Month" }
  });
  const [recentEvents, setRecentEvents] = useState(RECENT_EVENTS);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.fetchStats(photographerEmail);
        setStats({
          "Total Events": { val: String(data.total_events), sub: `${data.active_events} Active` },
          "Total Photos": { val: String(data.total_photos), sub: "Uploaded" },
          "Guests Searched": { val: String(data.guests_searched), sub: "This Month" },
          "Total Downloads": { val: String(data.total_downloads), sub: "This Month" }
        });
      } catch (e) {
        console.warn("Failed to load stats.", e);
      }
    }
    async function loadEvents() {
      try {
        const data = await api.fetchEvents(photographerEmail);
        setRecentEvents((data || []).slice(0, 5).map(e => ({
          name: e.name,
          date: e.date,
          photos: e.photos,
          guests: e.guests,
          status: e.status
        })));
      } catch (e) {
        console.warn("Failed to load events.", e);
      }
    }
    loadStats();
    loadEvents();
  }, [photographerEmail]);

  const eventNavTarget = photographerEmail ? "Events" : "View All Events";
  const createEventNavTarget = photographerEmail ? "Events" : "Create New Event";

  const handleQuickAction = (label: string) => {
    if (!setActiveNav) return;
    switch (label) {
      case "Create New Event":
        setActiveNav(photographerEmail ? "Events" : "Create New Event");
        break;
      case "Generate QR Code":
      case "View All Events":
        setActiveNav(eventNavTarget);
        break;
      case "Upload Photos":
        setActiveNav(photographerEmail ? "Upload Photos" : eventNavTarget);
        break;
      case "AI Index Photos":
        setActiveNav(photographerEmail ? "AI Indexing" : "System Monitoring");
        break;
      case "Download Reports":
        setActiveNav(photographerEmail ? "Downloads" : "Analytics");
        break;
      default:
        break;
    }
  };

  const totalPhotosCount = Number(String(stats["Total Photos"].val).replace(/,/g, "")) || 0;
  const indexingPercent = totalPhotosCount > 0 ? 100 : 0;
  const topEvents = [...recentEvents]
    .sort((a, b) => (Number(String(b.photos).replace(/,/g, "")) || 0) - (Number(String(a.photos).replace(/,/g, "")) || 0))
    .slice(0, 4);
  const activityData = CHART_DATA;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl p-5 lg:p-6 overflow-hidden relative" style={{ background: "linear-gradient(135deg, rgba(201,151,58,0.16), rgba(19,22,29,0.94) 44%, rgba(11,13,18,0.98))", border: `1px solid ${BORDER}` }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[90px] opacity-20 pointer-events-none" style={{ background: GOLD, transform: "translate(30%, -45%)" }} />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <div style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Photographer Workspace</div>
            <h2 className="mt-2" style={{ color: TEXT, fontSize: "1.45rem", fontWeight: 900, lineHeight: 1.15 }}>Manage events, QR access, and guest photo delivery</h2>
            <p className="mt-2 max-w-2xl" style={{ color: MUTED, fontSize: "0.85rem", lineHeight: 1.6 }}>
              Create an event, upload photos, generate a branded QR, and let guests find their memories with selfie search.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <GoldBtn type="button" onClick={() => setActiveNav?.(createEventNavTarget)}><Plus size={14} /> New Event</GoldBtn>
            <OutlineBtn onClick={() => setActiveNav?.(photographerEmail ? "Upload Photos" : eventNavTarget)}><Upload size={14} /> Upload</OutlineBtn>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {DASH_STATS.map(({ label, color, icon: Icon }) => {
          const s = stats[label as keyof typeof stats] || { val: "0", sub: "" };
          return (
            <CardBox key={label} className="transition-all hover:-translate-y-0.5" style={{ padding: "16px", background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(19,22,29,0.96))" }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 600 }}>{label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}33` }}>
                  <Icon size={14} style={{ color }} />
                </div>
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "4px" }}>{s.sub}</div>
            </CardBox>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Recent Events</span>
            <button onClick={() => setActiveNav?.(eventNavTarget)} className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: GOLD }}>View All <ChevronRight size={13} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Event", "Date", "Photos", "Guests", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentEvents.length > 0 ? recentEvents.map((ev) => (
                  <tr key={ev.name} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5" style={{ fontSize: "0.78rem", color: TEXT, maxWidth: "160px" }}><div className="truncate">{ev.name}</div></td>
                    <td className="px-4 py-2.5" style={{ fontSize: "0.72rem", color: MUTED, whiteSpace: "nowrap" }}>{ev.date}</td>
                    <td className="px-4 py-2.5" style={{ fontSize: "0.78rem", color: TEXT }}>{ev.photos}</td>
                    <td className="px-4 py-2.5" style={{ fontSize: "0.78rem", color: TEXT }}>{ev.guests}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={ev.status} /></td>
                    <td className="px-4 py-2.5"><button style={{ color: MUTED }}><MoreHorizontal size={15} /></button></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarDays size={32} style={{ color: MUTED }} />
                        <div style={{ color: TEXT, fontWeight: 700, fontSize: "0.9rem" }}>No events yet</div>
                        <div style={{ color: MUTED, fontSize: "0.78rem" }}>Create your first event and generate a guest QR link.</div>
                        <GoldBtn type="button" onClick={() => setActiveNav?.(createEventNavTarget)} small><Plus size={13} /> Create Event</GoldBtn>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Search & Download Overview</span>
            <span style={{ fontSize: "0.7rem", color: MUTED }}>This Month</span>
          </div>
          {activityData.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center text-center px-6" style={{ color: MUTED, fontSize: "0.78rem" }}>
              Historical trend data is not connected yet. Current totals above are live.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1c2030", border: `1px solid ${BORDER}`, borderRadius: "10px", fontSize: "0.75rem" }} labelStyle={{ color: TEXT }} />
                <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
                <Line type="monotone" dataKey="searches" stroke={GREEN} strokeWidth={2} dot={false} name="Searches" />
                <Line type="monotone" dataKey="downloads" stroke={GOLD} strokeWidth={2} dot={false} name="Downloads" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CardBox style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(19,22,29,0.96))" }}>
          <div className="flex items-center justify-between mb-4"><span style={{ fontWeight: 600, fontSize: "0.9rem" }}>AI Indexing Status</span></div>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={GOLD} strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40 * (indexingPercent / 100)} ${2 * Math.PI * 40}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{indexingPercent}%</span>
                <span style={{ fontSize: "0.62rem", color: MUTED }}>Completed</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
              {[
                { label: "Completed", color: GOLD,   val: totalPhotosCount.toLocaleString() },
                { label: "Processing",color: BLUE,   val: "0" },
                { label: "Queued",    color: PURPLE, val: "0" },
                { label: "Pending",   color: MUTED,  val: "0" },
              ].map(({ label, color, val }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <div>
                    <div style={{ fontSize: "0.65rem", color: MUTED }}>{label}</div>
                    <div style={{ fontSize: "0.72rem", color: TEXT, fontWeight: 600 }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardBox>

        <CardBox style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(19,22,29,0.96))" }}>
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Top Performing Events</span>
            <button onClick={() => setActiveNav?.(eventNavTarget)} className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: GOLD }}>View All <ChevronRight size={13} /></button>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="grid grid-cols-3 px-2 py-1.5 mb-1">
              {["Event Name", "Photos", "Guests"].map((h) => (<span key={h} style={{ fontSize: "0.67rem", color: MUTED, fontWeight: 500 }}>{h}</span>))}
            </div>
            {topEvents.length > 0 ? topEvents.map((ev) => (
              <div key={ev.name} className="grid grid-cols-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.03]" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
                <span style={{ fontSize: "0.75rem", color: TEXT }} className="truncate pr-2">{ev.name}</span>
                <span style={{ fontSize: "0.75rem", color: GREEN, fontWeight: 600 }}>{ev.photos}</span>
                <span style={{ fontSize: "0.75rem", color: GOLD, fontWeight: 600 }}>{ev.guests}</span>
              </div>
            )) : (
              <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}>
                <div style={{ color: TEXT, fontWeight: 700, fontSize: "0.86rem" }}>No performance data yet</div>
                <div className="mt-1" style={{ color: MUTED, fontSize: "0.74rem" }}>Upload photos and share event QR links to start tracking.</div>
              </div>
            )}
          </div>
        </CardBox>

        <CardBox style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(19,22,29,0.96))" }}>
          <div className="mb-4"><span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Quick Actions</span></div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ icon: Icon, label, color }) => (
              <button key={label} onClick={() => handleQuickAction(label)} className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:opacity-90 hover:-translate-y-0.5 cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <span style={{ fontSize: "0.68rem", color: TEXT, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
              </button>
            ))}
          </div>
        </CardBox>
      </div>
    </div>
  );
}

// PAGE 2 - EVENTS
const ALL_EVENTS: any[] = [];

function EventsPage({
  photographerEmail,
  isAdminView = false,
  autoOpenCreate = false,
  setActiveNav,
  setSelectedEventId,
}: {
  photographerEmail?: string;
  isAdminView?: boolean;
  autoOpenCreate?: boolean;
  setActiveNav?: (nav: string) => void;
  setSelectedEventId?: (id: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [events, setEvents] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientMobile, setNewClientMobile] = useState("");
  const [photographers, setPhotographers] = useState<UserData[]>([]);
  const [selectedPhotographerEmail, setSelectedPhotographerEmail] = useState("");
  const [qrEvent, setQrEvent] = useState<any | null>(null);
  const [qrPayload, setQrPayload] = useState<EventQrPayloadData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrMessage, setQrMessage] = useState("");
  const autoOpenedCreateRef = useRef(false);
  const CHAMPAGNE_GOLD = "#dfb76c";

  const loadEvents = async () => {
    try {
      const data = await api.fetchEvents(photographerEmail);
      setEvents(data);
    } catch (e) {
      console.error("Failed to load events:", e);
      setEvents([]);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [photographerEmail]);

  useEffect(() => {
    if (!isAdminView) return;
    async function loadPhotographers() {
      try {
        const users = await api.fetchUsers();
        const photographerUsers = users.filter((user) => user.role === "Photographer");
        setPhotographers(photographerUsers);
        setSelectedPhotographerEmail((current) => current || photographerUsers[0]?.email || "");
      } catch (e) {
        console.error("Failed to load photographers:", e);
        setPhotographers([]);
      }
    }
    loadPhotographers();
  }, [isAdminView]);

  const openCreateModal = () => {
    setNewId(createEventId());
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewName("");
    setNewClientName("");
    setNewClientMobile("");
    if (isAdminView) {
      setSelectedPhotographerEmail((current) => current || photographers[0]?.email || "");
    }
    setShowCreateModal(true);
  };

  useEffect(() => {
    if (!autoOpenCreate || autoOpenedCreateRef.current) return;
    autoOpenedCreateRef.current = true;
    openCreateModal();
  }, [autoOpenCreate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let formattedDate = newDate;
      const dateParts = newDate.split('-');
      if (dateParts.length === 3) {
        const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        if (!isNaN(dateObj.getTime())) {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          formattedDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
        }
      }
      const ownerEmail = isAdminView ? selectedPhotographerEmail : photographerEmail;
      if (isAdminView && !ownerEmail) {
        alert("Please select a photographer for this event.");
        return;
      }
      await api.createEvent(newId.trim(), newName.trim(), formattedDate.trim(), ownerEmail, newClientName.trim(), newClientMobile.trim());
      setShowCreateModal(false);
      setNewId("");
      setNewName("");
      setNewDate("");
      setNewClientName("");
      setNewClientMobile("");
      if (isAdminView) setSelectedPhotographerEmail(photographers[0]?.email || "");
      loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create event");
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!window.confirm(`Are you sure you want to delete event ${eventId}?`)) return;
    try {
      await api.deleteEvent(eventId, photographerEmail);
      loadEvents();
    } catch (err) {
      alert("Failed to delete event: " + err);
    }
  };

  const handleRenameEvent = async (event: any) => {
    const newName = window.prompt("Rename Event:", event.name);
    if (!newName || newName.trim() === event.name) return;
    try {
      await api.updateEvent(event.id, { name: newName.trim() });
      await loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to rename event");
    }
  };

  const openQrModal = async (event: any) => {
    setQrEvent(event);
    setQrPayload(null);
    setQrDataUrl("");
    setQrMessage("");
    try {
      const payload = await api.fetchEventQrPayload(event.id);
      const link = getEventPublicLink(payload.event_id);
      setQrPayload(payload);
      const dataUrl = await QRCode.toDataURL(link, {
        width: 280,
        margin: 2,
        color: {
          dark: "#0a0c10",
          light: "#ffffff00",
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("Failed to generate QR:", err);
      setQrDataUrl("");
      setQrMessage(err instanceof Error ? err.message : "QR generate nahi ho paya. Please login again.");
    }
  };

  const handleCopyPublicLink = async () => {
    const eventId = qrPayload?.event_id || qrEvent?.id;
    if (!eventId) return;
    await copyText(getEventPublicLink(eventId));
    setQrMessage("Link copied.");
    setTimeout(() => {
      setQrMessage("");
    }, 2500);
  };

  const handleDownloadQr = async () => {
    if (!qrDataUrl || !qrPayload) return;
    const brandName = qrPayload.brand_name || qrPayload.photographer_name || "MasterStudio";
    const brandLogo = qrPayload.brand_logo_url ? getAssetUrl(qrPayload.brand_logo_url) : "";
    const imageUrl = await createBrandedQrImage({
      qrDataUrl,
      eventName: qrPayload.event_name,
      eventId: qrPayload.event_id,
      brandName,
      brandLogo,
      website: qrPayload.website_url,
      instagram: qrPayload.instagram_url,
      whatsapp: qrPayload.whatsapp_url,
      email: qrPayload.photographer_email,
    });
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${qrPayload.event_id}-official-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = events.filter(e =>
    (filter === "All" || e.status === filter) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalEventPhotos = events.reduce((sum, e) => sum + (Number(String(e.photos).replace(/,/g, "")) || 0), 0);
  const qrBrandName = qrPayload?.brand_name || qrPayload?.photographer_name || "MasterStudio";
  const qrBrandLogo = qrPayload?.brand_logo_url ? getAssetUrl(qrPayload.brand_logo_url) : "";
  const qrEventName = qrPayload?.event_name || qrEvent?.name || "";
  const qrEventId = qrPayload?.event_id || qrEvent?.id || "";
  const qrPublicLink = qrEventId ? getEventPublicLink(qrEventId) : "";
  const qrUsesLocalLink = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(qrPublicLink);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Events" sub={`${events.length} events total`}
        action={<GoldBtn onClick={openCreateModal}><Plus size={14} /> Create New Event</GoldBtn>} />

      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.13), rgba(19,22,29,0.96) 42%, rgba(11,13,18,0.98))", border: `1px solid ${BORDER}` }}>
        <div className="relative z-10">
          <div style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Event Delivery Flow</div>
          <div className="mt-2" style={{ color: TEXT, fontWeight: 900, fontSize: "1.15rem" }}>Create event, upload photos, generate branded QR</div>
          <p className="mt-1.5" style={{ color: MUTED, fontSize: "0.82rem", lineHeight: 1.55 }}>
            Every event gets its own guest verification link. Share the QR at the venue so guests can find photos from mobile.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Events",    value: String(events.length),    color: BLUE,   icon: CalendarDays },
          { label: "Active Events",   value: String(events.filter(e => e.status === "Active").length),     color: GREEN,  icon: Activity },
          { label: "Total Photos",    value: totalEventPhotos.toLocaleString(), color: GOLD,   icon: Image },
          { label: "QR Codes Active", value: String(events.filter(e => e.qr).length),     color: PURPLE, icon: QrCode },
        ].map(({ label, value, color, icon: Icon }) => (
          <CardBox key={label} style={{ padding: "16px", background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(19,22,29,0.96))" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 600 }}>{label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}33` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{value}</div>
          </CardBox>
        ))}
      </div>
      
      {/* Event Retention Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl text-xs leading-relaxed" 
        style={{ 
          background: "rgba(201,151,58,0.05)", 
          border: `1px solid ${BORDER}`, 
          color: GOLD 
        }}>
        <Clock size={16} className="shrink-0 mt-0.5" />
        <div>
          Event 45 days ke baad auto-archive ho jayega. Archive ke baad guest selfie search band rahega. Storage bachane ke liye selfie images clean ki ja sakti hain, lekin guest leads hamesha safe rahenge.
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER_SOFT}` }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search events..." />
        <div className="flex items-center gap-2">
          {["All", "Active", "Archived", "Completed"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="px-4 py-2 rounded-xl text-sm transition-all cursor-pointer"
              style={{ background: filter === f ? GOLD : "rgba(255,255,255,0.05)", color: filter === f ? "#0a0c10" : MUTED,
                fontWeight: filter === f ? 700 : 400, border: `1px solid ${filter === f ? GOLD : BORDER}` }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {(isAdminView 
                  ? ["ID", "Event Name", "Date", "Photos", "Guests", "QR", "Status", "Photographer", "Actions"]
                  : ["ID", "Event Name", "Date", "Photos", "Guests", "QR", "Status", "Actions"]
                ).map((h) => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>{ev.id}</td>
                  <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: TEXT, maxWidth: "180px" }}><div className="truncate">{ev.name}</div></td>
                  <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>{ev.date}</td>
                  <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT }}>{ev.photos}</td>
                  <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT }}>{ev.guests}</td>
                  <td className="px-4 py-3"><span style={{ fontSize: "0.72rem", color: ev.qr ? GREEN : MUTED }}>{ev.qr ? "Active" : "None"}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                  {isAdminView && (
                    <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>
                      {ev.photographer_name || "Unassigned"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedEventId?.(ev.id);
                          setActiveNav?.("Upload Photos");
                        }}
                        title="View / Upload Photos"
                        className="h-7 rounded-lg flex items-center justify-center gap-1.5 px-2 cursor-pointer"
                        style={{ background: "rgba(59,130,246,0.15)", color: BLUE, fontSize: "0.7rem", fontWeight: 800 }}
                      >
                        <Upload size={13} />
                        <span className="hidden xl:inline">Photos</span>
                      </button>
                      <button
                        onClick={() => openQrModal(ev)}
                        title="Generate Link / QR"
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: "rgba(168,85,247,0.15)" }}
                      >
                        <QrCode size={13} style={{ color: PURPLE }} />
                      </button>
                      <button
                        onClick={() => handleRenameEvent(ev)}
                        title="Rename Event"
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: "rgba(201,151,58,0.15)" }}
                      >
                        <Edit size={13} style={{ color: GOLD }} />
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        title="Delete Event"
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: "rgba(239,68,68,0.15)" }}
                      >
                        <Trash2 size={13} style={{ color: RED }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-2">
            <CalendarDays size={36} style={{ color: MUTED }} />
            <p style={{ color: TEXT, fontSize: "0.9rem", fontWeight: 700 }}>{events.length === 0 ? "No events created yet" : "No events found"}</p>
            <p style={{ color: MUTED, fontSize: "0.78rem" }}>{events.length === 0 ? "Create your first event, upload photos, then generate a branded QR." : "Try changing the search or filter."}</p>
            {events.length === 0 && (
              <GoldBtn onClick={openCreateModal} small><Plus size={13} /> Create Event</GoldBtn>
            )}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setShowCreateModal(false)} />
          <div 
            className="relative w-full max-w-md z-10 flex flex-col gap-5 p-6 rounded-2xl animate-scaleUp"
            style={{ 
              background: "rgba(19, 22, 29, 0.96)", 
              backdropFilter: "blur(20px)",
              border: `1px solid ${GOLD}`, 
              boxShadow: "0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03) inset" 
            }}
          >
            <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <span style={{ fontWeight: 800, fontSize: "1.1rem", color: TEXT }}>Create New Event</span>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-white/5" style={{ color: MUTED }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {isAdminView && (
                <div className="flex flex-col gap-1.5 items-start">
                  <label style={{ fontSize: "0.76rem", color: MUTED, fontWeight: 600 }}>Photographer</label>
                  <div className="relative w-full">
                    <Camera size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: GOLD }} />
                    <select
                      value={selectedPhotographerEmail}
                      onChange={(e) => setSelectedPhotographerEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all duration-200 focus:border-[#c9973a] focus:ring-1 focus:ring-[#c9973a]/30 cursor-pointer"
                      style={{ background: "#0d0f16", border: `1px solid rgba(255, 255, 255, 0.08)`, color: TEXT, fontSize: "0.82rem", colorScheme: "dark" }}
                    >
                      <option value="">Select photographer</option>
                      {photographers.map((photographer) => (
                        <option key={photographer.id} value={photographer.email}>
                          {photographer.brand_name || photographer.name} - {photographer.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-[0.68rem] leading-relaxed" style={{ color: MUTED }}>
                    Event QR, uploads, client selection, and guest searches will belong only to this photographer.
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5 items-start">
                <label style={{ fontSize: "0.76rem", color: MUTED, fontWeight: 600 }}>Event ID</label>
                <div className="relative w-full">
                  <ShieldCheck size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: GOLD }} />
                  <input 
                    type="text" 
                    placeholder="e.g. EV009" 
                    value={newId} 
                    onChange={(e) => setNewId(e.target.value)} 
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all duration-200 focus:border-[#c9973a] focus:ring-1 focus:ring-[#c9973a]/30"
                    style={{ background: "#0d0f16", border: `1px solid rgba(255, 255, 255, 0.08)`, color: TEXT, fontSize: "0.82rem" }} 
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5 items-start">
                <label style={{ fontSize: "0.76rem", color: MUTED, fontWeight: 600 }}>Event Name</label>
                <div className="relative w-full">
                  <Folder size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                  <input 
                    type="text" 
                    placeholder="e.g. Kapoor Reception" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all duration-200 focus:border-[#c9973a] focus:ring-1 focus:ring-[#c9973a]/30"
                    style={{ background: "#0d0f16", border: `1px solid rgba(255, 255, 255, 0.08)`, color: TEXT, fontSize: "0.82rem" }} 
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5 items-start">
                <label style={{ fontSize: "0.76rem", color: MUTED, fontWeight: 600 }}>Event Date</label>
                <div className="relative w-full">
                  <CalendarDays size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                  <input 
                    type="date" 
                    value={newDate} 
                    onChange={(e) => setNewDate(e.target.value)} 
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all duration-200 focus:border-[#c9973a] focus:ring-1 focus:ring-[#c9973a]/30 cursor-pointer"
                    style={{ background: "#0d0f16", border: `1px solid rgba(255, 255, 255, 0.08)`, color: TEXT, fontSize: "0.82rem", colorScheme: "dark" }} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 items-start">
                  <label style={{ fontSize: "0.76rem", color: MUTED, fontWeight: 600 }}>Client Name</label>
                  <div className="relative w-full">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                    <input
                      type="text"
                      placeholder="e.g. Bride Family"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all duration-200 focus:border-[#c9973a] focus:ring-1 focus:ring-[#c9973a]/30"
                      style={{ background: "#0d0f16", border: `1px solid rgba(255, 255, 255, 0.08)`, color: TEXT, fontSize: "0.82rem" }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-start">
                  <label style={{ fontSize: "0.76rem", color: MUTED, fontWeight: 600 }}>Client Mobile</label>
                  <div className="relative w-full">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                    <input
                      type="tel"
                      placeholder="For client verification"
                      value={newClientMobile}
                      onChange={(e) => setNewClientMobile(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all duration-200 focus:border-[#c9973a] focus:ring-1 focus:ring-[#c9973a]/30"
                      style={{ background: "#0d0f16", border: `1px solid rgba(255, 255, 255, 0.08)`, color: TEXT, fontSize: "0.82rem" }}
                    />
                  </div>
                </div>
              </div>
 
              <div className="flex items-start gap-2.5 p-3 rounded-xl text-[0.7rem] leading-relaxed mt-1" 
                style={{ 
                  background: "rgba(201,151,58,0.05)", 
                  border: `1px solid ${BORDER}`, 
                  color: GOLD 
                }}>
                <Clock size={14} className="shrink-0 mt-0.5" />
                <div>
                  Event 45 days ke baad auto-archive ho jayega. Archive ke baad guest selfie search band rahega. Storage bachane ke liye selfie images aur metadata clean kiye ja sakte hain, lekin guest leads hamesha safe rahenge.
                </div>
              </div>
 
              <div className="flex justify-end gap-2.5 mt-2 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <OutlineBtn onClick={() => setShowCreateModal(false)}>Cancel</OutlineBtn>
                <GoldBtn><Check size={14} /> Save Event</GoldBtn>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
 
      {qrEvent && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => { setQrEvent(null); setQrPayload(null); }} />
          <div 
            className="relative w-full max-w-md z-10 flex flex-col gap-5 p-6 rounded-2xl animate-scaleUp"
            style={{ 
              background: "rgba(19, 22, 29, 0.96)", 
              backdropFilter: "blur(20px)",
              border: `1px solid ${GOLD}`, 
              boxShadow: "0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03) inset" 
            }}
          >
            <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <BrandMark logoUrl={qrBrandLogo} name={qrBrandName} size="sm" />
                <div className="min-w-0 text-left">
                  <div className="truncate font-bold text-xs" style={{ color: MUTED }}>QR Code & Link</div>
                  <div className="truncate font-black text-sm" style={{ color: TEXT }}>{qrEventName || "Event QR"}</div>
                </div>
              </div>
              <button onClick={() => { setQrEvent(null); setQrPayload(null); }} className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-white/5" style={{ color: MUTED }}>
                <X size={15} />
              </button>
            </div>
 
            {/* Branded QR Card Model Mockup */}
            <div 
              className="relative rounded-2xl p-4 flex flex-col items-center justify-center gap-3.5 transition-transform hover:scale-[1.01] overflow-hidden" 
              style={{ 
                background: "linear-gradient(180deg, #12141c 0%, #07080b 100%)", 
                border: "1px solid rgba(223, 183, 108, 0.35)",
                outline: "1px solid rgba(223, 183, 108, 0.15)",
                outlineOffset: "-6px",
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255,255,255,0.02) inset"
              }}
            >
              {/* Corner Museum Brackets */}
              <div className="absolute top-[8px] left-[8px] w-3 h-3 border-t border-l" style={{ borderColor: CHAMPAGNE_GOLD, borderWidth: "1.5px" }} />
              <div className="absolute top-[8px] right-[8px] w-3 h-3 border-t border-r" style={{ borderColor: CHAMPAGNE_GOLD, borderWidth: "1.5px" }} />
              <div className="absolute bottom-[8px] left-[8px] w-3 h-3 border-b border-l" style={{ borderColor: CHAMPAGNE_GOLD, borderWidth: "1.5px" }} />
              <div className="absolute bottom-[8px] right-[8px] w-3 h-3 border-b border-r" style={{ borderColor: CHAMPAGNE_GOLD, borderWidth: "1.5px" }} />
 
              {/* Header */}
              <div className="flex items-center justify-center gap-2 border-b w-full pb-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <BrandMark logoUrl={qrBrandLogo} name={qrBrandName} size="xs" />
                <div className="min-w-0 text-left">
                  <div className="truncate text-white text-xs font-serif italic font-bold">{qrBrandName}</div>
                  <div style={{ color: CHAMPAGNE_GOLD, fontSize: "0.52rem", fontWeight: 800, marginTop: "1px", letterSpacing: "0.2em" }}>OFFICIAL EVENT GALLERY</div>
                </div>
              </div>
              
              {/* QR Image */}
              <div className="flex justify-center rounded-2xl p-2.5 bg-white shadow-lg shadow-black/45" style={{ border: "1px solid rgba(223, 183, 108, 0.25)" }}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`${qrEventName || "Event"} QR code`} className="w-32 h-32 object-contain select-none" />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-center text-[#0a0c10] text-[0.7rem] font-bold">
                    <Loader2 className="animate-spin text-amber-600 mr-2" size={14} /> Generating...
                  </div>
                )}
              </div>
              
              {/* Event Details */}
              <div className="text-center flex flex-col gap-0.5">
                <div className="truncate text-white text-sm font-serif italic font-bold">{qrEventName || "Event Gallery"}</div>
                <div className="text-white/45 text-[0.6rem] font-bold uppercase tracking-[0.2em]" style={{ fontSize: "0.58rem" }}>ID: {qrEventId.toUpperCase()}</div>
                <div style={{ color: CHAMPAGNE_GOLD, fontSize: "0.7rem", fontWeight: 800, marginTop: "2px", letterSpacing: "0.15em" }}>SCAN TO FIND YOUR PHOTOS</div>
                <div className="text-white/60 text-[0.58rem] font-mono tracking-wider truncate max-w-[280px]" style={{ fontSize: "0.58rem" }}>{cleanUrl(qrPublicLink)}</div>
              </div>
 
              {/* Booking Divider & Section */}
              <div className="w-[85%] border-t my-0.5" style={{ borderColor: "rgba(223, 183, 108, 0.12)" }} />
              
              <div className="text-center flex flex-col gap-0.5">
                <div style={{ color: CHAMPAGNE_GOLD, fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.15em" }}>FOR BOOKINGS & PORTFOLIO</div>
                <div className="text-white/80 text-[0.56rem] font-medium tracking-wide">
                  {(() => {
                    const parts = [];
                    if (qrPayload?.website_url) parts.push(cleanUrl(qrPayload.website_url));
                    if (qrPayload?.instagram_url) parts.push(cleanInstagram(qrPayload.instagram_url));
                    if (parts.length === 0 && qrPayload?.photographer_email) parts.push(qrPayload.photographer_email);
                    return parts.join("  •  ") || "Powered by MasterStudio";
                  })()}
                </div>
              </div>
            </div>
 
            {/* Public Link Input Group */}
            <div className="flex flex-col gap-1.5 items-start">
              <label style={{ fontSize: "0.76rem", color: MUTED, fontWeight: 600 }}>Public Guest Link</label>
              <div className="relative w-full">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                <input
                  readOnly
                  value={qrPublicLink}
                  className="w-full pl-9 pr-24 py-2.5 rounded-xl outline-none"
                  style={{ background: "#0d0f16", border: `1px solid rgba(255, 255, 255, 0.08)`, color: TEXT, fontSize: "0.78rem", paddingRight: "90px" }}
                />
                <button
                  onClick={handleCopyPublicLink}
                  className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[0.66rem] font-bold cursor-pointer transition-all hover:opacity-90 active:scale-95"
                  style={{ background: GOLD, color: "#0a0c10" }}
                >
                  Copy Link
                </button>
              </div>
              
              {qrUsesLocalLink && (
                <div 
                  className="rounded-xl px-3 py-2 flex items-start gap-2 text-left text-[0.7rem] leading-relaxed mt-1" 
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#fca5a5" }}
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>Local Link warning:</strong> This is a local address. Set the live VITE_PUBLIC_APP_URL in backend environment so guests can scan from mobile.
                  </div>
                </div>
              )}
            </div>
 
            {qrMessage && (
              <div 
                className="p-2.5 rounded-xl text-xs text-center font-bold animate-fadeIn" 
                style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", color: GREEN }}
              >
                {qrMessage}
              </div>
            )}
 
            {/* Bottom Actions Row */}
            <div className="grid grid-cols-3 gap-2.5 mt-2 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <OutlineBtn onClick={() => qrPublicLink && window.open(qrPublicLink, "_blank")}><Eye size={13} /> Open Link</OutlineBtn>
              <button 
                onClick={handleDownloadQr}
                disabled={!qrDataUrl || !qrPayload}
                className={`col-span-2 flex items-center justify-center gap-2 rounded-xl transition-all font-bold text-xs ${qrDataUrl && qrPayload ? "premium-shine tap-lift hover:opacity-90 active:scale-95 cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                style={{ 
                  background: qrDataUrl && qrPayload ? GOLD : "rgba(255, 255, 255, 0.04)", 
                  color: qrDataUrl && qrPayload ? "#0a0c10" : "rgba(255, 255, 255, 0.2)",
                  border: qrDataUrl && qrPayload ? "none" : "1px solid rgba(255, 255, 255, 0.06)"
                }}
              >
                <Download size={13} /> Download Branded QR (Print)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// PAGE 3 - UPLOAD PHOTOS
function UploadPhotosPage({
  photographerEmail,
  setActiveNav,
  selectedEventId,
  setSelectedEventId,
  isAdminView = false,
}: {
  photographerEmail?: string;
  setActiveNav?: (nav: string) => void;
  selectedEventId?: string | null;
  setSelectedEventId?: (id: string | null) => void;
  isAdminView?: boolean;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState(selectedEventId || "");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [eventPhotos, setEventPhotos] = useState<PhotoData[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [storageSummary, setStorageSummary] = useState<StorageSummaryData | null>(null);
  const [photoViewMode, setPhotoViewMode] = useState<"grid" | "table">("grid");
  const [photoGridSize, setPhotoGridSize] = useState<"medium" | "large" | "xlarge">("medium");
  const [photoSearch, setPhotoSearch] = useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [visibleCount, setVisibleCount] = useState(40);
  const [liveUploadEvents, setLiveUploadEvents] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<Array<{
    id: string;
    name: string;
    file: File;
    size: string;
    progress: number;
    status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
  }>>([]);

  // Drag Selection & Lightbox Preview states
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  const createEventNavTarget = isAdminView ? "Create New Event" : "Events";
  const selectedEventData = events.find((event) => event.id === selectedEvent);
  const liveUploadEnabled = Boolean(selectedEvent && liveUploadEvents[selectedEvent]);
  const guestReadyPhotos = eventPhotos.filter((photo) => photo.status === "Completed").length;
  const indexingPhotos = eventPhotos.filter((photo) => photo.status !== "Completed").length;
  const guestReadyPercent = eventPhotos.length > 0 ? Math.round((guestReadyPhotos / eventPhotos.length) * 100) : 0;
  const parseSizeMb = (size: string) => {
    const value = Number.parseFloat(String(size).replace(/,/g, ""));
    if (!Number.isFinite(value)) return 0;
    const unit = String(size).toLowerCase();
    if (unit.includes("gb")) return value * 1024;
    if (unit.includes("kb")) return value / 1024;
    return value;
  };
  const uploadedSizeMb = eventPhotos.reduce((sum, photo) => sum + (photo.size_bytes ? photo.size_bytes / (1024 * 1024) : parseSizeMb(photo.size)), 0);
  const storagePercent = storageSummary?.percent ?? Math.min(100, Math.round((uploadedSizeMb / (1024 * 100)) * 100));
  const formatStorage = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("masterstudio.liveUploadEvents");
      if (saved) setLiveUploadEvents(JSON.parse(saved));
    } catch {
      setLiveUploadEvents({});
    }
  }, []);

  const toggleLiveUpload = () => {
    if (!selectedEvent) {
      setUploadError("Pehle event select karo, phir Live Upload ON karo.");
      return;
    }
    setLiveUploadEvents((current) => {
      const next = { ...current, [selectedEvent]: !current[selectedEvent] };
      window.localStorage.setItem("masterstudio.liveUploadEvents", JSON.stringify(next));
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("select") || target.closest("a")) {
      return;
    }
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragEnd({ x: e.clientX, y: e.clientY });
    setIsDraggingActive(false);
  };

  useEffect(() => {
    if (!dragStart) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      let currentlyActive = isDraggingActive;
      if (!isDraggingActive && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        setIsDraggingActive(true);
        currentlyActive = true;
      }
      
      setDragEnd({ x: e.clientX, y: e.clientY });
      
      if (currentlyActive) {
        const left = Math.min(dragStart.x, e.clientX);
        const top = Math.min(dragStart.y, e.clientY);
        const right = Math.max(dragStart.x, e.clientX);
        const bottom = Math.max(dragStart.y, e.clientY);
        
        if (gridContainerRef.current) {
          const cards = gridContainerRef.current.querySelectorAll("[data-photo-card]");
          const newlySelectedIds: number[] = [];
          
          cards.forEach((card) => {
            const photoId = Number(card.getAttribute("data-photo-id"));
            const cardRect = card.getBoundingClientRect();
            
            const intersects = !(
              cardRect.right < left ||
              cardRect.left > right ||
              cardRect.bottom < top ||
              cardRect.top > bottom
            );
            
            if (intersects && !Number.isNaN(photoId)) {
              newlySelectedIds.push(photoId);
            }
          });
          
          if (e.shiftKey) {
            setSelectedPhotoIds((prev) => Array.from(new Set([...prev, ...newlySelectedIds])));
          } else {
            setSelectedPhotoIds(newlySelectedIds);
          }
        }
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      setDragStart(null);
      setDragEnd(null);
      
      if (!isDraggingActive) {
        const target = e.target as HTMLElement;
        if (!target.closest("button") && !target.closest("input") && !target.closest("select")) {
          const card = target.closest("[data-photo-card]");
          if (card) {
            const photoUrl = card.getAttribute("data-photo-url");
            if (photoUrl) {
              setLightboxPhoto(photoUrl);
            }
          }
        }
      }
      
      setIsDraggingActive(false);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [dragStart, isDraggingActive]);

  const loadEvents = async () => {
      try {
        const data = await api.fetchEvents(photographerEmail);
        setEvents(data);
        if ((!selectedEventId || !data.some(ev => ev.id === selectedEventId)) && data.length > 0) {
          setSelectedEvent(data[0].id);
          setSelectedEventId?.(data[0].id);
        }
      } catch (err) {
        setEvents([]);
        setUploadError(`Backend connect nahi ho raha. API server ${API_ORIGIN} par reachable hona chahiye.`);
      }
  };

  useEffect(() => {
    loadEvents();
  }, [photographerEmail, selectedEventId]);

  useEffect(() => {
    if (selectedEventId) {
      setSelectedEvent(selectedEventId);
    }
  }, [selectedEventId]);

  const loadEventPhotos = async (eventId: string) => {
    if (!eventId) {
      setEventPhotos([]);
      return;
    }
    setLoadingPhotos(true);
    try {
      const data = await api.fetchPhotos(eventId, photographerEmail);
      setEventPhotos(data);
    } catch (err) {
      setEventPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const loadStorageSummary = async () => {
    try {
      const data = await api.fetchStorageSummary(photographerEmail);
      setStorageSummary(data);
    } catch {
      setStorageSummary(null);
    }
  };

  useEffect(() => {
    loadEventPhotos(selectedEvent);
    loadStorageSummary();
    setSelectedPhotoIds([]);
    setUploadError("");
    setVisibleCount(40);
  }, [selectedEvent, photographerEmail]);

  useEffect(() => {
    if (!liveUploadEnabled || !selectedEvent) return;
    const interval = window.setInterval(() => {
      loadEventPhotos(selectedEvent);
      loadEvents();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [liveUploadEnabled, selectedEvent, photographerEmail]);

  const uploadQueuedFiles = async (queueItems: Array<{ id: string; name: string; file: File; size: string; progress: number; status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed' }>) => {
    if (!selectedEvent) {
      setUploadError("Pehle event create/select karo, phir photos upload karo.");
      return 0;
    }
    setUploadError("");
    setUploadingPhotos(true);
    let failedUploads = 0;
    
    // Upload files sequentially and update queue status/progress
    for (const queueItem of queueItems) {
      const file = queueItem.file;
      const queueItemId = queueItem.id;
      
      // Update status to uploading and set initial progress
      setUploadQueue(current => 
        current.map(item => 
          item.id === queueItemId 
            ? { ...item, status: "uploading", progress: 20 } 
            : item
        )
      );

      try {
        // Simulate minor progress steps to make it look smooth and responsive
        const progressTimer = setInterval(() => {
          setUploadQueue(current => 
            current.map(item => 
              item.id === queueItemId && item.status === "uploading" && item.progress < 85
                ? { ...item, progress: item.progress + Math.floor(Math.random() * 8) + 4 }
                : item
            )
          );
        }, 100);

        const uploadedPhoto = await api.uploadPhoto(selectedEvent, file, photographerEmail);
        clearInterval(progressTimer);

        // Original upload is complete; AI indexing now continues in the server queue.
        const queuedForAi = uploadedPhoto.status === "Queued" || uploadedPhoto.status === "Processing" || uploadedPhoto.status === "Pending";
        setUploadQueue(current => 
          current.map(item => 
            item.id === queueItemId 
              ? { ...item, status: queuedForAi ? "processing" : "completed", progress: Math.max(uploadedPhoto.progress || 0, 90) } 
              : item
          )
        );
      } catch (err) {
        console.error("Failed to upload file:", file.name, err);
        failedUploads++;
        
        // Update status to failed
        setUploadQueue(current => 
          current.map(item => 
            item.id === queueItemId 
              ? { ...item, status: "failed", progress: 100 } 
              : item
          )
        );
      }
    }
    
    setUploadingPhotos(false);
    
    if (failedUploads > 0) {
      setUploadError(`${failedUploads} photo(s) upload fail ho gayi. Network/server check karke Retry Failed dabao.`);
    } else if (liveUploadEnabled) {
      setUploadError("");
    }
    
    await loadEventPhotos(selectedEvent);
    await loadStorageSummary();
    await loadEvents();
    return failedUploads;
  };

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    const queueItems = fileArray.map((file, idx) => ({
      id: `${file.name}-${idx}-${Date.now()}`,
      name: file.name,
      file,
      size: file.size >= 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`,
      progress: 0,
      status: "queued" as const
    }));
    setUploadQueue(queueItems);
    await uploadQueuedFiles(queueItems);
    if (fileRef.current) fileRef.current.value = "";
  };

  const retryFailedUploads = async () => {
    const failedItems = uploadQueue
      .filter((item) => item.status === "failed")
      .map((item) => ({ ...item, status: "queued" as const, progress: 0 }));
    if (failedItems.length === 0) return;
    setUploadQueue((current) => current.map((item) => item.status === "failed" ? { ...item, status: "queued", progress: 0 } : item));
    await uploadQueuedFiles(failedItems);
  };

  const handleDeleteSelectedPhotos = async () => {
    if (selectedPhotoIds.length === 0) return;
    if (!window.confirm(`Kya aap sach me ye ${selectedPhotoIds.length} photo(s) delete karna chahte hain?`)) return;
    try {
      setUploadError("");
      await api.deletePhotos(selectedPhotoIds, photographerEmail);
      setSelectedPhotoIds([]);
      await loadEventPhotos(selectedEvent);
      await loadEvents();
    } catch (err) {
      setUploadError("Photo delete karne me fail ho gya. Kripya dubara koshish kare.");
    }
  };

  const filteredEventPhotos = eventPhotos.filter((photo) =>
    getCleanFileName(photo.name).toLowerCase().includes(photoSearch.toLowerCase())
  );
  const visiblePhotos = filteredEventPhotos.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(40);
  }, [photoSearch]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.classList.contains("overflow-y-auto")) return;
      
      const threshold = 300;
      const totalHeight = target.scrollHeight;
      const scrollPosition = target.clientHeight + target.scrollTop;
      
      if (totalHeight - scrollPosition < threshold) {
        setVisibleCount((prev) => {
          if (prev < filteredEventPhotos.length) {
            return prev + 40;
          }
          return prev;
        });
      }
    };
    
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [filteredEventPhotos.length]);
  const gridSizeClass =
    photoGridSize === "xlarge"
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      : photoGridSize === "large"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4";
  const allVisibleSelected = filteredEventPhotos.length > 0 && filteredEventPhotos.every((photo) => selectedPhotoIds.includes(photo.id));
  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotoIds(prev => prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]);
  };
  const toggleAllVisiblePhotos = () => {
    if (allVisibleSelected) {
      setSelectedPhotoIds(prev => prev.filter(id => !filteredEventPhotos.some(photo => photo.id === id)));
    } else {
      setSelectedPhotoIds(prev => Array.from(new Set([...prev, ...filteredEventPhotos.map(photo => photo.id)])));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="hidden">
          <CardBox>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.92rem", color: TEXT }}>Event Folders</div>
                <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: "2px" }}>Select gallery folder</div>
              </div>
              <button onClick={() => setActiveNav?.(createEventNavTarget)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,151,58,0.12)", color: GOLD }}>
                <Plus size={15} />
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}>
                  <Folder size={30} style={{ color: MUTED, margin: "0 auto 8px" }} />
                  <div style={{ color: TEXT, fontWeight: 700, fontSize: "0.84rem" }}>No event folders</div>
                  <div style={{ color: MUTED, fontSize: "0.72rem", marginTop: "4px" }}>Create an event first.</div>
                  <GoldBtn onClick={() => setActiveNav?.(createEventNavTarget)} small><Plus size={13} /> Create</GoldBtn>
                </div>
              ) : events.map((event) => {
                const active = event.id === selectedEvent;
                return (
                  <button
                    key={event.id}
                    onClick={() => { setSelectedEvent(event.id); setSelectedEventId?.(event.id); }}
                    className="w-full text-left rounded-2xl p-3 transition-all"
                    style={{ background: active ? "rgba(201,151,58,0.13)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(201,151,58,0.32)" : BORDER_SOFT}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: active ? "rgba(201,151,58,0.18)" : "rgba(255,255,255,0.04)", color: active ? GOLD : MUTED }}>
                        <Folder size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate" style={{ color: TEXT, fontWeight: 800, fontSize: "0.8rem" }}>{event.name}</div>
                        <div className="truncate" style={{ color: MUTED, fontSize: "0.68rem", marginTop: "2px" }}>{event.id} Â· {event.photos || "0"} photos</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardBox>
        </div>

        <div className="lg:col-span-9 flex flex-col gap-4">
          <CardBox className="flex flex-col gap-4">
            {/* Header: Event details and selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
              <div className="flex flex-col gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0" style={{ fontWeight: 800, fontSize: "0.95rem", color: TEXT }}>
                  <Folder size={17} style={{ color: GOLD }} />
                  <span>Events</span>
                  <ChevronRight size={13} style={{ color: MUTED }} />
                  <span className="truncate" style={{ color: GOLD }}>{selectedEventData?.name || "Select folder"}</span>
                </div>
                {selectedEventData && (
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: "Photos", value: selectedEventData.photos || "0" },
                      { label: "Guests", value: selectedEventData.guests || "0" },
                      { label: "Status", value: selectedEventData.status || "Active" },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}`, color: MUTED, fontSize: "0.7rem" }}
                      >
                        {item.label}: <strong style={{ color: TEXT, fontWeight: 700 }}>{item.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5 shrink-0 max-w-full min-w-0">
                <select value={selectedEvent} onChange={(e) => { setSelectedEvent(e.target.value); setSelectedEventId?.(e.target.value); }}
                  className="px-3.5 py-1.5 rounded-xl outline-none cursor-pointer min-w-[200px] sm:min-w-[320px] max-w-[380px] sm:max-w-[580px] truncate"
                  disabled={events.length === 0}
                  style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.8rem", textOverflow: "ellipsis" }}>
                  {events.length === 0 && <option value="">No events found</option>}
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id} style={{ background: "#1c2030" }}>{ev.id} - {ev.name}</option>
                  ))}
                </select>
                <OutlineBtn onClick={() => setActiveNav?.(createEventNavTarget)}><Plus size={13} /> New Event</OutlineBtn>
              </div>
            </div>

            {/* Controls Toolbar: Search, Actions, View Mode */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${BORDER_SOFT}` }}>
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <SearchInput value={photoSearch} onChange={setPhotoSearch} placeholder="Search photos..." />
                <GoldBtn onClick={() => fileRef.current?.click()} small><Upload size={13} /> Upload</GoldBtn>
                <button
                  onClick={toggleLiveUpload}
                  className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all"
                  style={{
                    background: liveUploadEnabled ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.05)",
                    border: liveUploadEnabled ? "1px solid rgba(34,197,94,0.35)" : `1px solid ${BORDER}`,
                    color: liveUploadEnabled ? GREEN : TEXT,
                    boxShadow: liveUploadEnabled ? "0 0 18px rgba(34,197,94,0.08)" : "none",
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: liveUploadEnabled ? GREEN : MUTED, boxShadow: liveUploadEnabled ? "0 0 10px rgba(34,197,94,0.9)" : "none" }} />
                  Live Upload {liveUploadEnabled ? "ON" : "OFF"}
                </button>
                <OutlineBtn onClick={toggleAllVisiblePhotos}><Check size={13} /> {allVisibleSelected ? "Clear" : "Select All"}</OutlineBtn>
                {selectedPhotoIds.length > 0 && (
                  <OutlineBtn onClick={() => setSelectedPhotoIds([])}><X size={13} /> Deselect</OutlineBtn>
                )}
              </div>
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                {/* Visual View Switcher (Grid vs List) */}
                <div 
                  className="flex items-center p-0.5 rounded-xl transition-all duration-200" 
                  style={{ 
                    border: `1px solid rgba(255, 255, 255, 0.05)`, 
                    background: "rgba(10, 12, 16, 0.4)",
                    backdropFilter: "blur(8px)"
                  }}
                >
                  <button 
                    onClick={() => setPhotoViewMode("grid")} 
                    className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-all duration-200 hover:text-white" 
                    style={{ 
                      color: photoViewMode === "grid" ? "#0a0c10" : MUTED, 
                      background: photoViewMode === "grid" ? GOLD : "transparent",
                      boxShadow: photoViewMode === "grid" ? `0 4px 12px rgba(201, 151, 58, 0.25)` : "none"
                    }}
                  >
                    <Grid3X3 size={13} />
                    <span>Grid</span>
                  </button>
                  <button 
                    onClick={() => setPhotoViewMode("table")} 
                    className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-all duration-200 hover:text-white" 
                    style={{ 
                      color: photoViewMode === "table" ? "#0a0c10" : MUTED, 
                      background: photoViewMode === "table" ? GOLD : "transparent",
                      boxShadow: photoViewMode === "table" ? `0 4px 12px rgba(201, 151, 58, 0.25)` : "none"
                    }}
                  >
                    <Table2 size={13} />
                    <span>List</span>
                  </button>
                </div>

                {/* Density Switcher (Dense, Cozy, Focus) */}
                {photoViewMode === "grid" && (
                  <div 
                    className="flex items-center p-0.5 rounded-xl transition-all duration-200" 
                    style={{ 
                      border: `1px solid rgba(255, 255, 255, 0.05)`, 
                      background: "rgba(10, 12, 16, 0.4)",
                      backdropFilter: "blur(8px)"
                    }}
                  >
                    {[
                      { key: "medium", label: "Dense", tooltip: "High Density" },
                      { key: "large", label: "Cozy", tooltip: "Medium Density" },
                      { key: "xlarge", label: "Focus", tooltip: "Detailed View" },
                    ].map((item) => {
                      const active = photoGridSize === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => setPhotoGridSize(item.key as "medium" | "large" | "xlarge")}
                          className="px-3 py-1.5 rounded-lg cursor-pointer text-[0.7rem] font-bold transition-all duration-200"
                          style={{
                            color: active ? GOLD : MUTED,
                            background: active ? "rgba(201, 151, 58, 0.08)" : "transparent",
                            border: active ? "1px solid rgba(201, 151, 58, 0.15)" : "1px solid transparent",
                          }}
                          title={item.tooltip}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button 
                  onClick={() => loadEventPhotos(selectedEvent)} 
                  className="w-8 h-8 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-80 active:scale-95 flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.035)", 
                    border: `1px solid rgba(255,255,255,0.08)`, 
                    color: TEXT
                  }}
                  title="Refresh Photos"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Drag and Dropzone */}
            {selectedEvent && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileRef.current?.click()}
                className="hidden md:flex border-2 border-dashed rounded-2xl p-5 flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 relative group overflow-hidden"
                style={{
                  background: isDragOver ? "rgba(201,151,58,0.08)" : "rgba(255,255,255,0.015)",
                  borderColor: isDragOver ? GOLD : "rgba(201,151,58,0.22)",
                  boxShadow: isDragOver ? "0 0 20px rgba(201,151,58,0.15)" : "none",
                  transform: isDragOver ? "scale(1.005)" : "scale(1)",
                }}
              >
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ background: isDragOver ? "rgba(201,151,58,0.15)" : "rgba(255,255,255,0.03)", color: GOLD }}
                >
                  <Upload size={18} className={isDragOver ? "animate-bounce" : ""} />
                </div>
                <div style={{ color: TEXT, fontSize: "0.82rem", fontWeight: 800 }}>
                  {isDragOver ? "Drop photos here to start uploading!" : "Drag & drop photos here, or click to browse files"}
                </div>
                <div style={{ color: MUTED, fontSize: "0.68rem" }}>
                  Supports PNG, JPG, JPEG formats
                </div>
              </div>
            )}

            {/* Upload Progress Queue */}
            {uploadQueue.length > 0 && (
              <div className="rounded-2xl p-4 flex flex-col gap-3 premium-page-enter" style={{ background: "rgba(16,19,29,0.95)", border: `1px solid ${BORDER_SOFT}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: TEXT }}>
                      Upload Queue ({uploadQueue.filter(i => i.status === 'completed' || i.status === 'processing').length} / {uploadQueue.length} uploaded)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {uploadQueue.some((item) => item.status === "failed") && (
                      <button
                        onClick={retryFailedUploads}
                        disabled={uploadingPhotos}
                        className="text-[0.68rem] font-bold cursor-pointer transition-colors hover:text-white disabled:opacity-50"
                        style={{ color: GOLD }}
                      >
                        Retry Failed
                      </button>
                    )}
                    <button 
                      onClick={() => setUploadQueue([])}
                      className="text-[0.68rem] font-bold cursor-pointer transition-colors hover:text-white"
                      style={{ color: MUTED }}
                    >
                      Clear Queue
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {uploadQueue.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.04]">
                      <div className="min-w-0 flex-1 flex items-center gap-2.5">
                        <div style={{ color: MUTED, fontSize: "0.68rem" }}>
                          {item.status === 'completed' && <CheckCircle size={14} className="text-emerald-500" />}
                          {item.status === 'failed' && <AlertCircle size={14} className="text-red-500" />}
                          {item.status === 'uploading' && <Loader2 size={14} className="animate-spin text-amber-500" />}
                          {item.status === 'processing' && <Cpu size={14} className="text-blue-500" />}
                          {item.status === 'queued' && <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
                        </div>
                        <span className="truncate font-semibold" style={{ color: TEXT }}>{item.name}</span>
                        <span className="shrink-0 text-[0.68rem]" style={{ color: MUTED }}>({item.size})</span>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        {(item.status === 'uploading' || item.status === 'processing') && (
                          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-150"
                              style={{
                                width: `${item.progress}%`,
                                background: item.status === 'processing'
                                  ? `linear-gradient(90deg, ${BLUE}, ${GOLD})`
                                  : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                              }}
                            />
                          </div>
                        )}
                        <span 
                          style={{ 
                            fontSize: "0.68rem", 
                            fontWeight: 800,
                            color: item.status === 'completed' ? GREEN : item.status === 'failed' ? RED : item.status === 'processing' ? BLUE : item.status === 'uploading' ? GOLD : MUTED
                          }}
                        >
                          {item.status === 'completed' && "Ready"}
                          {item.status === 'failed' && "Failed"}
                          {item.status === 'processing' && "AI queued"}
                          {item.status === 'uploading' && `${item.progress}%`}
                          {item.status === 'queued' && "Queued"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {liveUploadEnabled && (
              <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(201,151,58,0.06))", border: "1px solid rgba(34,197,94,0.24)" }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: "rgba(34,197,94,0.14)", color: GREEN, border: "1px solid rgba(34,197,94,0.26)" }}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <div style={{ color: TEXT, fontWeight: 900, fontSize: "0.95rem" }}>Live Event Upload is active</div>
                      <div style={{ color: MUTED, fontSize: "0.76rem", lineHeight: 1.55, marginTop: "3px" }}>
                        Photos uploaded here are indexed immediately and become searchable for guests from the same event QR. This page refreshes every 20 seconds while live mode is on.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(getEventPublicLink(selectedEvent), "_blank")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold"
                    style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${BORDER_SOFT}`, color: TEXT }}
                  >
                    <Smartphone size={14} />
                    Guest QR Link
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: "Guest Ready", value: String(guestReadyPhotos), color: GREEN },
                    { label: "Indexing", value: String(indexingPhotos), color: BLUE },
                    { label: "Ready %", value: `${guestReadyPercent}%`, color: GOLD },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(7,9,13,0.42)", border: `1px solid ${BORDER_SOFT}` }}>
                      <div style={{ color: item.color, fontWeight: 900, fontSize: "1.05rem", lineHeight: 1 }}>{item.value}</div>
                      <div className="mt-1 truncate" style={{ color: MUTED, fontSize: "0.68rem", fontWeight: 700 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadError && (
              <div className="rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", color: RED, fontSize: "0.76rem" }}>
                {uploadError}
              </div>
            )}

            {uploadingPhotos && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-3 animate-pulse" style={{ background: "rgba(201,151,58,0.08)", border: `1px solid ${GOLD}` }}>
                <span className="w-2.5 h-2.5 rounded-full bg-[#c9973a] animate-ping shrink-0" />
                <span style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 700 }}>
                  {liveUploadEnabled ? "Live uploading and indexing photos for guest search..." : "Uploading your photos... Please wait."}
                </span>
              </div>
            )}

            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }} />
            {loadingPhotos ? (
              <div className="py-10 text-center" style={{ color: MUTED, fontSize: "0.82rem" }}>Loading photos...</div>
            ) : eventPhotos.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-2" style={{ color: MUTED }}>
                <Image size={34} />
                <div style={{ fontSize: "0.82rem" }}>No photos uploaded for this event yet.</div>
              </div>
            ) : filteredEventPhotos.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-2" style={{ color: MUTED }}>
                <Search size={34} />
                <div style={{ fontSize: "0.82rem" }}>No photos match your search.</div>
              </div>
            ) : photoViewMode === "table" ? (
              <div className="overflow-x-auto w-full" style={{ border: `1px solid ${BORDER_SOFT}`, borderRadius: "16px" }}>
                <div className="min-w-[800px]" style={{ background: "rgba(19,22,29,0.4)" }}>
                  {/* Table Header */}
                  <div className="grid grid-cols-[40px_50px_1fr_110px_80px_90px_120px] gap-3 px-4 py-3" style={{ background: "rgba(255,255,255,0.035)", borderBottom: `1px solid ${BORDER_SOFT}`, color: MUTED, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    <span />
                    <span>Preview</span>
                    <span>Name</span>
                    <span>Date</span>
                    <span>Type</span>
                    <span>Size</span>
                    <span>Status</span>
                  </div>
                  {/* Table Rows */}
                  {visiblePhotos.map((photo) => {
                    const selected = selectedPhotoIds.includes(photo.id);
                    return (
                      <div
                        key={photo.id}
                        onClick={() => togglePhotoSelection(photo.id)}
                        className="grid grid-cols-[40px_50px_1fr_110px_80px_90px_120px] gap-3 items-center px-4 py-2.5 transition-all duration-200 group cursor-pointer border-l-2"
                        style={{
                          borderBottom: `1px solid ${BORDER_SOFT}`,
                          background: selected ? "rgba(201,151,58,0.08)" : "transparent",
                          borderLeftColor: selected ? GOLD : "transparent"
                        }}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150"
                          style={{
                            border: `1px solid ${selected ? GOLD : "rgba(255,255,255,0.18)"}`,
                            background: selected ? GOLD : "rgba(255,255,255,0.03)",
                            color: selected ? "#0a0c10" : "transparent"
                          }}
                        >
                          <Check size={11} className="transition-transform" style={{ transform: selected ? "scale(1)" : "scale(0)" }} />
                        </button>
                        
                        {/* Thumbnail */}
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#0f1218] border border-white/[0.04]">
                          <img
                            src={getPhotoPreviewUrl(photo)}
                            alt={getCleanFileName(photo.name)}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        {/* Name */}
                        <span className="truncate transition-colors duration-200 group-hover:text-[#c9973a] pr-2" style={{ color: TEXT, fontSize: "0.78rem", fontWeight: 700 }} title={getCleanFileName(photo.name)}>
                          {getCleanFileName(photo.name)}
                        </span>

                        {/* Date */}
                        <span className="truncate text-left" style={{ color: MUTED, fontSize: "0.74rem" }}>
                          {selectedEventData?.date || "N/A"}
                        </span>

                        {/* Type */}
                        <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase w-max" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_SOFT}`, color: GOLD }}>
                          {photo.name.split('.').pop()?.toUpperCase() || "JPG"}
                        </span>

                        {/* Size */}
                        <span className="truncate" style={{ color: MUTED, fontSize: "0.74rem" }}>
                          {photo.size}
                        </span>

                        {/* Status */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={photo.status} />
                          {photo.status === "Completed" && (
                            <span 
                              title={photo.faces_count && photo.faces_count > 0 ? `${photo.faces_count} Face(s) Indexed` : "No Faces Detected"} 
                              className="flex items-center gap-1 text-[0.66rem] font-extrabold" 
                              style={{ color: photo.faces_count && photo.faces_count > 0 ? GREEN : MUTED, opacity: 0.9 }}
                            >
                              <Cpu size={11} />
                              <span>{photo.faces_count && photo.faces_count > 0 ? `${photo.faces_count}` : "0"}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                ref={gridContainerRef}
                onMouseDown={handleMouseDown}
                className={`grid ${gridSizeClass} select-none relative`}
              >
                {visiblePhotos.map((photo) => {
                  const selected = selectedPhotoIds.includes(photo.id);
                  return (
                    <div
                      key={photo.id}
                      data-photo-card="true"
                      data-photo-id={photo.id}
                      data-photo-url={getPhotoPreviewUrl(photo)}
                      className="rounded-xl overflow-hidden relative group transition-all duration-300 hover:shadow-lg hover:shadow-[rgba(201,151,58,0.08)] hover:-translate-y-1 cursor-pointer aspect-[4/3]"
                      style={{
                        background: "linear-gradient(180deg, #13161d, #0d0f16)",
                        border: `1px solid ${selected ? GOLD : BORDER_SOFT}`,
                        boxShadow: selected ? `0 0 12px rgba(201,151,58,0.15), 0 0 0 1px ${GOLD}` : "none",
                      }}
                    >
                      {/* Blurred background photo to prevent empty black gaps */}
                      <img
                        src={getPhotoPreviewUrl(photo)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-md scale-105 opacity-25 pointer-events-none"
                      />
                      
                      {/* Sharp uncropped foreground photo */}
                      <img
                        src={getPhotoPreviewUrl(photo)}
                        alt={getCleanFileName(photo.name)}
                        className="absolute inset-0 w-full h-full object-contain z-10 transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Premium gradient overlay (visible only on hover) */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
                        style={{
                          background: "linear-gradient(to top, rgba(8,10,14,0.95) 0%, rgba(8,10,14,0.4) 45%, transparent 85%)"
                        }}
                      />

                      {/* Select Checkbox (always visible if selected, visible on hover if not) */}
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                        className={`absolute top-2.5 right-2.5 z-30 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-md ${
                          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                        style={{
                          border: `1px solid ${selected ? GOLD : "rgba(255,255,255,0.15)"}`,
                          background: selected ? GOLD : "rgba(10,12,16,0.65)",
                          color: selected ? "#0a0c10" : TEXT,
                          cursor: "pointer"
                        }}
                      >
                        <Check size={14} className={`transition-transform duration-200 ${selected ? "scale-100" : "scale-0 group-hover:scale-75"}`} />
                      </button>

                      {/* Status / AI Indexing Badge Overlay */}
                      {photo.status === "Completed" && (
                        <span
                          className="absolute top-2.5 left-2.5 z-30 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6rem] font-bold backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            background: "rgba(10,12,16,0.65)",
                            border: photo.faces_count && photo.faces_count > 0 ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(139,143,168,0.3)",
                            color: photo.faces_count && photo.faces_count > 0 ? GREEN : MUTED
                          }}
                        >
                          <Cpu size={9} /> {photo.faces_count && photo.faces_count > 0 ? `${photo.faces_count} Face${photo.faces_count > 1 ? 's' : ''} Indexed` : "No Faces Detected"}
                        </span>
                      )}
                      {photo.status !== "Completed" && (
                        <span
                          className="absolute top-2.5 left-2.5 z-30 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6rem] font-bold backdrop-blur-md opacity-100 transition-opacity duration-300"
                          style={{
                            background: "rgba(10,12,16,0.65)",
                            border: "1px solid rgba(59,130,246,0.3)",
                            color: BLUE
                          }}
                        >
                          <Clock size={9} /> {photo.status}
                        </span>
                      )}

                      {/* Bottom Details Overlay (slides up and fades in on hover) */}
                      <div className="absolute bottom-0 left-0 right-0 p-3.5 z-30 flex flex-col pointer-events-none transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <div
                          className="truncate font-semibold transition-colors duration-200 group-hover:text-[#c9973a]"
                          style={{ color: TEXT, fontSize: "0.75rem" }}
                          title={getCleanFileName(photo.name)}
                        >
                          {getCleanFileName(photo.name)}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[0.65rem]" style={{ color: MUTED }}>
                          <span>{photo.size}</span>
                          <span style={{ fontSize: "0.6rem", opacity: 0.8 }}>ID: {photo.id}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Drag Selection Marquee Overlay */}
                {dragStart && dragEnd && isDraggingActive && (
                  <div
                    className="fixed pointer-events-none z-50 border border-[#c9973a]/60 bg-[#c9973a]/15 rounded-sm"
                    style={{
                      left: Math.min(dragStart.x, dragEnd.x),
                      top: Math.min(dragStart.y, dragEnd.y),
                      width: Math.abs(dragStart.x - dragEnd.x),
                      height: Math.abs(dragStart.y - dragEnd.y),
                    }}
                  />
                )}

                {/* Photographer Lightbox Modal */}
                {lightboxPhoto && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightboxPhoto(null); }}
                      className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 cursor-pointer"
                      style={{ color: TEXT }}
                    >
                      <X size={24} />
                    </button>
                    <img
                      src={lightboxPhoto}
                      alt="Preview"
                      className="max-w-full max-h-[85vh] rounded-xl object-contain select-none pointer-events-none"
                      style={{ border: `1px solid ${BORDER}` }}
                    />
                  </div>
                )}
              </div>
            )}
            {visiblePhotos.length < filteredEventPhotos.length && (
              <div className="py-6 text-center text-xs flex items-center justify-center gap-2 animate-pulse" style={{ color: MUTED }}>
                <span className="w-2.5 h-2.5 rounded-full bg-[#c9973a] animate-ping shrink-0" />
                <span>Scroll down to load more photos... ({visiblePhotos.length} of {filteredEventPhotos.length} shown)</span>
              </div>
            )}
          </CardBox>

          <div className="rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2" style={{ background: "rgba(8,10,14,0.86)", border: `1px solid ${BORDER_SOFT}` }}>
            <div className="flex flex-wrap items-center gap-2" style={{ color: MUTED, fontSize: "0.74rem" }}>
              <span className="rounded-full px-2 py-1" style={{ background: "rgba(255,255,255,0.04)" }}>{filteredEventPhotos.length} items</span>
              <span className="rounded-full px-2 py-1" style={{ background: "rgba(255,255,255,0.04)" }}>{selectedPhotoIds.length} selected</span>
            </div>
            <div className="truncate max-w-[150px] sm:max-w-[300px]" style={{ color: MUTED, fontSize: "0.74rem" }} title={`/ Events / ${selectedEventData?.name || "No folder"}`}>
              / Events / {selectedEventData?.name || "No folder"}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-4">
          <CardBox>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.92rem", color: TEXT }}>Event Folders</div>
                <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: "2px" }}>Select gallery folder</div>
              </div>
              <button onClick={() => setActiveNav?.(createEventNavTarget)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,151,58,0.12)", color: GOLD }}>
                <Plus size={15} />
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}>
                  <Folder size={30} style={{ color: MUTED, margin: "0 auto 8px" }} />
                  <div style={{ color: TEXT, fontWeight: 700, fontSize: "0.84rem" }}>No event folders</div>
                  <div style={{ color: MUTED, fontSize: "0.72rem", marginTop: "4px" }}>Create an event first.</div>
                  <GoldBtn onClick={() => setActiveNav?.(createEventNavTarget)} small><Plus size={13} /> Create</GoldBtn>
                </div>
              ) : events.map((event) => {
                const active = event.id === selectedEvent;
                return (
                  <button
                    key={event.id}
                    onClick={() => { setSelectedEvent(event.id); setSelectedEventId?.(event.id); }}
                    className="w-full text-left rounded-2xl p-3 transition-all"
                    style={{ background: active ? "rgba(201,151,58,0.13)" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? "rgba(201,151,58,0.32)" : BORDER_SOFT}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: active ? "rgba(201,151,58,0.18)" : "rgba(255,255,255,0.04)", color: active ? GOLD : MUTED }}>
                        <Folder size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate" style={{ color: TEXT, fontWeight: 800, fontSize: "0.8rem" }}>{event.name}</div>
                        <div className="flex items-center gap-1.5 truncate" style={{ color: MUTED, fontSize: "0.68rem", marginTop: "2px" }}>
                          <span className="truncate">{event.id} - {event.photos || "0"} photos</span>
                          {liveUploadEvents[event.id] && (
                            <span className="rounded-full px-1.5 py-0.5 text-[0.56rem] font-black" style={{ background: "rgba(34,197,94,0.14)", color: GREEN }}>
                              LIVE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardBox>
          <CardBox>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: TEXT }}>Live Event Mode</div>
                <div style={{ color: MUTED, fontSize: "0.72rem", marginTop: "3px" }}>
                  Same upload page, faster guest delivery.
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: liveUploadEnabled ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.04)", border: `1px solid ${liveUploadEnabled ? "rgba(34,197,94,0.28)" : BORDER_SOFT}`, color: liveUploadEnabled ? GREEN : MUTED }}>
                <Activity size={18} />
              </div>
            </div>
            <div className="mt-3 rounded-xl p-3" style={{ background: liveUploadEnabled ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${liveUploadEnabled ? "rgba(34,197,94,0.22)" : BORDER_SOFT}` }}>
              <div style={{ color: liveUploadEnabled ? GREEN : MUTED, fontSize: "0.74rem", fontWeight: 900 }}>
                {liveUploadEnabled ? "Live Upload ON" : "Live Upload OFF"}
              </div>
              <div style={{ color: MUTED, fontSize: "0.72rem", lineHeight: 1.5, marginTop: "5px" }}>
                {liveUploadEnabled
                  ? "Guests can keep the QR page open while new uploaded photos become searchable."
                  : "Use normal upload for post-event galleries, or turn Live Upload ON for party/event delivery."}
              </div>
            </div>
          </CardBox>
          <CardBox>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "12px" }}>Selected Event Storage</div>
            <div>
              <div className="flex justify-between mb-1">
                <span style={{ fontSize: "0.75rem", color: MUTED }}>Uploaded</span>
                <span style={{ fontSize: "0.75rem", color: TEXT, fontWeight: 700 }}>
                  {storageSummary ? `${storageSummary.used} / ${storageSummary.quota}` : `${formatStorage(uploadedSizeMb)} / 100 GB`}
                </span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: "6px", background: "rgba(255,255,255,0.08)" }}>
                <div style={{ width: `${storagePercent}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, #e8b84b)`, borderRadius: "9999px" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { label: "Uploaded Files", val: String(eventPhotos.length), color: GOLD },
                { label: "Total Size", val: formatStorage(uploadedSizeMb), color: GREEN },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${BORDER_SOFT}` }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span style={{ fontSize: "0.72rem", color: MUTED }}>{label}</span>
                  </div>
                  <div className="mt-1 truncate" style={{ fontSize: "0.82rem", color: TEXT, fontWeight: 800 }}>{val}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(201,151,58,0.08)", border: `1px solid ${BORDER}` }}>
              <div style={{ color: GOLD, fontWeight: 800, fontSize: "0.78rem" }}>Honest storage summary</div>
              <div style={{ color: MUTED, fontSize: "0.72rem", marginTop: "4px", lineHeight: 1.45 }}>
                Photographer quota is checked on the server before every original file upload.
              </div>
            </div>
          </CardBox>
          <CardBox>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "12px" }}>Upload Guidelines</div>
            <div className="flex flex-col gap-2">
              {[
                "High-resolution images (min 800x600px)",
                "Clear, well-lit face photos for better AI accuracy",
                "Avoid blurry or heavily filtered images",
                "Max 50MB per image, 1000 images per batch",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle size={13} style={{ color: GREEN, marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.75rem", color: MUTED }}>{tip}</span>
                </div>
              ))}
            </div>
          </CardBox>
        </div>
      </div>

      {/* Floating Action Bar for Selected Photos */}
      {selectedPhotoIds.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-6 px-6 py-3 rounded-2xl animate-fadeIn"
          style={{
            background: "rgba(19, 22, 29, 0.9)",
            backdropFilter: "blur(18px)",
            border: `1px solid ${GOLD}`,
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(201, 151, 58, 0.25)",
            minWidth: "340px",
            maxWidth: "90%",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: GOLD }} />
            <span style={{ color: TEXT, fontSize: "0.78rem", fontWeight: 800 }}>
              {selectedPhotoIds.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-95 text-xs font-bold"
              style={{ color: GOLD, background: "rgba(201,151,58,0.12)", border: "1px solid rgba(201,151,58,0.2)" }}
            >
              <Download size={12} /> <span className="hidden sm:inline">Download</span>
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-95 text-xs font-bold"
              style={{ color: BLUE, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}
            >
              <Archive size={12} /> <span className="hidden sm:inline">Move</span>
            </button>
            <button
              onClick={handleDeleteSelectedPhotos}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-95 text-xs font-bold"
              style={{ color: RED, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <Trash2 size={12} /> Delete
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button
              onClick={() => setSelectedPhotoIds([])}
              className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:bg-white/10"
              style={{ color: MUTED }}
              title="Deselect all"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// PAGE 4 - AI INDEXING
const AI_JOBS: any[] = [];

function AiIndexingPage({ photographerEmail }: { photographerEmail?: string }) {
  const [jobs, setJobs] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    try {
      const data = await api.fetchIndexingJobs(photographerEmail);
      setJobs(data);
    } catch (err) {
      console.error("Failed to load indexing jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = window.setInterval(loadJobs, 5000);
    return () => window.clearInterval(interval);
  }, [photographerEmail]);

  const completedCount = jobs.filter(j => j.status === "Completed").length;
  const processingCount = jobs.filter(j => j.status === "Processing").length;
  const pendingCount = jobs.filter(j => j.status === "Pending" || j.status === "Queued").length;

  const displayCompleted = completedCount;
  const displayProcessing = processingCount;
  const displayPending = pendingCount;

  const pieData = [
    { name: "Completed", value: displayCompleted, color: GOLD },
    { name: "Processing",value: displayProcessing,  color: BLUE },
    { name: "Pending",   value: displayPending,   color: PURPLE },
  ];

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <SectionHeader title="AI Indexing" sub="Monitor face recognition indexing jobs"
        action={<GoldBtn onClick={loadJobs}><RefreshCw size={14} /> Refresh</GoldBtn>} />

      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(19,22,29,0.96) 44%, rgba(11,13,18,0.98))", border: `1px solid ${BORDER}` }}>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <div style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>AI Face Indexing Pipeline</div>
            <div className="mt-2" style={{ color: TEXT, fontWeight: 900, fontSize: "1.15rem" }}>Uploaded photos become searchable after indexing</div>
            <p className="mt-1" style={{ color: MUTED, fontSize: "0.82rem", lineHeight: 1.55 }}>
              Track which photos are ready for guest selfie search and which files are still processing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OutlineBtn onClick={() => window.location.reload()}><RefreshCw size={13} /> Reload</OutlineBtn>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Indexed",  value: displayCompleted.toLocaleString(), color: GREEN,  icon: CheckCircle },
          { label: "Processing",     value: displayProcessing.toLocaleString(),  color: BLUE,   icon: RefreshCw },
          { label: "Queued/Pending", value: displayPending.toLocaleString(),    color: PURPLE, icon: Clock },
          { label: "Avg Index Time", value: jobs.length ? "8.4s" : "0s",   color: GOLD,   icon: Zap },
        ].map(({ label, value, color, icon: Icon }) => (
          <CardBox key={label} style={{ padding: "16px", background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(19,22,29,0.96))" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 600 }}>{label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}33` }}><Icon size={14} style={{ color }} /></div>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{value}</div>
          </CardBox>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CardBox style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(19,22,29,0.96))" }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "16px" }}>Indexing Distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {pieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
              </Pie>
              <Tooltip contentStyle={{ background: "#1c2030", border: `1px solid ${BORDER}`, borderRadius: "10px", fontSize: "0.75rem" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-3">
            {pieData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span style={{ fontSize: "0.75rem", color: MUTED }}>{name}</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: TEXT, fontWeight: 600 }}>{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardBox>
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Indexing Jobs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Job ID", "Photo File", "Progress", "File Size", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12" style={{ color: MUTED, fontSize: "0.82rem" }}>
                      Loading indexing jobs...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Cpu size={36} style={{ color: MUTED }} />
                        <div style={{ color: TEXT, fontWeight: 800, fontSize: "0.92rem" }}>No indexing jobs yet</div>
                        <div style={{ color: MUTED, fontSize: "0.78rem" }}>Upload event photos first, then they will appear here for AI processing.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => {
                    const pct = Math.max(0, Math.min(100, job.progress ?? (job.status === "Completed" ? 100 : job.status === "Processing" ? 60 : 0)));
                    const cleanName = getCleanFileName(job.name);
                    return (
                      <tr key={job.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>JOB-{job.id}</td>
                        <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT, maxWidth: "180px" }}><div className="truncate">{cleanName}</div></td>
                        <td className="px-4 py-3" style={{ minWidth: "120px" }}>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 rounded-full overflow-hidden" style={{ height: "5px", background: "rgba(255,255,255,0.08)" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? GREEN : GOLD, borderRadius: "9999px" }} />
                            </div>
                            <span style={{ fontSize: "0.68rem", color: MUTED }}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>{job.size}</td>
                        <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// PAGE 5 - SEARCH LOGS
const SEARCH_LOGS: any[] = [];

function SearchLogsPage({ photographerEmail, setActiveNav }: { photographerEmail?: string; setActiveNav?: (nav: string) => void }) {
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("All");
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await api.fetchSearchLogs(photographerEmail);
        setLogs(data || []);
      } catch (err) {
        console.error("Failed to load search logs:", err);
        setLogs([]);
      }
    }
    async function loadEvents() {
      try {
        const data = await api.fetchEvents(photographerEmail);
        setEvents(data || []);
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    }
    loadLogs();
    loadEvents();
  }, [photographerEmail]);

  const getDisplayStatus = (l: any) => {
    if (l.status === "Failed") return "Failed";
    if (l.status === "Completed") {
      return l.photos > 0 ? "Success" : "No Match";
    }
    return l.status || "Completed";
  };

  const filtered = logs.filter(l => {
    const matchesSearch = 
      (l.guest || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.mobile || "").toLowerCase().includes(search.toLowerCase());
    const matchesEvent = selectedEvent === "All" || l.event === selectedEvent;
    return matchesSearch && matchesEvent;
  });

  const handleExportExcel = () => {
    if (filtered.length === 0) return;
    const headers = ["Log ID", "Guest Name", "Mobile", "Event", "Search Time", "Photos Found", "Status"];
    const rows = filtered.map(l => [
      l.id,
      l.guest || "Guest User",
      l.mobile || "-",
      l.event || "Unknown Event",
      l.time || "-",
      `${l.photos || 0} photos`,
      getDisplayStatus(l)
    ]);
    
    try {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      // Auto-fit column widths
      const maxLens = headers.map((h, i) => {
        return Math.max(h.length, ...rows.map(row => String(row[i] || '').length));
      });
      worksheet["!cols"] = maxLens.map(len => ({ wch: len + 3 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Search Leads");
      
      XLSX.writeFile(workbook, `search_leads_${Date.now()}.xlsx`);
    } catch (e) {
      console.error("XLSX export failed, falling back to CSV", e);
      // Fallback to CSV if XLSX fails
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `search_leads_${Date.now()}.csv`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  };

  const handleExportText = () => {
    if (filtered.length === 0) return;
    const headers = ["Log ID", "Guest Name", "Mobile", "Event", "Search Time", "Photos Found", "Status"];
    const rows = filtered.map(l => [
      l.id,
      l.guest || "Guest User",
      l.mobile || "-",
      l.event || "Unknown Event",
      l.time || "-",
      `${l.photos || 0} photos`,
      getDisplayStatus(l)
    ]);
    
    // Tab delimited format for clear column view in Notepad
    const txtContent = "\uFEFF" + [headers.join("\t"), ...rows.map(e => e.join("\t"))].join("\r\n");
    
    try {
      const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `search_leads_${Date.now()}.txt`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      console.warn("Blob URL download failed, falling back to data URI", e);
      const link = document.createElement("a");
      link.href = "data:text/plain;charset=utf-8," + encodeURIComponent(txtContent);
      link.download = `search_leads_${Date.now()}.txt`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Search Logs" sub="All guest photo search history" />
        <CardBox className="flex flex-col items-center justify-center p-10 text-center gap-4 max-w-xl mx-auto mt-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,151,58,0.12)", color: GOLD }}>
            <Search size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: TEXT }}>No Search Logs Yet</h3>
            <p style={{ fontSize: "0.8rem", color: MUTED, marginTop: "6px", lineHeight: 1.5 }}>
              Guests haven't searched for their photos yet. Share your event QR code link with them to start collecting photo searches!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full justify-center">
            <GoldBtn onClick={() => setActiveNav?.("Events")}><Plus size={14} /> Go to Events</GoldBtn>
          </div>
        </CardBox>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Search Logs" sub="All guest photo search history" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Searches",   value: String(logs.length), color: GREEN,  icon: Search },
          { label: "Successful",       value: String(logs.filter(l => l.status === "Completed" && l.photos > 0).length), color: GOLD,   icon: CheckCircle },
          { label: "Failed/No Match",  value: String(logs.filter(l => l.status === "Failed" || l.photos === 0).length),   color: RED,    icon: AlertCircle },
          { label: "Avg Photos Found", value: logs.length ? String(Math.round(logs.reduce((sum, l) => sum + l.photos, 0) / logs.length)) : "0",     color: BLUE,   icon: Image },
        ].map(({ label, value, color, icon: Icon }) => (
          <CardBox key={label} style={{ padding: "16px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}><Icon size={14} style={{ color }} /></div>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{value}</div>
          </CardBox>
        ))}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by guest or mobile..." />
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-3.5 py-2 rounded-xl outline-none"
            style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}
          >
            <option value="All">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.name}>{e.name}</option>
            ))}
          </select>
        </div>
        <OutlineBtn onClick={() => setShowExportModal(true)} disabled={filtered.length === 0}>
          <Download size={14} /> Export Leads
        </OutlineBtn>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Log ID", "Selfie", "Guest Name", "Mobile", "Event", "Time", "Photos Found", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>{l.id}</td>
                  <td className="px-4 py-3">
                    {l.selfie_url ? (
                      <button onClick={() => window.open(getAssetUrl(l.selfie_url), "_blank")} className="w-10 h-10 rounded-xl overflow-hidden block" style={{ border: `1px solid ${BORDER_SOFT}` }} title="Open guest selfie">
                        <img src={getAssetUrl(l.selfie_url)} alt={`${l.guest} selfie`} className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", color: MUTED }}>
                        <Camera size={15} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(201,151,58,0.2)", color: GOLD }}>{(l.guest || "Guest")[0].toUpperCase()}</div>
                      <span style={{ fontSize: "0.8rem", color: TEXT }}>{l.guest || "Guest User"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT, whiteSpace: "nowrap" }}>
                    <div className="flex items-center gap-2">
                      <span>{l.mobile || "-"}</span>
                      {l.mobile && (
                        <a
                          href={`https://wa.me/91${l.mobile.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-green-500/10 text-green-500"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare size={12} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED, maxWidth: "160px" }}><div className="truncate">{l.event}</div></td>
                  <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED, whiteSpace: "nowrap" }}>{l.time}</td>
                  <td className="px-4 py-3">
                    <span style={{ fontSize: "0.8rem", color: l.photos > 0 ? GREEN : RED, fontWeight: 600 }}>
                      {l.photos > 0 ? `${l.photos} photos` : "No match"}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={getDisplayStatus(l)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <CardBox className="max-w-sm w-full flex flex-col gap-4 p-6 relative" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
            <div className="text-center flex flex-col gap-1.5">
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: TEXT }}>Choose Export Format</h3>
              <p style={{ fontSize: "0.78rem", color: MUTED }}>Select how you want to save your guest leads list</p>
            </div>
            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={() => { handleExportExcel(); setShowExportModal(false); }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all hover:bg-white/[0.04] text-left"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, color: TEXT }}
              >
                <div className="flex flex-col items-start gap-1">
                  <span>Microsoft Excel (.xlsx)</span>
                  <span style={{ fontSize: "0.65rem", color: MUTED, fontWeight: 500 }}>Opens directly in Excel without warnings</span>
                </div>
                <ChevronRight size={14} style={{ color: GOLD }} />
              </button>
              
              <button
                onClick={() => { handleExportText(); setShowExportModal(false); }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all hover:bg-white/[0.04] text-left"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, color: TEXT }}
              >
                <div className="flex flex-col items-start gap-1">
                  <span>Notepad Text (.txt)</span>
                  <span style={{ fontSize: "0.65rem", color: MUTED, fontWeight: 500 }}>Opens instantly in Notepad (Tab-Aligned)</span>
                </div>
                <ChevronRight size={14} style={{ color: GOLD }} />
              </button>
            </div>
          </CardBox>
        </div>
      )}
    </div>
  );
}

// PAGE 6 - USERS & GUESTS
const USERS_LIST: any[] = [];
const ROLE_COLORS: Record<string, string> = { Admin: GOLD, Photographer: BLUE, Client: PURPLE, Guest: MUTED };

function UsersPage({ photographerEmail }: { photographerEmail?: string }) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await api.fetchUsers(photographerEmail);
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
        setUsers([]);
      }
    }
    loadUsers();
  }, [photographerEmail]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Users & Guests" sub="Manage all users and event guests"
        action={<GoldBtn onClick={() => alert("Registration of guests is managed via public event portals (Guest Sign Up).")}><Plus size={14} /> Add User</GoldBtn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Users",   value: String(users.length), color: BLUE,   icon: Users },
          { label: "Admins",        value: String(users.filter(u => u.role === "Admin").length),     color: GOLD,   icon: Shield },
          { label: "Photographers", value: String(users.filter(u => u.role === "Photographer").length),     color: PURPLE, icon: Camera },
          { label: "Guests",        value: String(users.filter(u => u.role === "Guest").length), color: GREEN,  icon: UserCheck },
        ].map(({ label, value, color, icon: Icon }) => (
          <CardBox key={label} style={{ padding: "16px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}><Icon size={14} style={{ color }} /></div>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{value}</div>
          </CardBox>
        ))}
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["User", "Email", "Role", "Events", "Joined", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: "rgba(201,151,58,0.2)", color: GOLD }}>{u.name[0]}</div>
                      <span style={{ fontSize: "0.8rem", color: TEXT, fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span style={{ fontSize: "0.72rem", color: ROLE_COLORS[u.role] ?? MUTED, fontWeight: 600,
                      background: `${ROLE_COLORS[u.role] ?? MUTED}20`, padding: "3px 10px", borderRadius: "9999px" }}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT }}>{u.events_count ?? u.events ?? 0}</td>
                  <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>{u.joined}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => alert(`User Details:\nName: ${u.name}\nEmail: ${u.email}\nRole: ${u.role}\nJoined: ${u.joined}`)} title="View User" className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "rgba(59,130,246,0.15)" }}><Eye size={13} style={{ color: BLUE }} /></button>
                      <button onClick={() => { const newName = prompt("Edit User Name:", u.name); if (newName) setUsers(prev => prev.map(item => item.id === u.id ? { ...item, name: newName } : item)); }} title="Edit User" className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "rgba(201,151,58,0.15)" }}><Edit size={13} style={{ color: GOLD }} /></button>
                      <button onClick={() => { if (window.confirm(`Are you sure you want to delete user ${u.name}?`)) setUsers(prev => prev.filter(item => item.id !== u.id)); }} title="Delete User" className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "rgba(239,68,68,0.15)" }}><Trash2 size={13} style={{ color: RED }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// PAGE 7 - DOWNLOADS
const DOWNLOAD_LIST: any[] = [];

function DownloadsPage({ photographerEmail }: { photographerEmail?: string }) {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDownloads = async () => {
    try {
      const data = await api.fetchAllDownloads(photographerEmail);
      setDownloads(data);
    } catch (err) {
      console.error("Failed to load downloads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownloads();
  }, [photographerEmail]);

  const totalDownloads = downloads.length;
  const uniqueGuests = new Set(downloads.map(d => d.guest)).size;

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <SectionHeader title="Downloads" sub="All photo download history" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Downloads", value: totalDownloads.toLocaleString(),  color: PURPLE, icon: Download },
          { label: "This Month",      value: downloads.length.toLocaleString(),    color: GOLD,   icon: TrendingUp },
          { label: "Data Served",     value: "0 MB", color: BLUE,   icon: Archive },
          { label: "Unique Guests",   value: uniqueGuests.toLocaleString(),  color: GREEN,  icon: Users },
        ].map(({ label, value, color, icon: Icon }) => (
          <CardBox key={label} style={{ padding: "16px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}><Icon size={14} style={{ color }} /></div>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{value}</div>
          </CardBox>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["ID", "Guest / Email", "Event", "File Name", "Size", "Date & Time"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6" style={{ fontSize: "0.8rem", color: MUTED }}>
                    Loading download logs...
                  </td>
                </tr>
              ) : downloads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6" style={{ fontSize: "0.8rem", color: MUTED }}>
                    No downloads recorded in the system.
                  </td>
                </tr>
              ) : downloads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6" style={{ fontSize: "0.8rem", color: MUTED }}>
                    No download logs yet.
                  </td>
                </tr>
              ) : (
                downloads.map((dl) => (
                  <tr key={dl.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>DL-{dl.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: "rgba(168,85,247,0.2)", color: PURPLE }}>{dl.guest[0].toUpperCase()}</div>
                        <span style={{ fontSize: "0.8rem", color: TEXT }}>{dl.guest}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED, maxWidth: "160px" }}><div className="truncate">{dl.event}</div></td>
                    <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT }}>{dl.photo}</td>
                    <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>{dl.size}</td>
                    <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED, whiteSpace: "nowrap" }}>{dl.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// PAGE 8 - PAYMENTS
const PAYMENT_DATA: { month: string; revenue: number }[] = [];
const TRANSACTIONS: any[] = [];

function PaymentsPage({ photographerEmail }: { photographerEmail?: string }) {
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    async function loadTxns() {
      try {
        const data = await api.fetchTransactions(photographerEmail);
        setTxns(data);
      } catch (err) {
        console.error("Failed to load transactions:", err);
        setTxns([]);
      }
    }
    loadTxns();
  }, [photographerEmail]);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title="Payments & Revenue" sub="Track your earnings and transactions"
        action={<OutlineBtn><FileText size={14} /> Export Report</OutlineBtn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: "Rs 0", sub: "All time",   color: GOLD,  icon: IndianRupee },
          { label: "This Month",    value: "Rs 0", sub: "Jun 2026",   color: GREEN, icon: TrendingUp },
          { label: "Pending Dues",  value: "Rs 0", sub: "Cleared",    color: BLUE,  icon: Clock },
          { label: "Refunds",       value: "Rs 0", sub: "This Month", color: RED,   icon: AlertCircle },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <CardBox key={label} style={{ padding: "16px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}><Icon size={14} style={{ color }} /></div>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{value}</div>
            <div style={{ fontSize: "0.68rem", color: MUTED, marginTop: "4px" }}>{sub}</div>
          </CardBox>
        ))}
      </div>
      <CardBox>
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Monthly Revenue 2026</span>
          <span style={{ fontSize: "0.72rem", color: MUTED }}>Last 6 months</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={PAYMENT_DATA}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "#1c2030", border: `1px solid ${BORDER}`, borderRadius: "10px", fontSize: "0.75rem" }} labelStyle={{ color: TEXT }} />
            <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} fill="url(#revenueGrad)" name="Revenue" />
          </AreaChart>
        </ResponsiveContainer>
      </CardBox>
      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Recent Transactions</span>
          <button className="text-xs flex items-center gap-1" style={{ color: GOLD }}>View All <ChevronRight size={13} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Txn ID", "Client", "Event", "Amount", "Date", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>{tx.id}</td>
                  <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: TEXT }}><div className="truncate">{tx.client || "Guest"}</div></td>
                  <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: TEXT, maxWidth: "180px" }}><div className="truncate">{tx.event}</div></td>
                  <td className="px-4 py-3" style={{ fontSize: "0.82rem", color: GOLD, fontWeight: 700 }}>{tx.amount}</td>
                  <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>{tx.date}</td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// PAGE 9 - SETTINGS
function SettingsPage() {
  const [notifEmail, setNotifEmail] = useState(true);
  const [autoIndex,  setAutoIndex]  = useState(true);
  const [watermark,  setWatermark]  = useState(false);

  const [guestTheme,     setGuestTheme]     = useState("Gold");
  const [galleryLayout,  setGalleryLayout]  = useState("Masonry");
  const [fontTheme,      setFontTheme]      = useState("Serif");
  const [previewMode,    setPreviewMode]    = useState<"desktop" | "mobile">("desktop");

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0"
      style={{ background: value ? GOLD : "rgba(255,255,255,0.12)" }}>
      <span className="absolute top-1 w-4 h-4 rounded-full transition-all duration-200"
        style={{ background: "#fff", left: value ? "calc(100% - 20px)" : "4px" }} />
    </button>
  );

  const SettingRow = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) => (
    <div className="flex items-center justify-between py-3.5 w-full" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
      <div className="text-left pr-4">
        <div style={{ fontSize: "0.85rem", color: TEXT, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: "2px", lineHeight: 1.35 }}>{desc}</div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );

  const THEME_COLORS = [
    { name: "Gold", hex: "#dfb76c" },
    { name: "Rose", hex: "#e0a899" },
    { name: "Royal", hex: "#3b82f6" },
    { name: "Emerald", hex: "#10b981" },
    { name: "Silver", hex: "#a1a1aa" }
  ];
  const LAYOUTS = ['Masonry', 'Square', 'Rows'];
  const FONTS = ['Serif', 'Sans', 'Creative'];

  const guestThemeColor = THEME_COLORS.find(c => c.name === guestTheme)?.hex || GOLD;
  const fontThemeFamily = 
    fontTheme === 'Serif' ? 'Georgia, serif' :
    fontTheme === 'Sans' ? 'system-ui, sans-serif' :
    'cursive, sans-serif';

  return (
    <div className='flex flex-col gap-6 max-w-6xl mx-auto w-full items-stretch py-2'>
      {/* Header */}
      <div className='flex flex-col items-start text-left w-full mb-1'>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: TEXT }}>Settings</h2>
        <p style={{ fontSize: '0.82rem', color: MUTED, marginTop: '4px' }}>Manage your account and preferences</p>
      </div>

      {/* Two Column Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start w-full'>
        {/* Left Column: All Controls & Settings Form */}
        <div className='flex flex-col gap-5 w-full'>
          <CardBox className='flex flex-col items-start w-full'>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', color: TEXT }}>Preferences</div>
            <div style={{ fontSize: '0.75rem', color: MUTED, marginBottom: '12px' }}>Configure alerts and processing rules</div>
            <SettingRow label='Email Notifications' desc='Receive event summary updates' value={notifEmail} onChange={() => setNotifEmail(!notifEmail)} />
            <SettingRow label='Auto AI Indexing' desc='Index faces automatically on photo upload' value={autoIndex} onChange={() => setAutoIndex(!autoIndex)} />
            <SettingRow label='Download Watermark' desc='Add MasterStudio watermark to guest downloads' value={watermark} onChange={() => setWatermark(!watermark)} />
          </CardBox>

          {/* Branding & Design Card */}
          <CardBox className='flex flex-col items-start w-full gap-4'>
            <div className='w-full'>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', color: TEXT }}>Client Gallery Design</div>
              <div style={{ fontSize: '0.75rem', color: MUTED }}>Customize the look of the guest gallery page (Jaise Shaadi, Birthday, ya Event ke hisab se design)</div>
            </div>

            {/* Live Preview Screen (Mini Mobile Mockup) - Hide on desktop to avoid duplicate previews */}
            <div className='w-full rounded-2xl p-4 flex lg:hidden flex-col gap-2.5 relative overflow-hidden' 
              style={{ background: '#0a0c10', border: `1px solid ${BORDER}` }}>
              <div className='flex justify-between items-center pb-2' style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
                <span style={{ fontSize: '0.62rem', color: MUTED, fontWeight: 700, letterSpacing: '1px' }}>LIVE PREVIEW (MOCKUP)</span>
                <div className='flex gap-1'>
                  <span className='w-1.5 h-1.5 rounded-full bg-red-500/40' />
                  <span className='w-1.5 h-1.5 rounded-full bg-yellow-500/40' />
                  <span className='w-1.5 h-1.5 rounded-full bg-green-500/40' />
                </div>
              </div>

              {/* Mini Gallery Content */}
              <div className='flex flex-col items-center gap-2.5 text-center py-1.5'>
                {/* Logo placeholder with selected theme color */}
                <div className='w-9 h-9 rounded-full flex items-center justify-center text-[0.7rem] font-black transition-all duration-300'
                  style={{ 
                    background: `linear-gradient(135deg, ${guestThemeColor}18, ${guestThemeColor}35)`, 
                    border: `2px solid ${guestThemeColor}`,
                    color: guestThemeColor,
                    boxShadow: `0 0 10px ${guestThemeColor}20`
                  }}
                >
                  M
                </div>
                
                {/* Event Title with selected Font Theme */}
                <div 
                  className='transition-all duration-300'
                  style={{ 
                    fontSize: '0.92rem', 
                    fontWeight: 800, 
                    color: TEXT,
                    fontFamily: fontThemeFamily 
                  }}
                >
                  Client Event Gallery
                </div>

                {/* Layout Grid Preview */}
                <div className='w-full mt-1.5 transition-all duration-300'>
                  {galleryLayout === 'Masonry' && (
                    <div className='grid grid-cols-3 gap-1.5 items-end'>
                      <div className='h-10 rounded-lg bg-white/10 border border-white/5' />
                      <div className='h-14 rounded-lg bg-white/10 border border-white/5' />
                      <div className='h-8 rounded-lg bg-white/10 border border-white/5' />
                    </div>
                  )}
                  {galleryLayout === 'Square' && (
                    <div className='grid grid-cols-3 gap-1.5'>
                      <div className='aspect-square rounded-lg bg-white/10 border border-white/5' />
                      <div className='aspect-square rounded-lg bg-white/10 border border-white/5' />
                      <div className='aspect-square rounded-lg bg-white/10 border border-white/5' />
                    </div>
                  )}
                  {galleryLayout === 'Rows' && (
                    <div className='flex flex-col gap-1.5 w-full'>
                      <div className='h-7 rounded-lg bg-white/10 border border-white/5 w-full' />
                      <div className='h-7 rounded-lg bg-white/10 border border-white/5 w-full' />
                    </div>
                  )}
                </div>

                {/* Premium Button with selected theme color */}
                <button className='w-full py-2 rounded-xl font-bold mt-2 text-[0.72rem] transition-all duration-300 pointer-events-none'
                  style={{ background: guestThemeColor, color: '#000' }}>
                  Find My Photo
                </button>
              </div>
            </div>

            {/* Theme Color */}
            <div className='flex flex-col gap-2 w-full mt-1'>
              <div className='flex justify-between items-center w-full'>
                <label style={{ fontSize: '0.78rem', color: TEXT, fontWeight: 600 }}>Gallery Theme Color</label>
                <span style={{ fontSize: '0.68rem', color: GOLD, fontWeight: 700 }}>
                  {guestTheme === 'Gold' && 'Shaadi / Haldi Gold'}
                  {guestTheme === 'Rose' && 'Rose Pink / Mehendi Blush'}
                  {guestTheme === 'Royal' && 'Royal Blue (Corporate)'}
                  {guestTheme === 'Emerald' && 'Emerald Green (Nature theme)'}
                  {guestTheme === 'Silver' && 'Classic Silver'}
                </span>
              </div>
              <div className='flex gap-2.5 items-center mt-0.5'>
                {THEME_COLORS.map(c => {
                  const isSelected = guestTheme === c.name;
                  return (
                    <button 
                      key={c.name}
                      onClick={() => setGuestTheme(c.name)}
                      className='w-7 h-7 rounded-full flex items-center justify-center relative transition-all active:scale-95 border border-white/10'
                      style={{ 
                        background: c.hex,
                        boxShadow: isSelected ? `0 0 10px ${c.hex}` : 'none',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                      }}
                      title={c.name}
                    >
                      {isSelected && <Check size={12} style={{ color: '#000', strokeWidth: 3 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid Style */}
            <div className='flex flex-col gap-2 w-full mt-1'>
              <label style={{ fontSize: '0.78rem', color: TEXT, fontWeight: 600 }}>Photos Layout Style</label>
              <div className='flex rounded-xl p-1 bg-[#1c2030] border border-white/5 w-full mt-0.5'>
                {[
                  { id: 'Masonry', label: 'Mix (Pinterest Style)' },
                  { id: 'Square', label: 'Square (Instagram Style)' },
                  { id: 'Rows', label: 'Cinematic (No Crop)' }
                ].map(layout => {
                  const isSelected = galleryLayout === layout.id;
                  return (
                    <button
                      key={layout.id}
                      onClick={() => setGalleryLayout(layout.id)}
                      className='flex-1 py-1.5 rounded-lg text-[0.7rem] font-bold transition-all text-center px-1'
                      style={{
                        background: isSelected ? 'rgba(201,151,58,0.16)' : 'transparent',
                        color: isSelected ? GOLD : MUTED
                      }}
                    >
                      {layout.label}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: '0.68rem', color: MUTED, marginTop: '1px' }}>
                {galleryLayout === 'Masonry' && 'Portrait aur landscape photos ko natural mix layout me dikhata hai.'}
                {galleryLayout === 'Square' && 'Sabhi photos ko uniform square grid me fit karta hai.'}
                {galleryLayout === 'Rows' && 'Landscape images ko cinematic rows me bina heavy crop ke dikhata hai.'}
              </span>
            </div>

            {/* Font Theme */}
            <div className='flex flex-col gap-2 w-full mt-1 pb-1'>
              <label style={{ fontSize: '0.78rem', color: TEXT, fontWeight: 600 }}>Gallery Font Style</label>
              <div className='flex rounded-xl p-1 bg-[#1c2030] border border-white/5 w-full mt-0.5'>
                {[
                  { id: 'Serif', label: 'Royal / Wedding' },
                  { id: 'Sans', label: 'Modern Clean' },
                  { id: 'Creative', label: 'Fancy / Stylish' }
                ].map(font => {
                  const isSelected = fontTheme === font.id;
                  return (
                    <button
                      key={font.id}
                      onClick={() => setFontTheme(font.id)}
                      className='flex-1 py-1.5 rounded-lg text-[0.7rem] font-bold transition-all text-center px-1'
                      style={{
                        background: isSelected ? 'rgba(201,151,58,0.16)' : 'transparent',
                        color: isSelected ? GOLD : MUTED
                      }}
                    >
                      {font.label}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: '0.68rem', color: MUTED, marginTop: '1px' }}>
                {fontTheme === 'Serif' && 'Royal traditional font for weddings and receptions.'}
                {fontTheme === 'Sans' && 'Simple modern font for corporate and fashion events.'}
                {fontTheme === 'Creative' && 'Stylish display font for birthdays, shoots, and parties.'}
              </span>
            </div>
          </CardBox>

          {/* Change Password Card */}
          <CardBox className='flex flex-col items-start w-full'>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', color: TEXT }}>Change Password</div>
            <div style={{ fontSize: '0.75rem', color: MUTED, marginBottom: '16px' }}>Update your login credentials securely</div>
            <div className='flex flex-col gap-3.5 w-full'>
              {['Current Password', 'New Password', 'Confirm New Password'].map((label) => (
                <div key={label} className='flex flex-col gap-1.5 w-full'>
                  <label style={{ fontSize: '0.78rem', color: TEXT, fontWeight: 600 }} className='text-left'>{label}</label>
                  <div className='relative w-full'>
                    <Lock size={14} className='absolute left-3.5 top-1/2 -translate-y-1/2' style={{ color: MUTED }} />
                    <input type='password' placeholder='Password' className='w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-left'
                      style={{ background: '#1c2030', border: `1px solid ${BORDER}`, color: TEXT, fontSize: '0.82rem' }} />
                  </div>
                </div>
              ))}
              <div className='flex justify-start mt-2'>
                <GoldBtn onClick={() => alert('Password update will be connected to authentication settings.')}><Lock size={14} /> Update Password</GoldBtn>
              </div>
            </div>
          </CardBox>

          {/* Danger Zone Card */}
          <CardBox style={{ border: '1px solid rgba(239,68,68,0.12)' }} className='flex flex-col items-start gap-3 w-full'>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: RED }}>Danger Zone</div>
            <div className='flex items-center justify-between w-full'>
              <div className='text-left pr-4'>
                <div style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 600 }}>Delete Account</div>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '2px', lineHeight: 1.35 }}>Permanently delete your account and all data. This cannot be undone.</div>
              </div>
              <button onClick={() => { if (window.confirm('Are you sure you want to delete your account? All data will be lost.')) alert('Account deletion is not enabled yet.'); }} className='px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-all duration-200 hover:bg-red-500/10'
                style={{ background: 'rgba(239,68,68,0.08)', color: RED, border: '1px solid rgba(239,68,68,0.2)' }}>Delete</button>
            </div>
          </CardBox>
        </div>

        {/* Right Column: Interactive Gallery Live Preview Mockup (Tabbed) */}
        <div className='hidden lg:flex sticky top-5 w-full flex-col gap-4'>
          {/* Segmented Device Switcher */}
          <div className='flex justify-between items-center bg-[#1c2030] p-1.5 rounded-2xl border border-white/5 w-full shadow-lg'>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: TEXT, paddingLeft: '8px' }}>Gallery Live Preview</div>
            <div className='flex gap-1 bg-[#0d0f16] p-1 rounded-xl'>
              <button 
                onClick={() => setPreviewMode("desktop")}
                className='px-3 py-1.5 rounded-lg text-[0.7rem] font-black transition-all flex items-center gap-1.5'
                style={{
                  background: previewMode === "desktop" ? GOLD : "transparent",
                  color: previewMode === "desktop" ? "#000" : MUTED
                }}
              >
                Desktop View
              </button>
              <button 
                onClick={() => setPreviewMode("mobile")}
                className='px-3 py-1.5 rounded-lg text-[0.7rem] font-black transition-all flex items-center gap-1.5'
                style={{
                  background: previewMode === "mobile" ? GOLD : "transparent",
                  color: previewMode === "mobile" ? "#000" : MUTED
                }}
              >
                Mobile View
              </button>
            </div>
          </div>

          {previewMode === "desktop" ? (
            /* Widescreen Browser Window Mockup */
            <div className='w-full rounded-2xl border overflow-hidden flex flex-col shadow-2xl transition-all duration-500'
              style={{ 
                background: '#07090d', 
                borderColor: BORDER_SOFT,
                boxShadow: `0 20px 40px rgba(0,0,0,0.5), 0 0 40px ${guestThemeColor}05`
              }}
            >
              {/* Browser Header Bar */}
              <div className='px-4 py-3 flex items-center justify-between border-b shrink-0'
                style={{ background: '#0d1017', borderColor: BORDER_SOFT }}
              >
                {/* Window Dots */}
                <div className='flex gap-1.5 items-center w-12'>
                  <span className='w-3 h-3 rounded-full bg-red-500/35 border border-red-500/20' />
                  <span className='w-3 h-3 rounded-full bg-yellow-500/35 border border-yellow-500/20' />
                  <span className='w-3 h-3 rounded-full bg-green-500/35 border border-green-500/20' />
                </div>
                {/* URL Address Bar */}
                <div className='flex-1 max-w-md mx-6 rounded-lg py-1 px-3 flex items-center justify-center gap-1.5 text-[0.65rem] border border-white/5'
                  style={{ background: 'rgba(255,255,255,0.02)', color: MUTED }}
                >
                  <span style={{ color: TEXT }}>studio.masterstudio.app</span>/event/gallery
                </div>
                <div className='w-12' />
              </div>

              {/* Mockup Desktop Site Body */}
              <div className='p-6 flex flex-col gap-5 overflow-y-auto max-h-[600px] min-h-[500px]'>
                {/* Client Page Header (Desktop Navbar Style) */}
                <div className='flex justify-between items-center pb-4 border-b' style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className='flex items-center gap-2.5'>
                    {/* Studio logo */}
                    <div className='w-9 h-9 rounded-full flex items-center justify-center text-[0.7rem] font-black transition-all duration-300'
                      style={{ 
                        background: `linear-gradient(135deg, ${guestThemeColor}18, ${guestThemeColor}35)`, 
                        border: `2px solid ${guestThemeColor}`,
                        color: guestThemeColor,
                        boxShadow: `0 0 10px ${guestThemeColor}15`
                      }}
                    >
                      M
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: TEXT, letterSpacing: '0.5px' }}>PRIYA STUDIO</div>
                      <div style={{ fontSize: '0.55rem', color: MUTED, letterSpacing: '1px' }}>OFFICIAL GALLERY</div>
                    </div>
                  </div>

                  {/* Navigation Links for Desktop Feeling */}
                  <div className='flex items-center gap-4 text-[0.68rem] font-semibold text-white/50'>
                    <span className='cursor-pointer hover:text-white transition-colors'>Home</span>
                    <span className='cursor-pointer hover:text-white transition-colors' style={{ color: guestThemeColor }}>Gallery</span>
                    <span className='cursor-pointer hover:text-white transition-colors'>Slideshow</span>
                    <span className='cursor-pointer hover:text-white transition-colors'>About</span>
                  </div>

                  {/* Contact button */}
                  <div className='px-3.5 py-1.5 rounded-full text-[0.58rem] font-bold border cursor-pointer hover:bg-white/5 transition-all' style={{ borderColor: 'rgba(255,255,255,0.1)', color: TEXT }}>
                    Contact Us
                  </div>
                </div>

                {/* Event Hero Area - Desktop Split Style */}
                <div className='grid grid-cols-1 md:grid-cols-12 rounded-2xl relative overflow-hidden border border-white/[0.03]'
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.002) 100%)',
                  }}
                >
                  {/* Left: Text & Search Info */}
                  <div className='md:col-span-7 p-5 flex flex-col items-start text-left justify-center z-10'>
                    <div style={{ fontSize: '0.62rem', color: guestThemeColor, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      Wedding Celebration
                    </div>
                    <div 
                      className='transition-all duration-300 text-[1.4rem] font-black tracking-wide mt-2'
                      style={{ 
                        color: TEXT,
                        fontFamily: fontThemeFamily 
                      }}
                    >
                      Client Event
                    </div>
                    <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: '5px' }} className='flex items-center gap-1.5'>
                      <span>18 December 2026</span>
                      <span>-</span>
                      <span>Event Venue</span>
                    </div>

                    {/* Search Selfie Button */}
                    <button className='mt-5 px-5 py-2.5 rounded-xl font-bold text-[0.68rem] transition-all duration-300 flex items-center gap-2 shadow-lg pointer-events-none'
                      style={{ 
                        background: guestThemeColor, 
                        color: '#000',
                        boxShadow: `0 6px 15px ${guestThemeColor}20`
                      }}
                    >
                      Search Your Photos by Selfie
                    </button>
                  </div>

                  {/* Right: Cover Image Visual Placeholder */}
                  <div className='md:col-span-5 min-h-[120px] bg-white/[0.02] border-l border-white/[0.04] relative flex items-center justify-center overflow-hidden'>
                    <div className="absolute inset-0 opacity-15" style={{
                      background: `radial-gradient(circle at center, ${guestThemeColor} 0%, transparent 80%)`
                    }} />
                    {/* Visual pattern representing photo */}
                    <div className='w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/[0.02] text-white/20 font-serif text-lg z-10'>
                      Couple
                    </div>
                  </div>
                </div>

                {/* Photos Grid Container */}
                <div className='flex flex-col gap-3 mt-1'>
                  <div className='flex justify-between items-center'>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: TEXT }}>All Photos (124)</span>
                    <div className='flex gap-2 text-[0.62rem] text-white/40'>
                      <span className='text-white font-bold' style={{ borderBottom: `2.5px solid ${guestThemeColor}`, paddingBottom: '2px' }}>Grid</span>
                      <span>List</span>
                      <span>Favorites</span>
                    </div>
                  </div>

                  {/* Responsive Grid Mockup - Desktop Widescreen Grid (4 Columns) */}
                  <div className='transition-all duration-300 w-full'>
                    {galleryLayout === 'Masonry' && (
                      <div className='grid grid-cols-4 gap-2 items-start'>
                        <div className='flex flex-col gap-2'>
                          <div className='h-16 rounded-xl bg-white/[0.04] border border-white/[0.02]' />
                          <div className='h-24 rounded-xl bg-white/[0.04] border border-white/[0.02]' />
                        </div>
                        <div className='flex flex-col gap-2'>
                          <div className='h-28 rounded-xl bg-white/[0.04] border border-white/[0.02]' />
                          <div className='h-14 rounded-xl bg-white/[0.04] border border-white/[0.02]' />
                        </div>
                        <div className='flex flex-col gap-2'>
                          <div className='h-20 rounded-xl bg-white/[0.04] border border-white/[0.02]' />
                          <div className='h-20 rounded-xl bg-white/[0.04] border border-white/[0.02]' />
                        </div>
                        <div className='flex flex-col gap-2'>
                          <div className='h-14 rounded-xl bg-white/[0.04] border border-white/[0.02]' />
                          <div className='h-24 rounded-xl bg-white/[0.04] border border-white/[0.02]' />
                        </div>
                      </div>
                    )}
                    {galleryLayout === 'Square' && (
                      <div className='grid grid-cols-4 gap-2'>
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className='aspect-square rounded-xl bg-white/[0.04] border border-white/[0.02]' />
                        ))}
                      </div>
                    )}
                    {galleryLayout === 'Rows' && (
                      <div className='flex flex-col gap-2 w-full'>
                        <div className='flex gap-2 w-full'>
                          <div className='h-16 rounded-xl bg-white/[0.04] border border-white/[0.02] flex-1' />
                          <div className='h-16 rounded-xl bg-white/[0.04] border border-white/[0.02] flex-[1.4]' />
                        </div>
                        <div className='flex gap-2 w-full'>
                          <div className='h-16 rounded-xl bg-white/[0.04] border border-white/[0.02] flex-[1.3]' />
                          <div className='h-16 rounded-xl bg-white/[0.04] border border-white/[0.02] flex-1' />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Smartphone Frame Mockup for Mobile Preview */
            <div className='w-full flex justify-center items-center py-4 rounded-2xl border border-[#1c2030] shadow-2xl'
              style={{ 
                background: '#07090d',
                borderColor: BORDER_SOFT,
              }}
            >
              {/* Smartphone Outer Shell */}
              <div className='w-[270px] rounded-[38px] border-[7px] border-[#1c2030] overflow-hidden flex flex-col shadow-2xl relative bg-[#07090d]'
                style={{ 
                  aspectRatio: '9/19.2',
                  boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 35px ${guestThemeColor}05`
                }}
              >
                {/* Phone Notch/Speaker */}
                <div className='absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-[#1c2030] rounded-b-xl z-20 flex justify-center items-center gap-1.5'>
                  <span className='w-6 h-1 bg-white/20 rounded-full' />
                  <span className='w-1.5 h-1.5 rounded-full bg-white/10' />
                </div>

                {/* Phone Content Frame (Mobile View) */}
                <div className='flex-1 p-4 pt-6 flex flex-col gap-4 overflow-y-auto max-h-[500px] select-none'>
                  {/* Client Page Header */}
                  <div className='flex justify-between items-center pb-2.5 border-b' style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className='flex items-center gap-2'>
                      {/* Studio logo */}
                      <div className='w-6 h-6 rounded-full flex items-center justify-center text-[0.5rem] font-black'
                        style={{ 
                          background: `linear-gradient(135deg, ${guestThemeColor}18, ${guestThemeColor}35)`, 
                          border: `1.5px solid ${guestThemeColor}`,
                          color: guestThemeColor,
                        }}
                      >
                        M
                      </div>
                      <span style={{ fontSize: '0.55rem', fontWeight: 800, color: TEXT, letterSpacing: '0.5px' }}>PRIYA STUDIO</span>
                    </div>
                    <span style={{ fontSize: '0.5rem', color: guestThemeColor, fontWeight: 800 }}>MOCK</span>
                  </div>

                  {/* Event Hero Area */}
                  <div className='flex flex-col items-center justify-center text-center py-4 px-3 rounded-xl relative overflow-hidden border border-white/[0.02]'
                    style={{ 
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(0,0,0,0.2) 100%)' 
                    }}
                  >
                    <div 
                      className='transition-all duration-300 text-[0.98rem] font-bold'
                      style={{ 
                        color: TEXT,
                        fontFamily: fontThemeFamily 
                      }}
                    >
                      Client Event
                    </div>
                    <div style={{ fontSize: '0.52rem', color: guestThemeColor, fontWeight: 700, letterSpacing: '1px', marginTop: '3px', textTransform: 'uppercase' }}>
                      Wedding Celebration
                    </div>
                    <div style={{ fontSize: '0.48rem', color: MUTED, marginTop: '2px' }}>
                      18 Dec 2026 - Event Venue
                    </div>
                  </div>

                  {/* Search Selfie Button */}
                  <button className='w-full py-2 rounded-xl font-bold text-[0.62rem] transition-all duration-300 flex items-center justify-center gap-1.5 shadow-lg pointer-events-none'
                    style={{ 
                      background: guestThemeColor, 
                      color: '#000',
                      boxShadow: `0 4px 10px ${guestThemeColor}20`
                    }}
                  >
                    Search Photo by Selfie
                  </button>

                  {/* Photos Grid Container */}
                  <div className='flex flex-col gap-2.5 mt-0.5'>
                    <div className='flex justify-between items-center'>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: TEXT }}>All Photos (124)</span>
                    </div>

                    {/* Mobile Grid Layout Preview (2 Columns) */}
                    <div className='transition-all duration-300 w-full'>
                      {galleryLayout === 'Masonry' && (
                        <div className='grid grid-cols-2 gap-1.5 items-end'>
                          <div className='flex flex-col gap-1.5'>
                            <div className='h-14 rounded-lg bg-white/[0.04] border border-white/[0.02]' />
                            <div className='h-20 rounded-lg bg-white/[0.04] border border-white/[0.02]' />
                          </div>
                          <div className='flex flex-col gap-1.5'>
                            <div className='h-24 rounded-lg bg-white/[0.04] border border-white/[0.02]' />
                            <div className='h-12 rounded-lg bg-white/[0.04] border border-white/[0.02]' />
                          </div>
                        </div>
                      )}
                      {galleryLayout === 'Square' && (
                        <div className='grid grid-cols-2 gap-1.5'>
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className='aspect-square rounded-lg bg-white/[0.04] border border-white/[0.02]' />
                          ))}
                        </div>
                      )}
                      {galleryLayout === 'Rows' && (
                        <div className='flex flex-col gap-1.5 w-full'>
                          <div className='h-12 rounded-lg bg-white/[0.04] border border-white/[0.02] w-full' />
                          <div className='h-12 rounded-lg bg-white/[0.04] border border-white/[0.02] w-full' />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// PAGE 10 - PROFILE
interface ProfilePageProps {
  currentUser: UserData | null;
  onUpdate: (updated: UserData) => void;
}

function ProfilePage({ currentUser, onUpdate }: ProfilePageProps) {
  const [name,    setName]    = useState(currentUser?.name || "");
  const [email,   setEmail]   = useState(currentUser?.email || "");
  const [phone,   setPhone]   = useState(currentUser?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || "");
  const [brandLogoUrl, setBrandLogoUrl] = useState(currentUser?.brand_logo_url || "");
  const [brandName, setBrandName] = useState(currentUser?.brand_name || currentUser?.name || "");
  const [rightsText, setRightsText] = useState(currentUser?.brand_rights_text || "");
  const [instagramUrl, setInstagramUrl] = useState(currentUser?.instagram_url || "");
  const [facebookUrl, setFacebookUrl] = useState(currentUser?.facebook_url || "");
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState(currentUser?.website_url || "");
  const [whatsappUrl, setWhatsappUrl] = useState(currentUser?.whatsapp_url || "");
  const [city,    setCity]    = useState(currentUser?.address || "");
  const [bio,     setBio]     = useState(currentUser?.about_studio || "");
  const [requestedBrandName, setRequestedBrandName] = useState("");
  const [brandChangeReason, setBrandChangeReason] = useState("");
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [brandLogoLoading, setBrandLogoLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const brandLogoInputRef = useRef<HTMLInputElement>(null);

  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    async function loadEvents() {
      if (!currentUser?.email) return;
      try {
        const list = await api.fetchEvents(currentUser.email);
        setEvents(list);
      } catch (err) {
        console.error("Failed to load events for profile stats:", err);
      }
    }
    loadEvents();
  }, [currentUser?.email]);

  const totalPhotos = events.reduce((sum, ev) => sum + (parseInt(ev.photos || "0") || 0), 0);
  const totalGuests = events.reduce((sum, ev) => sum + (ev.guests || 0), 0);
  const totalRevenue = events.reduce((sum, ev) => {
    if (!ev.revenue) return sum;
    const cleanStr = ev.revenue.replace(/[^0-9.]/g, "");
    const val = parseFloat(cleanStr) || 0;
    return sum + val;
  }, 0);
  const verificationStatus = currentUser?.verification_status || "Pending Verification";
  const isBrandVerified = verificationStatus === "Verified";
  const hasBrandChangeRequest = Boolean(currentUser?.brand_change_request);
  const profileCompletionItems = [
    Boolean(brandName.trim()),
    Boolean(brandLogoUrl),
    Boolean(phone.trim()),
    Boolean(city.trim()),
    Boolean(brandWebsiteUrl.trim() || instagramUrl.trim()),
  ];
  const profileCompletion = Math.round((profileCompletionItems.filter(Boolean).length / profileCompletionItems.length) * 100);
  const verificationColor = isBrandVerified ? GREEN : verificationStatus === "Rejected" ? RED : GOLD;
  const verificationBg = isBrandVerified ? "rgba(34,197,94,0.12)" : verificationStatus === "Rejected" ? "rgba(239,68,68,0.12)" : "rgba(201,151,58,0.12)";

  // Sync state with loaded user data
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setPhone(currentUser.phone || "");
      setAvatarUrl(currentUser.avatar_url || "");
      setBrandLogoUrl(currentUser.brand_logo_url || "");
      setBrandName(currentUser.brand_name || currentUser.name || "");
      setRightsText(currentUser.brand_rights_text || "");
      setInstagramUrl(currentUser.instagram_url || "");
      setFacebookUrl(currentUser.facebook_url || "");
      setBrandWebsiteUrl(currentUser.website_url || "");
      setWhatsappUrl(currentUser.whatsapp_url || "");
      setCity(currentUser.address || "");
      setBio(currentUser.about_studio || "");
    }
  }, [currentUser]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setAvatarLoading(true);
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);

    try {
      const updated = await api.uploadUserAvatar(currentUser.id, file);
      onUpdate(updated);
      setAvatarUrl(updated.avatar_url || "");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setAvatarUrl(currentUser.avatar_url || "");
      setError(err.message || "Failed to upload profile photo");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setAvatarLoading(false);
      e.target.value = "";
    }
  };

  const handleBrandLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (isBrandVerified) {
      setError("Verified brand logo locked hai. Brand change request submit karo.");
      e.target.value = "";
      return;
    }

    setBrandLogoLoading(true);
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setBrandLogoUrl(previewUrl);

    try {
      const updated = await api.uploadBrandLogo(currentUser.id, file);
      onUpdate(updated);
      setBrandLogoUrl(updated.brand_logo_url || "");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setBrandLogoUrl(currentUser.brand_logo_url || "");
      setError(err.message || "Failed to upload brand logo");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setBrandLogoLoading(false);
      e.target.value = "";
    }
  };

  const saveProfileDetails = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.updateUser(currentUser.id, name, email, isBrandVerified ? (currentUser.phone || "") : phone, currentUser.plan, currentUser.status, {
        brand_name: isBrandVerified ? (currentUser.brand_name || "") : brandName,
        brand_rights_text: rightsText,
        instagram_url: instagramUrl,
        facebook_url: facebookUrl,
        website_url: brandWebsiteUrl,
        whatsapp_url: whatsappUrl,
        address: city,
        about_studio: bio,
      });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveProfileDetails();
  };

  const submitBrandChangeRequest = async () => {
    if (!currentUser) return;
    if (!requestedBrandName.trim()) {
      setError("Requested brand name required hai.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await api.requestBrandChange(currentUser.id, requestedBrandName, brandChangeReason);
      onUpdate(updated);
      setRequestedBrandName("");
      setBrandChangeReason("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to submit brand change request");
    } finally {
      setLoading(false);
    }
  };

  const InputRow = ({ icon: Icon, label, value, onChange, type = "text", disabled = false }: {
    icon: React.ElementType; label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean;
  }) => (
    <div className="flex flex-col gap-1.5 items-start w-full">
      <label style={{ fontSize: "0.76rem", color: TEXT, fontWeight: 800 }}>{label}</label>
      <div className="relative w-full">
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MUTED }} />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-left transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(201,151,58,0.08)]"
          style={{ background: disabled ? "rgba(255,255,255,0.035)" : "rgba(28,32,48,0.92)", border: `1px solid ${disabled ? BORDER_SOFT : BORDER}`, color: disabled ? MUTED : TEXT, fontSize: "0.82rem", cursor: disabled ? "not-allowed" : "text" }} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full items-stretch animate-fadeIn">
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full rounded-3xl px-5 py-4"
        style={{ background: "linear-gradient(90deg, rgba(201,151,58,0.075), rgba(255,255,255,0.025))", border: `1px solid ${BORDER_SOFT}` }}
      >
        <div>
          <div style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Studio Profile</div>
          <h2 style={{ fontSize: "1.45rem", fontWeight: 900, color: TEXT, lineHeight: 1.15, marginTop: "4px" }}>Brand identity and account details</h2>
          <p style={{ fontSize: "0.82rem", color: MUTED, marginTop: "6px" }}>This profile powers guest QR links, gallery branding, and event ownership.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black" style={{ background: verificationBg, color: verificationColor, border: `1px solid ${isBrandVerified ? "rgba(34,197,94,0.22)" : verificationStatus === "Rejected" ? "rgba(239,68,68,0.22)" : BORDER}` }}>
            {isBrandVerified ? <ShieldCheck size={13} /> : <Clock size={13} />}
            {verificationStatus}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black" style={{ background: "rgba(255,255,255,0.04)", color: TEXT, border: `1px solid ${BORDER_SOFT}` }}>
            {profileCompletion}% Complete
          </span>
        </div>
      </div>
      {error && (
        <div className="p-3.5 rounded-xl text-xs mb-2 text-center w-full" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}
      <div className="rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, rgba(201,151,58,0.16), rgba(19,22,29,0.98) 48%, rgba(7,9,13,0.98))", border: `1px solid ${BORDER}`, boxShadow: "0 24px 70px rgba(0,0,0,0.28)" }}>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(243,210,122,0.65), transparent)" }} />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden" style={{ border: `1px solid rgba(201,151,58,0.45)`, boxShadow: "0 14px 32px rgba(201,151,58,0.10)" }}>
                {avatarUrl ? (
                  <img src={getAssetUrl(avatarUrl)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(201,151,58,0.08)", color: GOLD }}>
                    <Camera size={20} />
                  </div>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarLoading || !currentUser}
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-60"
                style={{ background: GOLD, color: BG, border: "2px solid #07090d" }}
              >
                {avatarLoading ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={12} />}
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="truncate" style={{ fontWeight: 900, fontSize: "1.35rem", color: TEXT, lineHeight: 1.15 }}>{brandName || name || "Studio"}</h3>
                {isBrandVerified && <ShieldCheck size={18} style={{ color: GREEN }} />}
              </div>
              <div className="mt-1 truncate" style={{ color: MUTED, fontSize: "0.82rem" }}>{email}</div>
              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span style={{ fontSize: "0.72rem", color: GOLD, background: "rgba(201,151,58,0.15)", padding: "5px 12px", borderRadius: "9999px", fontWeight: 800 }}>
                  {currentUser?.role || "Photographer"}
                </span>
                <span style={{ fontSize: "0.72rem", color: verificationColor, background: verificationBg, padding: "5px 12px", borderRadius: "9999px", fontWeight: 800 }}>
                  {verificationStatus}
                </span>
              </div>
              <div className="mt-4 max-w-xl" style={{ color: MUTED, fontSize: "0.78rem", lineHeight: 1.55 }}>
                {bio || "Add a short studio bio so guests and clients understand your style and services."}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[310px]">
            {[
              { label: "Events", value: String(events.length || currentUser?.events_count || 0), color: BLUE },
              { label: "Photos", value: totalPhotos.toLocaleString("en-IN"), color: GOLD },
              { label: "Guests", value: totalGuests.toLocaleString("en-IN"), color: GREEN },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${BORDER_SOFT}` }}>
                <div style={{ color: item.color, fontSize: "1.05rem", fontWeight: 900, lineHeight: 1 }}>{item.value}</div>
                <div className="mt-1 truncate" style={{ color: MUTED, fontSize: "0.68rem", fontWeight: 700 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 sm:px-6 pb-5">
          <div className="rounded-2xl p-3" style={{ background: "rgba(7,9,13,0.34)", border: `1px solid ${BORDER_SOFT}` }}>
            <div className="flex items-center justify-between text-xs font-black">
              <span style={{ color: TEXT }}>Profile Completion</span>
              <span style={{ color: GOLD }}>{profileCompletion}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: `${profileCompletion}%`, background: `linear-gradient(90deg, ${GOLD}, #f3d27a)` }} />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[0.92fr_1.08fr] gap-5 w-full items-start">
      <CardBox className="flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div style={{ color: TEXT, fontWeight: 900, fontSize: "1rem" }}>Brand Identity</div>
            <div style={{ color: MUTED, fontSize: "0.76rem", marginTop: "3px", lineHeight: 1.5 }}>Logo, name, and verification rules for every guest-facing screen.</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-black shrink-0" style={{ background: verificationBg, color: verificationColor, border: `1px solid ${isBrandVerified ? "rgba(34,197,94,0.22)" : verificationStatus === "Rejected" ? "rgba(239,68,68,0.22)" : BORDER}` }}>
            {isBrandVerified ? <ShieldCheck size={12} /> : <Clock size={12} />}
            {isBrandVerified ? "Locked" : "Review"}
          </span>
        </div>
        <div className="rounded-2xl p-3" style={{ background: isBrandVerified ? "rgba(34,197,94,0.08)" : "rgba(201,151,58,0.08)", border: `1px solid ${isBrandVerified ? "rgba(34,197,94,0.22)" : BORDER}` }}>
          <div className="flex items-start gap-3">
            <Shield size={18} style={{ color: isBrandVerified ? GREEN : GOLD, marginTop: "2px" }} />
            <div>
              <div style={{ color: TEXT, fontWeight: 900, fontSize: "0.86rem" }}>
                {isBrandVerified ? "Verified Brand Identity Locked" : "Pending Brand Verification"}
              </div>
              <div style={{ color: MUTED, fontSize: "0.74rem", lineHeight: 1.5, marginTop: "4px" }}>
                {isBrandVerified
                  ? "Studio name, brand logo, and registered mobile number cannot be edited directly. Events will use this verified identity automatically."
                  : "Super Admin verification ke baad Studio Name, Logo, aur Mobile Number lock ho jayenge."}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER_SOFT}` }}>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center px-1.5 shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, boxShadow: "0 10px 24px rgba(201,151,58,0.08)" }}>
              {brandLogoUrl ? (
                <img src={getAssetUrl(brandLogoUrl)} alt="Brand logo" className="w-full h-full object-cover" />
              ) : (
                <span style={{ color: GOLD, fontWeight: 900, fontSize: "1.05rem" }}>{(brandName || name || "B").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 900, color: TEXT, fontSize: "1rem" }}>Verified Brand Assets</div>
              <div style={{ color: MUTED, fontSize: "0.78rem", marginTop: "3px", lineHeight: 1.5 }}>
                Guest navbar, verification flow aur photo finder me ye logo/name dikhega.
              </div>
            </div>
          </div>
          <input
            ref={brandLogoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleBrandLogoSelect}
            className="hidden"
          />
          <OutlineBtn onClick={() => !isBrandVerified && brandLogoInputRef.current?.click()} disabled={isBrandVerified}>
            {isBrandVerified ? <Lock size={13} /> : <Upload size={13} />} {isBrandVerified ? "Logo Locked" : brandLogoLoading ? "Uploading..." : "Upload Logo"}
          </OutlineBtn>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 700 }}>Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              disabled={isBrandVerified}
              placeholder="e.g. Akash Wedding Films"
              className="w-full px-4 py-3 rounded-xl outline-none"
              style={{ background: isBrandVerified ? "rgba(255,255,255,0.035)" : "#1c2030", border: `1px solid ${BORDER}`, color: isBrandVerified ? MUTED : TEXT, fontSize: "0.86rem", cursor: isBrandVerified ? "not-allowed" : "text" }}
            />
          </div>
          {!isBrandVerified && (
            <GoldBtn onClick={saveProfileDetails}>
              <Check size={14} /> {loading ? "Saving..." : "Save Brand"}
            </GoldBtn>
          )}
        </div>

        {isBrandVerified && (
          <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}` }}>
            <div style={{ color: TEXT, fontWeight: 900, fontSize: "0.84rem" }}>Change Brand Request</div>
            <div style={{ color: MUTED, fontSize: "0.72rem", lineHeight: 1.5, marginTop: "4px" }}>
              Brand change Super Admin review ke baad hi apply hoga.
            </div>
            {hasBrandChangeRequest ? (
              <div className="mt-3 rounded-xl p-3 text-xs font-bold" style={{ background: "rgba(201,151,58,0.1)", border: `1px solid ${BORDER}`, color: GOLD }}>
                Brand change request pending review.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <input
                  type="text"
                  value={requestedBrandName}
                  onChange={(e) => setRequestedBrandName(e.target.value)}
                  placeholder="Requested new studio/brand name"
                  className="w-full px-3 py-2.5 rounded-xl outline-none"
                  style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}
                />
                <textarea
                  value={brandChangeReason}
                  onChange={(e) => setBrandChangeReason(e.target.value)}
                  placeholder="Reason for brand change"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl outline-none resize-none"
                  style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}
                />
                <OutlineBtn onClick={submitBrandChangeRequest}>
                  <Send size={13} /> Submit Request
                </OutlineBtn>
              </div>
            )}
          </div>
        )}
      </CardBox>
      <CardBox className="flex flex-col items-center h-full">
        <form onSubmit={handleSave} className="flex flex-col gap-4 w-full max-w-none">
          <div className="flex items-start justify-between gap-3 w-full">
            <div>
              <div className="text-left w-full font-black text-[1rem]" style={{ color: TEXT }}>Personal Information</div>
              <div style={{ color: MUTED, fontSize: "0.76rem", marginTop: "3px", lineHeight: 1.5 }}>Account contact details and guest page links.</div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-black" style={{ background: "rgba(255,255,255,0.04)", color: MUTED, border: `1px solid ${BORDER_SOFT}` }}>
              <UserCheck size={12} /> Account
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <InputRow icon={User}  label="Full Name"       value={name}    onChange={setName} />
            <InputRow icon={Mail}  label="Email Address"   value={email}   onChange={setEmail}   type="email" />
            <InputRow icon={Phone} label="Phone Number"    value={phone}   onChange={setPhone} disabled={isBrandVerified} />
            <InputRow icon={MapPin}label="City / Location" value={city}    onChange={setCity} />
            <InputRow icon={Globe} label="Website URL"     value={brandWebsiteUrl} onChange={setBrandWebsiteUrl} />
          </div>
          <div className="flex flex-col gap-1.5 mt-2 items-start w-full">
            <label style={{ fontSize: "0.8rem", color: TEXT, fontWeight: 500 }}>Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-xl outline-none resize-none text-left transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(201,151,58,0.08)]"
              style={{ background: "rgba(28,32,48,0.92)", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
          </div>

          <div className="pt-3 mt-2 text-left w-full" style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
            <div className="font-bold text-[0.9rem] mb-3" style={{ color: TEXT }}>Guest Page Controls</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <InputRow icon={FileText} label="Footer Rights Text" value={rightsText} onChange={setRightsText} />
              <InputRow icon={Phone} label="WhatsApp URL" value={whatsappUrl} onChange={setWhatsappUrl} />
              <InputRow icon={Send} label="Instagram URL" value={instagramUrl} onChange={setInstagramUrl} />
              <InputRow icon={Users} label="Facebook URL" value={facebookUrl} onChange={setFacebookUrl} />
            </div>
          </div>

          {saved && (
            <div className="p-2.5 rounded-lg text-xs text-center w-full" style={{ background: "rgba(34,197,94,0.15)", color: GREEN }}>
              Profile updated successfully!
            </div>
          )}

          <div className="flex justify-end mt-2">
            <GoldBtn>{loading ? "Saving..." : <><Check size={14} /> Save Changes</>}</GoldBtn>
          </div>
        </form>
      </CardBox>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        {[
          { label: "Events Created",  value: String(events.length || currentUser?.events_count || 0), color: BLUE },
          { label: "Photos Uploaded", value: totalPhotos.toLocaleString("en-IN"), color: GOLD },
          { label: "Guests Served",   value: totalGuests.toLocaleString("en-IN"), color: GREEN },
          { label: "Revenue Earned",  value: `Rs ${totalRevenue.toLocaleString("en-IN")}`, color: PURPLE },
        ].map(({ label, value, color }) => (
          <CardBox key={label} style={{ padding: "16px", textAlign: "center" }} className="flex flex-col items-center justify-center">
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: "4px" }}>{label}</div>
          </CardBox>
        ))}
      </div>
    </div>
  );
}

// â”€â”€ PAGE 11 - SUPPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StudioSetupPage({
  currentUser,
  onUpdate,
  onLogout,
}: {
  currentUser: UserData | null;
  onUpdate: (updated: UserData) => void;
  onLogout: () => void;
}) {
  const [studioName, setStudioName] = useState(currentUser?.brand_name || currentUser?.name || "");
  const [mobile, setMobile] = useState(currentUser?.phone || "");
  const [address, setAddress] = useState(currentUser?.address || "");
  const [instagramUrl, setInstagramUrl] = useState(currentUser?.instagram_url || "");
  const [websiteUrl, setWebsiteUrl] = useState(currentUser?.website_url || "");
  const [aboutStudio, setAboutStudio] = useState(currentUser?.about_studio || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(currentUser?.brand_logo_url ? getAssetUrl(currentUser.brand_logo_url) : "");
  
  // First login security states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const setupLogoRef = useRef<HTMLInputElement>(null);

  // Multi-step onboarding states
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!currentUser) return;
    setStudioName(currentUser.brand_name || currentUser.name || "");
    setMobile(currentUser.phone || "");
    setAddress(currentUser.address || "");
    setInstagramUrl(currentUser.instagram_url || "");
    setWebsiteUrl(currentUser.website_url || "");
    setAboutStudio(currentUser.about_studio || "");
    setLogoPreview(currentUser.brand_logo_url ? getAssetUrl(currentUser.brand_logo_url) : "");
  }, [currentUser]);

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleNextStep = (targetStep: number) => {
    setError("");
    if (step === 1) {
      if (!newPassword || newPassword.length < 6) {
        setError("Naya password kam se kam 6 character ka hona chahiye.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Naya password aur confirm password match nahi kar rahe hain.");
        return;
      }
      if (!termsAccepted) {
        setError("MasterStudio onboarding terms accept karna mandatory hai.");
        return;
      }
    }
    if (step === 2) {
      if (!studioName.trim()) {
        setError("Studio / Brand Name mandatory hai.");
        return;
      }
      if (mobile.replace(/\D/g, "").length < 10) {
        setError("Kam se kam 10 digit ka mobile number required hai.");
        return;
      }
    }
    setStep(targetStep);
  };

  const handleSetupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    
    // Final validations
    if (!newPassword || newPassword.length < 6) {
      setError("Naya password kam se kam 6 character ka hona chahiye.");
      setStep(1);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Naya password aur confirm password match nahi kar rahe hain.");
      setStep(1);
      return;
    }
    if (!termsAccepted) {
      setError("MasterStudio onboarding terms accept karna mandatory hai.");
      setStep(1);
      return;
    }
    if (!studioName.trim() || mobile.replace(/\D/g, "").length < 10) {
      setError("Studio name aur 10 digit mobile number required hai.");
      setStep(2);
      return;
    }
    if (!logoFile && !currentUser.brand_logo_url) {
      setError("Brand logo upload karna mandatory hai.");
      setStep(3);
      return;
    }

    setLoading(true);
    setError("");
    try {
      let updated = currentUser;
      if (logoFile) {
        updated = await api.uploadBrandLogo(currentUser.id, logoFile);
      }

      // Update password/profile after logo upload, then unlock dashboard.
      updated = await api.updateUser(
        currentUser.id,
        currentUser.name || studioName.trim(),
        currentUser.email,
        mobile.trim(),
        currentUser.plan,
        currentUser.status,
        {
          brand_name: studioName.trim(),
          address: address.trim(),
          instagram_url: instagramUrl.trim(),
          website_url: websiteUrl.trim(),
          about_studio: aboutStudio.trim(),
          brand_rights_text: currentUser.brand_rights_text || `(c) ${new Date().getFullYear()} ${studioName.trim()}. All Rights Reserved.`,
          facebook_url: currentUser.facebook_url || "",
          whatsapp_url: currentUser.whatsapp_url || "",
          password: newPassword,
          temp_password: "",
          must_change_password: false,
          first_login_done: true,
          verification_status: "Verified" // verified and locked!
        }
      );

      onUpdate(updated);
      setSaved(true);
    } catch (err: any) {
      setError(err.message || "Studio setup save nahi ho paya.");
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    { number: 1, label: "Account Security", icon: Lock },
    { number: 2, label: "Studio Profile", icon: Home },
    { number: 3, label: "Brand Identity", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen w-full overflow-y-auto px-4 py-6 sm:px-6" style={{ background: BG, color: TEXT, fontFamily: "'Poppins', sans-serif" }}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <img src={logoImg} alt="MasterStudio" className="h-12 w-auto object-contain" />
          <button onClick={onLogout} className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", color: RED }}>
            Logout
          </button>
        </div>

        {/* Welcome Intro Box */}
        <div className="rounded-3xl p-5 sm:p-6" style={{ background: "linear-gradient(135deg, rgba(201,151,58,0.14), rgba(19,22,29,0.96))", border: `1px solid ${BORDER}` }}>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black" style={{ background: "rgba(201,151,58,0.13)", color: GOLD, border: `1px solid ${BORDER}` }}>
            <ShieldCheck size={14} />
            First Login Onboarding Experience
          </div>
          <h1 className="mt-4 text-2xl font-black sm:text-3xl">Setup Your Brand & Credentials</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: MUTED }}>
            Welcome to MasterStudio! Congratulations on being approved by Super Admin. Please complete the quick security verification and brand details below to unlock your dashboard. Upar di gayi brand details save hone par security audit ke liye automatic lock ho jayengi.
          </p>
        </div>

        {/* Wizard Progress Bar */}
        <div className="relative flex items-center justify-between w-full max-w-xl mx-auto py-4 px-2">
          {/* Progress bar background line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 z-0" style={{ background: "rgba(255,255,255,0.08)" }} />
          {/* Active progress color line */}
          <div 
            className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 z-0 transition-all duration-300 ease-out" 
            style={{ 
              background: GOLD, 
              width: `${step === 1 ? "0%" : step === 2 ? "50%" : "100%"}`,
              left: "24px",
              right: "24px"
            }} 
          />

          {stepsList.map((s) => {
            const StepIcon = s.icon;
            const isCompleted = step > s.number;
            const isActive = step === s.number;
            return (
              <div key={s.number} className="flex flex-col items-center z-10 relative">
                <button
                  type="button"
                  onClick={() => {
                    if (s.number < step) {
                      setStep(s.number);
                    } else if (s.number > step) {
                      handleNextStep(s.number);
                    }
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-bold"
                  style={{
                    background: isCompleted ? GREEN : isActive ? GOLD : "#1c2030",
                    color: isActive ? "#0a0c10" : TEXT,
                    border: `1px solid ${isActive ? GOLD : isCompleted ? GREEN : BORDER}`,
                    boxShadow: isActive ? `0 0 16px ${GOLD}60` : "none",
                    cursor: s.number <= step ? "pointer" : "not-allowed"
                  }}
                >
                  {isCompleted ? <Check size={16} /> : <StepIcon size={16} />}
                </button>
                <span className="mt-2 text-[0.72rem] font-bold tracking-wide" style={{ color: isActive ? GOLD : isCompleted ? GREEN : MUTED }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Wizard Form Wrapper */}
        <form onSubmit={handleSetupSubmit} className="w-full">
          {error && (
            <div className="mb-4 rounded-xl px-4 py-3 text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", color: RED }}>
              {error}
            </div>
          )}

          {/* STEP 1: SECURITY SETUP */}
          {step === 1 && (
            <CardBox className="flex flex-col gap-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
                <Lock size={18} style={{ color: GOLD }} />
                <span className="font-extrabold text-sm text-[#f0ede6]">Mandatory Password Setup</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                Super Admin has created your account with a single-use Temporary Password. For safety reasons, you must change it immediately to your custom permanent password.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1.5 relative">
                  <label style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 800 }}>New Password</label>
                  <input 
                    type={showPass ? "text" : "password"} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Enter at least 6 characters" 
                    className="w-full rounded-xl px-4 py-3 outline-none" 
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.86rem" }} 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5 relative">
                  <label style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 800 }}>Confirm New Password</label>
                  <input 
                    type={showPass ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Re-type password" 
                    className="w-full rounded-xl px-4 py-3 outline-none" 
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.86rem" }} 
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-10 text-xs font-bold" style={{ color: GOLD }}>
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={termsAccepted} 
                  onChange={(e) => setTermsAccepted(e.target.checked)} 
                  className="mt-1 h-4 w-4" 
                  style={{ accentColor: GOLD }} 
                />
                <label htmlFor="terms" className="text-xs leading-relaxed cursor-pointer select-none" style={{ color: MUTED }}>
                  I verify that the profile details provided represent my official business identity. I accept MasterStudio's terms of service, security compliance checklist, and automated photo delivery guidelines.
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => handleNextStep(2)} 
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition-all hover:brightness-110" 
                  style={{ background: GOLD, color: BG }}
                >
                  Next: Studio Profile <ChevronRight size={15} />
                </button>
              </div>
            </CardBox>
          )}

          {/* STEP 2: STUDIO PROFILE */}
          {step === 2 && (
            <CardBox className="flex flex-col gap-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
                <Home size={18} style={{ color: GOLD }} />
                <span className="font-extrabold text-sm text-[#f0ede6]">Studio & Contact Configuration</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                Enter your studio or business credentials. These details are used to brand guest login banners, invoice receipts, and digital portfolios.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 800 }}>Studio / Brand Name <span style={{ color: RED }}>*</span></label>
                  <input 
                    value={studioName} 
                    onChange={(e) => setStudioName(e.target.value)} 
                    placeholder="e.g. Your Studio Name" 
                    className="w-full rounded-xl px-4 py-3 outline-none" 
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.86rem" }} 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 800 }}>Registered Mobile Number <span style={{ color: RED }}>*</span></label>
                  <input 
                    value={mobile} 
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d+]/g, "").slice(0, 14))} 
                    placeholder="e.g. +919999988888" 
                    className="w-full rounded-xl px-4 py-3 outline-none" 
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.86rem" }} 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 800 }}>City / Address</label>
                  <input 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="e.g. Mumbai, Maharashtra" 
                    className="w-full rounded-xl px-4 py-3 outline-none" 
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.86rem" }} 
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2 mt-4 pt-2" style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
                <OutlineBtn type="button" onClick={() => setStep(1)}>Back</OutlineBtn>
                <button 
                  type="button" 
                  onClick={() => handleNextStep(3)} 
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition-all hover:brightness-110" 
                  style={{ background: GOLD, color: BG }}
                >
                  Next: Brand Identity <ChevronRight size={15} />
                </button>
              </div>
            </CardBox>
          )}

          {/* STEP 3: BRAND IDENTITY & LOGO */}
          {step === 3 && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.85fr_1.15fr] max-w-4xl mx-auto">
              <CardBox className="flex flex-col items-center gap-4 text-center justify-center">
                <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl relative" style={{ background: "rgba(255,255,255,0.04)", border: `2px solid ${GOLD}` }}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Brand logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={42} style={{ color: GOLD }} />
                  )}
                </div>
                <input ref={setupLogoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoSelect} className="hidden" />
                <OutlineBtn type="button" onClick={() => setupLogoRef.current?.click()}>
                  <Upload size={14} /> Upload Brand Logo <span style={{ color: RED }}>*</span>
                </OutlineBtn>
                <div className="rounded-2xl p-3.5 text-xs leading-relaxed" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_SOFT}`, color: MUTED }}>
                  Logo upload is mandatory. Transparent PNG logos look premium and are overlayed on guest app galleries.
                </div>
              </CardBox>

              <CardBox className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
                  <Sparkles size={18} style={{ color: GOLD }} />
                <span className="font-extrabold text-sm text-[#f0ede6]">Social Branding Assets</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 800 }}>Instagram Profile Link</label>
                    <input 
                      value={instagramUrl} 
                      onChange={(e) => setInstagramUrl(e.target.value)} 
                      placeholder="https://instagram.com/studio" 
                      className="w-full rounded-xl px-4 py-3 outline-none" 
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.86rem" }} 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 800 }}>Official Website</label>
                    <input 
                      value={websiteUrl} 
                      onChange={(e) => setWebsiteUrl(e.target.value)} 
                      placeholder="https://mystudio.in" 
                      className="w-full rounded-xl px-4 py-3 outline-none" 
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.86rem" }} 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 800 }}>Studio Introduction</label>
                    <textarea 
                      value={aboutStudio} 
                      onChange={(e) => setAboutStudio(e.target.value)} 
                      rows={3} 
                      placeholder="Write a brief intro that guests will see in your gallery info section..." 
                      className="w-full resize-none rounded-xl px-4 py-3 outline-none" 
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.86rem" }} 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl p-3 text-[0.72rem] leading-relaxed mt-2" style={{ background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.22)", color: GOLD }}>
                  <ShieldCheck size={16} className="shrink-0" />
                  <span>
                    <strong>Verification Locking Policy:</strong> Once verified, your logo and studio details are locked to prevent spoofing. Changes will require admin approval.
                  </span>
                </div>

                {saved && (
                  <div className="rounded-xl px-4 py-3 text-xs font-bold" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.22)", color: GREEN }}>
                    Brand setup verified successfully. Verification locked. Redirecting to your dashboard...
                  </div>
                )}

                <div className="flex justify-between gap-2 mt-4 pt-2" style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
                  <OutlineBtn type="button" onClick={() => setStep(2)}>Back</OutlineBtn>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold disabled:opacity-60 transition-all hover:brightness-110 cursor-pointer" 
                    style={{ background: GOLD, color: BG }}
                  >
                    {loading ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                    {loading ? "Completing setup..." : "Complete Setup & Verify Account"}
                  </button>
                </div>
              </CardBox>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}



function SupportPage() {
  const faqs = [
    { q: "How does AI face recognition search work?", a: "Guests scan the event QR code, upload a selfie, and our AI scans all event photos to find and show their matching pictures in seconds.", cat: "AI Search" },
    { q: "How secure is the face recognition data?", a: "We prioritize user privacy. Selfie uploads are processed temporarily in memory to match faces and are never stored or shared with third parties.", cat: "AI Search" },
    { q: "How do I create a new event and upload photos?", a: "Go to the 'Events' tab and click 'Create New Event'. Once created, go to the 'Upload Photos' tab, select your event, and drag-and-drop your images.", cat: "Events" },
    { q: "Can I customize the watermark on guest downloads?", a: "Yes, you can enable/disable watermarks in the 'Settings' tab. Custom watermarks can be uploaded in the branding section.", cat: "Events" },
    { q: "Is there a limit on photos or storage?", a: "The Professional Plan includes 100 GB storage. You can upgrade to a higher tier anytime from settings if you need more space.", cat: "Billing" },
    { q: "How do I download guest details or lead data?", a: "Go to the 'Users & Guests' tab to view and download all guests who registered, scanned selfies, or downloaded photos from your events.", cat: "Billing" }
  ];

  interface Ticket {
    id: string;
    subject: string;
    msg: string;
    date: string;
    status: "Open" | "In Progress" | "Resolved";
  }

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqCategory, setFaqCategory] = useState("All");
  const [subject, setSubject] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([
    { id: "T-4820", subject: "Brand logo transparent PNG issue", msg: "I tried uploading my studio logo as a PNG, but the background shows as black. Can you help?", date: "16 Jun 2026", status: "Resolved" },
    { id: "T-4791", subject: "Premium Plan billing query", msg: "I wanted to know if I can pay annually via UPI in India.", date: "12 Jun 2026", status: "Resolved" }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !msg) return;
    
    // Create new ticket item
    const newTicket: Ticket = {
      id: `T-${Math.floor(1000 + Math.random() * 9000)}`,
      subject,
      msg,
      date: new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }),
      status: "Open"
    };

    setTickets(prev => [newTicket, ...prev]);
    setSent(true);
    setSubject("");
    setMsg("");
    setTimeout(() => setSent(false), 4000);
  };

  const filteredFaqs = faqs.filter(faq => faqCategory === "All" || faq.cat === faqCategory);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full items-stretch py-2">
      <SectionHeader title="Help & Support" sub="Get answers to FAQs or contact our support team" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Call Support Card */}
        <a 
          href="tel:+918298033887" 
          className="group block rounded-2xl p-5 text-center flex flex-col items-center gap-3 transition-all duration-300 hover:scale-[1.02] border"
          style={{ 
            background: 'rgba(255,255,255,0.01)', 
            borderColor: BORDER_SOFT,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = GOLD}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = BORDER_SOFT}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: "rgba(34,197,94,0.12)" }}>
            <Phone size={18} style={{ color: GREEN }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: TEXT }}>Call Support</div>
            <div style={{ fontSize: "0.78rem", color: TEXT, marginTop: "2px", fontWeight: 500 }} className="group-hover:text-[#dfb76c] transition-colors">+91 82980 33887 / +91 82710 46511</div>
            <div style={{ fontSize: "0.68rem", color: MUTED, marginTop: "4px" }}>Mon - Sat, 9 AM - 6 PM</div>
          </div>
          <span className="text-[0.62rem] font-semibold px-2.5 py-0.5 rounded-full mt-1 bg-green-500/10 text-green-400 group-hover:bg-green-500/20 transition-all">Call Now</span>
        </a>

        {/* Email Support Card */}
        <a 
          href="mailto:akashkr0196@gmail.com" 
          className="group block rounded-2xl p-5 text-center flex flex-col items-center gap-3 transition-all duration-300 hover:scale-[1.02] border"
          style={{ 
            background: 'rgba(255,255,255,0.01)', 
            borderColor: BORDER_SOFT,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = GOLD}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = BORDER_SOFT}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: "rgba(59,130,246,0.12)" }}>
            <Mail size={18} style={{ color: BLUE }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: TEXT }}>Email Support</div>
            <div style={{ fontSize: "0.78rem", color: TEXT, marginTop: "2px", fontWeight: 500 }} className="group-hover:text-[#dfb76c] transition-colors">akashkr0196@gmail.com</div>
            <div style={{ fontSize: "0.68rem", color: MUTED, marginTop: "4px" }}>Response within 2 hours</div>
          </div>
          <span className="text-[0.62rem] font-semibold px-2.5 py-0.5 rounded-full mt-1 bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-all">Email Now</span>
        </a>

        {/* WhatsApp Support Card */}
        <a 
          href="https://wa.me/918298033887?text=Hi%20MasterStudio%20Support!%20I%20need%20help%20with%20my%20photographer%20account." 
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-2xl p-5 text-center flex flex-col items-center gap-3 transition-all duration-300 hover:scale-[1.02] border"
          style={{ 
            background: 'rgba(255,255,255,0.01)', 
            borderColor: BORDER_SOFT,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = GOLD}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = BORDER_SOFT}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: "rgba(34,197,94,0.15)" }}>
            <MessageSquare size={18} style={{ color: '#25d366' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: TEXT }}>WhatsApp Support</div>
            <div style={{ fontSize: "0.78rem", color: TEXT, marginTop: "2px", fontWeight: 500 }} className="group-hover:text-[#dfb76c] transition-colors">Chat in Hinglish/English</div>
            <div style={{ fontSize: "0.68rem", color: '#25d366', marginTop: "4px", fontWeight: 500 }} className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse" /> Agents Online
            </div>
          </div>
          <span className="text-[0.62rem] font-semibold px-2.5 py-0.5 rounded-full mt-1 bg-[#25d366]/10 text-[#25d366] group-hover:bg-[#25d366]/20 transition-all">Chat Now</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-2">
        {/* FAQs */}
        <div className="lg:col-span-3 flex flex-col gap-3.5">
          <div className="flex flex-col gap-2">
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: TEXT }}>Frequently Asked Questions</div>
            <div style={{ fontSize: "0.72rem", color: MUTED }}>Click on a question to reveal the details</div>
          </div>

          {/* FAQ Category Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#1c2030] border border-white/5 w-full">
            {["All", "AI Search", "Events", "Billing"].map(cat => {
              const isActive = faqCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => { setFaqCategory(cat); setOpenFaq(null); }}
                  className="px-3 py-1.5 rounded-lg text-[0.7rem] font-semibold transition-all"
                  style={{
                    background: isActive ? GOLD : "transparent",
                    color: isActive ? "#000" : MUTED
                  }}
                >
                  {cat === "All" ? "All FAQs" : cat}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredFaqs.map((faq) => {
              const originalIdx = faqs.findIndex(f => f.q === faq.q);
              return (
                <CardBox key={faq.q} style={{ padding: "14px 18px", background: "rgba(255,255,255,0.015)" }} className="transition-all duration-200">
                  <button className="w-full flex items-center justify-between text-left" onClick={() => setOpenFaq(openFaq === originalIdx ? null : originalIdx)}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT }}>{faq.q}</span>
                    <ChevronDown size={14} style={{ color: MUTED, transform: openFaq === originalIdx ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                  </button>
                  {openFaq === originalIdx && (
                    <div style={{ fontSize: "0.8rem", color: "rgba(240, 237, 230, 0.82)", marginTop: "10px", lineHeight: "1.48", borderTop: `1px solid ${BORDER_SOFT}`, paddingTop: "8px" }}>
                      {faq.a}
                    </div>
                  )}
                </CardBox>
              );
            })}
          </div>
        </div>

        {/* Ticket Form & History */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <CardBox className="w-full">
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: TEXT, marginBottom: "4px" }}>Submit a Ticket</div>
            <div style={{ fontSize: "0.72rem", color: MUTED, marginBottom: "12px" }}>Direct support response in 2-4 business hours</div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 500 }}>Subject</label>
                <input type="text" placeholder="e.g., Account upgrade issue" value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl outline-none"
                  style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 500 }}>Message</label>
                <textarea rows={4} placeholder="Describe your issue in detail (Hinglish ya English me)..." value={msg} onChange={(e) => setMsg(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl outline-none resize-none"
                  style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} required />
              </div>
              {sent && (
                <div className="p-2.5 rounded-lg text-xs" style={{ background: "rgba(34,197,94,0.12)", color: GREEN }}>
                  Ticket submitted successfully. Active tracker added to the list below.
                </div>
              )}
              <GoldBtn><Send size={13} /> Send Ticket</GoldBtn>
            </form>
          </CardBox>

          {/* Ticket History */}
          <CardBox className="w-full flex flex-col gap-3">
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: TEXT }}>Support Ticket History</div>
            <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-3.5 rounded-xl border flex flex-col gap-2 text-left" 
                  style={{ 
                    background: "rgba(255,255,255,0.005)",
                    borderColor: BORDER_SOFT 
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span style={{ fontSize: "0.76rem", color: GOLD, fontWeight: 600 }}>{ticket.id}</span>
                    <span className="px-2 py-0.5 rounded text-[0.68rem] font-semibold"
                      style={{
                        background: ticket.status === "Open" ? "rgba(201,151,58,0.15)" : "rgba(34,197,94,0.15)",
                        color: ticket.status === "Open" ? GOLD : GREEN
                      }}
                    >
                      {ticket.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: TEXT }}>{ticket.subject}</div>
                  <div style={{ fontSize: "0.78rem", color: "rgba(240, 237, 230, 0.8)", lineHeight: 1.45 }}>{ticket.msg}</div>
                  <div style={{ fontSize: "0.68rem", color: MUTED, alignSelf: "flex-end", marginTop: "2px" }}>Submitted: {ticket.date}</div>
                </div>
              ))}
            </div>
          </CardBox>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ USER PORTAL SUB-COMPONENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface UserMyPhotosProps {
  selectedEventFilter: string;
  setSelectedEventFilter: (ev: string) => void;
  userEmail: string;
  userName: string;
  onBrandChange?: (brand: GuestBrand) => void;
  onAccessVerified?: (name: string, mobile: string) => void;
}

type GuestBrand = {
  logoUrl?: string;
  brandName?: string;
  photographerName?: string;
  rightsText?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  websiteUrl?: string;
  whatsappUrl?: string;
};

const SELFIE_CAPTURE_MESSAGES = [
  "Perfect Shot! Your selfie has been captured.",
  "Awesome! Your smile is saved successfully.",
  "Great! Looking amazing.",
];

const FORM_SUBMIT_MESSAGES = [
  "Thank you! Your details have been submitted.",
  "Success! We are preparing your memories.",
  "Your journey with MasterStudio has started.",
];

const PHOTO_SEARCH_MESSAGES = [
  "AI is finding your best moments...",
  "Scanning thousands of memories for you...",
  "Sit back, your photos are coming.",
];

const PHOTO_FOUND_MESSAGES = [
  "We found your memories!",
  "Your special moments are ready.",
  "Smile! Your photos are waiting.",
];

const PHOTO_NOT_FOUND_MESSAGES = [
  "No photos found yet. Please try another selfie.",
  "Don't worry, try clicking a clearer selfie.",
];

const pickMessage = (messages: string[]) => messages[Math.floor(Math.random() * messages.length)];

const BrandMark = ({ logoUrl, name, size = "md" }: { logoUrl?: string; name?: string; size?: "xs" | "sm" | "md" | "lg" }) => {
  const outerClasses = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-11 w-11" : size === "xs" ? "h-8 w-8" : "h-14 w-14 sm:h-16 sm:w-16";
  const initialSize = size === "lg" ? "1.3rem" : size === "sm" ? "0.9rem" : size === "xs" ? "0.62rem" : "1.1rem";
  const glowSize = size === "xs" ? "0 0 8px rgba(201,151,58,0.4)" : size === "sm" ? "0 0 18px rgba(201,151,58,0.55), 0 0 40px rgba(201,151,58,0.18)" : "0 0 24px rgba(201,151,58,0.65), 0 0 60px rgba(201,151,58,0.22), 0 8px 32px rgba(0,0,0,0.45)";

  return (
    <div
      className={`${outerClasses} rounded-full shrink-0 relative`}
      style={{
        padding: "2.5px",
        background: "conic-gradient(from 180deg at 50% 50%, #ffd700 0deg, #c9973a 90deg, #7d5512 180deg, #c9973a 270deg, #ffd700 360deg)",
        boxShadow: glowSize,
      }}
    >
      {/* Shimmer ring pulse */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "transparent",
          boxShadow: "0 0 0 0 rgba(201,151,58,0.5)",
          animation: "brandPulse 2.8s ease-out infinite",
        }}
      />
      <div
        className="h-full w-full rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: "radial-gradient(circle at 35% 35%, #1a1508 0%, #07090d 100%)",
          border: "1.5px solid rgba(255,255,255,0.12)",
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt={name || "Photographer brand"} className="h-full w-full object-cover" />
        ) : (
          <span
            style={{
              background: "linear-gradient(135deg, #ffd700 0%, #c9973a 60%, #fff8e1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: initialSize,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {(name || "B").slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
};

function UserMyPhotos({ 
  selectedEventFilter, 
  setSelectedEventFilter, 
  userEmail, 
  userName, 
  onBrandChange, 
  onAccessVerified,
  selfie,
  setSelfie,
  selfieFile,
  setSelfieFile
}: UserMyPhotosProps) {
  const [step, setStep] = useState<"landing" | "verify" | "upload" | "searching" | "results">("verify");
  const [resultsFilter, setResultsFilter] = useState<"best" | "all" | "latest">("best");
  const [matchedPhotos, setMatchedPhotos] = useState<MatchData[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [events, setEvents] = useState<EventData[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [guestMobile, setGuestMobile] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpVerifiedToken, setOtpVerifiedToken] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [accessVerifiedFlash, setAccessVerifiedFlash] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [resultHeadline, setResultHeadline] = useState("");
  const [resultSubtext, setResultSubtext] = useState("");
  const [searchMessage, setSearchMessage] = useState("Uploading your selfie...");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const autoCameraStartedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // â”€â”€ Animation states â”€â”€
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiMessage, setAiMessage] = useState("Scanning your selfie...");
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [loadedPhotos, setLoadedPhotos] = useState<Set<number>>(new Set());

  const maskedMobile = guestMobile.replace(/\D/g, "").replace(/^(\d{2})\d+(\d{4})$/, "$1****$2");

  const maxSimilarity = useMemo(() => {
    if (matchedPhotos.length === 0) return 0;
    return Math.max(...matchedPhotos.map(p => p.similarity));
  }, [matchedPhotos]);

  const displayPhotos = useMemo(() => {
    let list = [...matchedPhotos];
    if (resultsFilter === "best") {
      list.sort((a, b) => b.similarity - a.similarity);
    } else if (resultsFilter === "latest") {
      list.sort((a, b) => b.photo_id - a.photo_id);
    }
    return list;
  }, [matchedPhotos, resultsFilter]);

  const selectedPhotosList = useMemo(() => {
    return matchedPhotos.filter(p => selectedPhotoIds.has(p.photo_id));
  }, [matchedPhotos, selectedPhotoIds]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2600);
  };

  const playCameraClick = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.055);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Sound is a small enhancement; silently skip if the browser blocks it.
    }
  };

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventFromUrl = new URLSearchParams(window.location.search).get("event");
        const data = await api.fetchPublicEvents(eventFromUrl || undefined);
        setEvents(data);
        const urlEventExists = !!eventFromUrl && data.some((event) => event.id === eventFromUrl);

        if (urlEventExists) {
          setSelectedEventFilter(eventFromUrl);
        } else if (data.length > 0 && (!selectedEventFilter || selectedEventFilter === "All" || !data.some((event) => event.id === selectedEventFilter))) {
          setSelectedEventFilter(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load events:", err);
        setEvents([]);
      }
    };
    loadEvents();
  }, []);

  const selectedEvent = events.find((event) => event.id === selectedEventFilter) || events[0];
  const eventName = selectedEvent?.name || "No event selected";
  const eventDate = selectedEvent?.date || "";
  const eventPhotos = selectedEvent?.photos || "0";
  const coverPhoto = "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1400&h=760&fit=crop&auto=format";
  const photographerName = selectedEvent?.photographer_name || "MasterStudio Team";
  const brandName = selectedEvent?.photographer_brand_name || photographerName;
  const brandLogo = selectedEvent?.photographer_logo_url ? getAssetUrl(selectedEvent.photographer_logo_url) : "";

  useEffect(() => {
    onBrandChange?.({
      logoUrl: brandLogo,
      brandName,
      photographerName,
      rightsText: selectedEvent?.photographer_rights_text,
      instagramUrl: selectedEvent?.photographer_instagram_url,
      facebookUrl: selectedEvent?.photographer_facebook_url,
      websiteUrl: selectedEvent?.photographer_website_url,
      whatsappUrl: selectedEvent?.photographer_whatsapp_url,
    });
  }, [brandLogo, brandName, photographerName, selectedEvent?.id]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
  }, [cameraStream]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const startLiveCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraOpen(true);
      setCameraStream(stream);
    } catch (err) {
      console.error("Camera open failed:", err);
      setError("Camera permission required hai. Browser me camera allow karo aur phir try karo.");
    }
  };

  useEffect(() => {
    if (step !== "upload" || cameraOpen || cameraStream || autoCameraStartedRef.current) return;
    // Don't auto-start on mobile/tablet screens to avoid browser blocks outside direct user tap.
    if (window.innerWidth < 1024) return;
    autoCameraStartedRef.current = true;
    startLiveCamera();
  }, [step, cameraOpen, cameraStream]);

  const stopLiveCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraOpen(false);
  };

  const captureLiveSelfie = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setError("Camera ready nahi hai. Ek second wait karke retry karo.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setError("Selfie capture failed. Please try again.");
      return;
    }

    const file = new File([blob], `live-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
    setSelfie(URL.createObjectURL(blob));
    setSelfieFile(file);
    setMatchedPhotos([]);
    setError(null);
    playCameraClick();
    showToast(pickMessage(SELFIE_CAPTURE_MESSAGES));
    stopLiveCamera();
    startSearch(file);
  };

  const handleSendOtp = async () => {
    if (resendSeconds > 0) return;
    const cleanMobile = guestMobile.replace(/\D/g, "");
    if (!guestNameInput.trim()) {
      setError("Please enter guest name.");
      return;
    }
    if (cleanMobile.length < 10) {
      setError("Please enter a valid mobile number.");
      return;
    }
    if (!selectedEvent?.id) {
      setError("Valid event QR link required.");
      return;
    }

    try {
      const result = await api.sendOtp(selectedEvent.id, guestNameInput.trim(), guestMobile.trim());
      setOtpSent(true);
      setOtpInput("");
      setOtpVerifiedToken("");
      setDebugOtp(result.debug_otp || "");
      setError(null);
      setOtpMessage(result.debug_otp ? `Local test OTP: ${result.debug_otp}` : `OTP sent to ${guestMobile}.`);
      setResendSeconds(30);
      showToast(pickMessage(FORM_SUBMIT_MESSAGES));
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP send failed. Please try again.");
    }
  };

  // Animated step transition helper
  const goToStep = (next: "landing" | "verify" | "upload" | "searching" | "results") => {
    setIsTransitioning(true);
    window.setTimeout(() => {
      setStep(next);
      setIsTransitioning(false);
    }, 320);
  };

  const handleVerifyOtp = async () => {
    if (!otpSent) {
      setError("Please send OTP first.");
      return;
    }
    if (!selectedEvent?.id) {
      setError("Valid event QR link required.");
      return;
    }
    setError(null);
    setError(null);
    setVerifyLoading(true);
    try {
      const result = await api.verifyOtp(selectedEvent.id, guestMobile.trim(), otpInput.trim());
      setOtpVerifiedToken(result.verification_token);
      setVerifyLoading(false);
      setVerifySuccess(true);
      showToast(pickMessage(FORM_SUBMIT_MESSAGES));
      onAccessVerified?.(guestNameInput.trim(), guestMobile.trim());
      autoCameraStartedRef.current = false;
      setAccessVerifiedFlash(true);
      window.setTimeout(() => {
        setVerifySuccess(false);
        setAccessVerifiedFlash(false);
        goToStep("upload");
      }, 700);
    } catch (err) {
      setVerifyLoading(false);
      setError(err instanceof Error ? err.message : "Incorrect OTP. Please check and try again.");
    }
  };

  const startSearch = async (fileOverride?: File) => {
    const fileToSearch = fileOverride || selfieFile;
    const eventId = selectedEvent?.id;
    if (!fileToSearch || !eventId) {
      setError("Please select an event and capture a live selfie first.");
      return;
    }

    goToStep("searching");
    setError(null);
    setMatchedPhotos([]);
    setLoadedPhotos(new Set());
    setSelectedPhotoIds(new Set());
    setResultHeadline("");
    setResultSubtext("");
    setSearchMessage(PHOTO_SEARCH_MESSAGES[0]);
    setAiProgress(0);
    showToast(PHOTO_SEARCH_MESSAGES[0]);

    // AI progress animation
    const AI_MESSAGES = [
      "Scanning your selfie...",
      "Analyzing facial features...",
      `Matching with ${eventPhotos} photos...`,
      "Almost there...",
        "Found your memories!",
    ];
    let prog = 0;
    const progressInterval = window.setInterval(() => {
      prog = Math.min(prog + Math.random() * 18 + 4, 92);
      setAiProgress(prog);
      const msgIdx = Math.min(Math.floor(prog / 22), AI_MESSAGES.length - 1);
      setAiMessage(AI_MESSAGES[msgIdx]);
    }, 280);

    const timers = [
      window.setTimeout(() => setSearchMessage(PHOTO_SEARCH_MESSAGES[1]), 450),
      window.setTimeout(() => setSearchMessage(PHOTO_SEARCH_MESSAGES[2]), 1100),
      window.setTimeout(() => setSearchMessage("Preparing your memories..."), 1800),
    ];

    try {
      const result = await api.searchSelfie(eventId, guestNameInput.trim() || userName || "Guest User", fileToSearch, guestMobile.trim(), otpVerifiedToken);
      const matches = (result.matches || []).map((photo) => ({
        ...photo,
        url: getAssetUrl(photo.url),
      }));
      setMatchedPhotos(matches);
      setSelectedPhotoIds(new Set());
      if (matches.length > 0) {
        setResultHeadline(PHOTO_FOUND_MESSAGES[0]);
        setResultSubtext(PHOTO_FOUND_MESSAGES[1]);
        showToast(PHOTO_FOUND_MESSAGES[2]);
        confetti({
          particleCount: 110,
          spread: 72,
          origin: { y: 0.72 },
          colors: [GOLD, "#f7d681", "#ffffff", GREEN],
        });
      } else {
        setResultHeadline(PHOTO_NOT_FOUND_MESSAGES[0]);
        setResultSubtext(PHOTO_NOT_FOUND_MESSAGES[1]);
        setError("Is event me abhi matching photos nahi mile. Clear front-face selfie try karo ya photographer se event photos upload/index karvao.");
        showToast(PHOTO_NOT_FOUND_MESSAGES[0]);
      }
    } catch (err) {
      console.error("AI selfie search failed:", err);
      setMatchedPhotos([]);
      setResultHeadline(PHOTO_NOT_FOUND_MESSAGES[0]);
      setResultSubtext(PHOTO_NOT_FOUND_MESSAGES[1]);
      setError("AI search connect nahi ho pa raha. Backend server running hai aur event photos uploaded hain, ye check karo.");
    } finally {
      window.clearInterval(progressInterval);
      timers.forEach((timer) => window.clearTimeout(timer));
      setAiProgress(100);
      setAiMessage("Found your memories!");
      window.setTimeout(() => goToStep("results"), 700);
    }
  };

  const handleDownload = async (photoId: number, url: string, name: string, size = "4.2 MB") => {
    setDownloadingIds(prev => new Set(prev).add(photoId));
    try {
      api.logDownload(userEmail, eventName, name, size).catch((err) => console.error("Failed to log download:", err));
      await api.downloadPhoto(photoId, name, url);
    } catch (err) {
      console.error("Photo download failed:", err);
      window.location.href = url;
    } finally {
      window.setTimeout(() => setDownloadingIds(prev => { const s = new Set(prev); s.delete(photoId); return s; }), 1200);
    }
  };

  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotoIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const toggleSelectAllPhotos = () => {
    setSelectedPhotoIds((current) => {
      if (current.size === matchedPhotos.length) return new Set();
      return new Set(matchedPhotos.map((photo) => photo.photo_id));
    });
  };

  const downloadSelectedPhotos = async () => {
    const selectedPhotos = matchedPhotos.filter((photo) => selectedPhotoIds.has(photo.photo_id));
    for (const photo of selectedPhotos) {
      await handleDownload(photo.photo_id, photo.url, photo.name, photo.size);
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
  };

  const downloadSelectedPhotosZip = async () => {
    const selectedIds = matchedPhotos
      .filter((photo) => selectedPhotoIds.has(photo.photo_id))
      .map((photo) => photo.photo_id);
    if (selectedIds.length === 0) return;

    try {
      await api.downloadPhotosZip(selectedIds, `${eventName || "masterstudio"}-photos.zip`);
      selectedIds.forEach((photoId) => {
        const photo = matchedPhotos.find((item) => item.photo_id === photoId);
        if (photo) api.logDownload(userEmail, eventName, photo.name, photo.size).catch((err) => console.error("Failed to log download:", err));
      });
    } catch (err) {
      console.error("ZIP download failed:", err);
      await downloadSelectedPhotos();
    }
  };

  const resetFlow = () => {
    setStep("verify");
    setSelfie(null);
    setSelfieFile(null);
    setMatchedPhotos([]);
    setSelectedPhotoIds(new Set());
    setError(null);
    setGuestNameInput("");
    setGuestMobile("");
    setOtpInput("");
    setGeneratedOtp("");
    setOtpSent(false);
    setOtpMessage("");
    setResendSeconds(0);
    setAccessVerifiedFlash(false);
    setToastMessage("");
    setResultHeadline("");
    setResultSubtext("");
    setSearchMessage("Uploading your selfie...");
    stopLiveCamera();
    autoCameraStartedRef.current = false;
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEventFilter(eventId);
    setSelfie(null);
    setSelfieFile(null);
    setMatchedPhotos([]);
    setSelectedPhotoIds(new Set());
    setError(null);
    setResultHeadline("");
    setResultSubtext("");
    setSearchMessage("Uploading your selfie...");
    stopLiveCamera();
    autoCameraStartedRef.current = false;
    if (step !== "verify" && step !== "landing") {
      setStep("upload");
    }
  };

  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return "18 June 2026";
    let formatted = dateStr;
    formatted = formatted.replace(/jan/i, "January");
    formatted = formatted.replace(/feb/i, "February");
    formatted = formatted.replace(/mar/i, "March");
    formatted = formatted.replace(/apr/i, "April");
    formatted = formatted.replace(/may/i, "May");
    formatted = formatted.replace(/jun/i, "June");
    formatted = formatted.replace(/jul/i, "July");
    formatted = formatted.replace(/aug/i, "August");
    formatted = formatted.replace(/sep/i, "September");
    formatted = formatted.replace(/oct/i, "October");
    formatted = formatted.replace(/nov/i, "November");
    formatted = formatted.replace(/dec/i, "December");
    return formatted;
  };

  const getEventLocation = (name: string) => {
    if (!name) return "Ranchi\nJharkhand";
    const lower = name.toLowerCase();
    if (lower.includes("ranchi")) return "Ranchi\nJharkhand";
    if (lower.includes("jamshedpur")) return "Jamshedpur\nJharkhand";
    if (lower.includes("patna")) return "Patna\nBihar";
    if (lower.includes("delhi")) return "Delhi\nNCR";
    if (lower.includes("mumbai")) return "Mumbai\nMaharashtra";
    if (lower.includes("wedding") || lower.includes("marriage")) return "Event Venue\nCity";
    return "Main Hall\nJharkhand";
  };

  const renderStepper = () => {
    const currentStepNum = step === "verify" ? 1 : (step === "upload" || step === "searching" ? 2 : 3);
    const progressWidth = currentStepNum === 1 ? "0%" : currentStepNum === 2 ? "50%" : "100%";
    const steps = [
      { label: "Verify", num: 1 },
      { label: "Selfie", num: 2 },
      { label: "Memories", num: 3 },
    ];

    return (
      <div
        className="mx-auto w-full max-w-[440px] min-w-0 overflow-hidden px-1 pt-0.5 pb-0 mb-[-6px] sm:mb-[-10px]"
        style={{ maxWidth: "min(440px, calc(100vw - 24px))" }}
      >
        <div className="flex items-center justify-between relative">
          {/* Track */}
          <div className="absolute left-[16.6%] right-[16.6%] top-[12px] sm:top-[18px] h-[2px] rounded-full z-0" style={{ background: "rgba(255,255,255,0.08)" }}>
            {/* Gold fill â€” animates leftâ†’right */}
            <div
              style={{
                height: "100%",
                borderRadius: "9999px",
                background: `linear-gradient(90deg, #ffd700, ${GOLD})`,
                boxShadow: `0 0 8px rgba(201,151,58,0.6)`,
                width: progressWidth,
                transition: "width 500ms cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </div>

          {steps.map((s) => {
            const isActive = currentStepNum === s.num;
            const isCompleted = currentStepNum > s.num;
            return (
              <div key={s.label} className="relative z-10 flex flex-col items-center gap-0.5 w-1/3">
                <div
                  className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full text-[9px] sm:text-xs font-bold"
                  style={{
                    background: isCompleted ? `linear-gradient(135deg, #ffd700, ${GOLD})` : isActive ? "#07090d" : "#07090d",
                    border: isActive || isCompleted ? `2px solid ${GOLD}` : "1.5px solid rgba(255,255,255,0.15)",
                    color: isCompleted ? BG : isActive ? GOLD : "rgba(240,237,230,0.5)",
                    boxShadow: isActive ? "0 0 0 0 rgba(201,151,58,0.5)" : "none",
                    animation: isActive ? "stepPulse 2s ease-out infinite" : "none",
                    transition: "all 0.4s ease",
                  }}
                >
                  {isCompleted
                    ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
                    : s.num}
                </div>
                <span
                  className="text-[9px] sm:text-xs font-bold"
                  style={{
                    color: isActive || isCompleted ? GOLD : "rgba(240,237,230,0.4)",
                    transition: "color 0.4s ease",
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col gap-4 sm:gap-5"
      style={{
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? "translateY(16px)" : "translateY(0)",
        transition: "opacity 320ms ease-out, transform 320ms ease-out",
      }}
    >
      {toastMessage && (
        <div className="fixed left-1/2 top-[86px] z-[120] w-[calc(100%-24px)] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3 text-center shadow-2xl animate-fadeIn" style={{ background: "rgba(13,15,22,0.96)", border: `1px solid ${BORDER}`, color: TEXT, backdropFilter: "blur(14px)", fontSize: "0.86rem", fontWeight: 800 }}>
          {toastMessage}
        </div>
      )}

      {step !== "landing" && step !== "verify" && renderStepper()}

      {step !== "verify" && (
      <div className="hidden md:flex md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2.5 sm:mb-3" style={{ background: "rgba(201,151,58,0.10)", border: `1px solid ${BORDER}`, color: GOLD, fontSize: "0.7rem", fontWeight: 800 }}>
            <Shield size={13} />
            Private photo finder
          </div>
          <h1 className="text-[1.55rem] sm:text-3xl font-extrabold leading-tight" style={{ color: TEXT }}>Find your event photos</h1>
          <p className="max-w-[36rem]" style={{ fontSize: "0.84rem", color: MUTED, marginTop: "6px", lineHeight: 1.65 }}>Live selfie capture karo. Sirf matching photos yahan dikhenge.</p>
        </div>
        <div className="w-full md:w-[260px]">
          <label style={{ display: "block", color: MUTED, fontSize: "0.7rem", fontWeight: 700, marginBottom: "6px" }}>EVENT</label>
          <select
            value={selectedEventFilter}
            onChange={(e) => handleEventChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl outline-none"
            style={{ background: "#171b27", border: `1px solid ${BORDER_SOFT}`, color: TEXT, fontSize: "0.82rem", fontWeight: 700 }}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </div>
      </div>
      )}

      {step === "landing" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="relative min-h-[360px] flex items-end">
            <img src={coverPhoto} alt={eventName} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(10,12,16,0.92) 0%, rgba(10,12,16,0.58) 48%, rgba(10,12,16,0.2) 100%)" }} />
            <div className="relative z-10 p-6 sm:p-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4" style={{ background: "rgba(201,151,58,0.16)", color: GOLD, fontSize: "0.72rem", fontWeight: 800 }}>
                <QrCode size={13} />
                QR Event Access
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold leading-tight">{eventName}</h3>
              <div className="mt-4 flex flex-wrap gap-3" style={{ color: "rgba(240,237,230,0.78)", fontSize: "0.84rem" }}>
                <span className="flex items-center gap-2"><CalendarDays size={15} style={{ color: GOLD }} /> {eventDate}</span>
                <span className="flex items-center gap-2"><Camera size={15} style={{ color: GOLD }} /> {eventPhotos} photos</span>
                <span className="flex items-center gap-2"><UserCheck size={15} style={{ color: GOLD }} /> {photographerName}</span>
              </div>
              <button onClick={() => setStep("upload")} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all hover:-translate-y-0.5" style={{ background: GOLD, color: BG, fontSize: "0.9rem" }}>
                <Search size={16} />
                Find My Photos
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px] gap-4 sm:gap-5">
          <div className="hidden lg:block order-2 lg:order-1 rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="p-3.5 sm:p-5 flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <BrandMark logoUrl={brandLogo} name={brandName || photographerName} />
                <div className="min-w-0">
                  <div className="truncate" style={{ color: TEXT, fontSize: "1rem", fontWeight: 900 }}>{eventName}</div>
                  <div className="truncate" style={{ color: MUTED, fontSize: "0.76rem", marginTop: "2px" }}>Hosted by {brandName}</div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.10)", color: GREEN, fontSize: "0.72rem", fontWeight: 800 }}>
                <CheckCircle size={13} />
                Active
              </div>
            </div>

            <div className="relative aspect-[4/3] sm:aspect-[21/10] overflow-hidden">
              <img src={coverPhoto} alt={eventName} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,9,13,0.02) 0%, rgba(7,9,13,0.58) 100%)" }} />
              <div className="absolute left-4 bottom-4 right-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(7,9,13,0.76)", color: TEXT, fontSize: "0.76rem", fontWeight: 800, backdropFilter: "blur(10px)" }}>
                  <CalendarDays size={13} style={{ color: GOLD }} /> {eventDate || "Event date"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(7,9,13,0.76)", color: TEXT, fontSize: "0.76rem", fontWeight: 800, backdropFilter: "blur(10px)" }}>
                  <Camera size={13} style={{ color: GOLD }} /> {eventPhotos} photos
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x" style={{ borderTop: `1px solid ${BORDER_SOFT}`, borderColor: BORDER_SOFT }}>
              {[
                { label: "Access", value: "QR Link" },
                { label: "Privacy", value: "Live Selfie" },
                { label: "Gallery", value: `${eventPhotos} Photos` },
              ].map((item) => (
                <div key={item.label} className="p-3 sm:p-4 text-center">
                  <div style={{ color: MUTED, fontSize: "0.67rem", fontWeight: 700 }}>{item.label}</div>
                  <div className="truncate" style={{ color: TEXT, fontSize: "0.78rem", fontWeight: 900, marginTop: "3px" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2 w-full max-w-[440px] lg:max-w-none mx-auto lg:mx-0 rounded-[24px] p-4 sm:p-5 flex flex-col gap-4 lg:self-start text-center lg:text-left" 
               style={{ 
                  width: "100%",
                  maxWidth: "min(440px, calc(100vw - 24px))",
                 boxSizing: "border-box",
                 background: "linear-gradient(180deg, #0d0f14 0%, #060709 100%)", 
                 border: "1px solid rgba(255, 255, 255, 0.06)", 
                 boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)" 
               }}>

            {/* Event Card Selector (Mobile Only) */}
            <div className="relative md:hidden w-full mb-1">
              <div 
                className="flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(201,151,58,0.12)" }}>
                    <CalendarDays size={18} style={{ color: GOLD }} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Selected Event</span>
                    <span className="text-xs font-bold line-clamp-1" style={{ color: TEXT }}>{eventName}</span>
                  </div>
                </div>
                <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.45)" }} />
              </div>
              {/* Native Select Overlay */}
              <select
                value={selectedEventFilter}
                onChange={(e) => handleEventChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Select Event"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ background: "rgba(201,151,58,0.12)", color: GOLD }}>
                <Camera size={19} />
              </div>
              <div className="sm:hidden flex justify-center mb-3">
                <BrandMark logoUrl={brandLogo} name={brandName || photographerName} size="sm" />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: TEXT }}>{brandName || photographerName} Photo Finder</h3>
              <p className="hidden sm:block" style={{ fontSize: "0.82rem", color: MUTED, marginTop: "6px", lineHeight: 1.6 }}>
                Safety ke liye fresh camera selfie required hai. Gallery upload allowed nahi hai.
              </p>
            </div>

            {!cameraOpen && (
              <button
                onClick={startLiveCamera}
                className="mx-auto w-full max-w-[260px] aspect-square rounded-2xl flex flex-col items-center justify-center text-center gap-4 transition-all hover:-translate-y-0.5"
                style={{ background: "rgba(201,151,58,0.07)", border: `1px dashed rgba(201,151,58,0.62)`, boxShadow: "0 18px 48px rgba(201,151,58,0.12)" }}
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(201,151,58,0.15)" }}>
                  <Camera size={34} style={{ color: GOLD }} />
                </div>
                <div>
                  <div style={{ fontWeight: 900, color: TEXT, fontSize: "1.05rem" }}>Start Camera</div>
                  <div style={{ fontSize: "0.74rem", color: MUTED, marginTop: "5px" }}>Live selfie</div>
                </div>
              </button>
            )}

            {cameraOpen && (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="relative mx-auto w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden" style={{ border: `2px solid ${GOLD}`, boxShadow: "0 18px 48px rgba(201,151,58,0.16)" }}>
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-4 rounded-2xl pointer-events-none" style={{ border: "1px dashed rgba(255,255,255,0.35)" }} />
                </div>

                <button onClick={captureLiveSelfie} className="w-full py-4 rounded-2xl font-extrabold text-sm sm:text-base transition-all hover:-translate-y-0.5" style={{ background: GOLD, color: BG, boxShadow: "0 12px 30px rgba(201,151,58,0.18)" }}>
                  Capture Selfie
                </button>

                <p className="max-w-[18rem] text-center mx-auto" style={{ color: "rgba(240,237,230,0.72)", fontSize: "0.78rem", lineHeight: 1.6 }}>
                  Thank you. Your selfie is used only to find your event photos.
                </p>

                <div className="grid grid-cols-1 gap-2 w-full">
                  <button onClick={stopLiveCamera} className="py-3.5 rounded-xl font-bold text-sm" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER_SOFT}`, color: TEXT }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.12)", color: RED, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
          </div>
        </div>
      )}

      {step === "verify" && (
        <div className="mx-auto w-full max-w-[440px] min-w-0 overflow-hidden rounded-[24px] p-4 sm:p-5 flex flex-col gap-4 sm:gap-5" 
             style={{ 
               width: "100%", 
               maxWidth: "min(440px, calc(100vw - 24px))",
               boxSizing: "border-box", 
               color: TEXT, 
               background: "linear-gradient(180deg, #0d0f14 0%, #060709 100%)", 
               border: "1px solid rgba(255, 255, 255, 0.06)", 
               boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)" 
             }}>

          {renderStepper()}

          {/* Details Card */}
          <div className="rounded-2xl p-4 flex flex-col gap-3.5 relative overflow-hidden" 
               style={{ 
                 background: "#0d0f14", 
                 border: "1px solid rgba(201, 151, 58, 0.22)",
                 boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"
               }}>
            {/* The golden glow at the bottom of the card */}
            <div className="absolute bottom-0 left-1/4 right-1/4 h-[1px]" 
                 style={{ background: "linear-gradient(90deg, transparent, #c9973a, transparent)", filter: "blur(1px)" }} />
            <div className="absolute bottom-0 left-1/3 right-1/3 h-[8px] opacity-20" 
                 style={{ background: "radial-gradient(ellipse at bottom, #c9973a 0%, transparent 70%)" }} />

            <div className="grid grid-cols-3 divide-x divide-zinc-800 text-center items-center">
              {/* Column 1: Date */}
              <div className="flex flex-col items-center gap-1.5 px-1">
                <CalendarDays size={18} style={{ color: GOLD }} />
                <span style={{ fontSize: "clamp(0.65rem, 2.5vw, 0.78rem)", color: TEXT, fontWeight: 500, lineHeight: 1.25 }}>
                  {formatEventDate(eventDate)}
                </span>
              </div>
              
              {/* Column 2: Event name */}
              <div className="flex flex-col items-center gap-1.5 px-1">
                <Users size={18} style={{ color: GOLD }} />
                <span className="line-clamp-2" style={{ fontSize: "clamp(0.65rem, 2.5vw, 0.78rem)", color: TEXT, fontWeight: 700, lineHeight: 1.25 }}>
                  {eventName || "Event Gallery"}
                </span>
              </div>
              
              {/* Column 3: Location */}
              <div className="flex flex-col items-center gap-1.5 px-1">
                <MapPin size={18} style={{ color: GOLD }} />
                <span style={{ fontSize: "clamp(0.65rem, 2.5vw, 0.78rem)", color: TEXT, fontWeight: 500, lineHeight: 1.25, whiteSpace: "pre-line" }}>
                  {selectedEvent?.location || getEventLocation(eventName)}
                </span>
              </div>
            </div>

            <div className="h-px w-full bg-zinc-800/60" />

            {/* Photographer brand â€” premium strip */}
            <div
              className="flex items-center justify-center gap-2.5 rounded-xl px-3 py-2 relative overflow-hidden"
              style={{
                background: "linear-gradient(90deg, rgba(201,151,58,0.06) 0%, rgba(201,151,58,0.14) 50%, rgba(201,151,58,0.06) 100%)",
                border: "1px solid rgba(201,151,58,0.28)",
              }}
            >
              {/* Shimmer line */}
              <div
                className="absolute inset-y-0 w-1/3 left-[-33%]"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.12), transparent)",
                  animation: "shimmerSlide 2.5s ease-in-out infinite",
                }}
              />
              <div className="relative flex w-full min-w-0 items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(201,151,58,0.18)", border: "1px solid rgba(201,151,58,0.35)" }}
                >
                  <Camera size={13} style={{ color: GOLD }} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
                  <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Captured by</span>
                  <span
                    className="max-w-full truncate"
                    style={{
                      background: "linear-gradient(90deg, #ffd700, #c9973a, #fff8e1)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      fontSize: "0.82rem",
                      fontWeight: 900,
                      letterSpacing: "0.01em",
                      lineHeight: 1.2,
                    }}
                  >
                    {brandName || photographerName || "MASTER STUDIO"}
                  </span>
                </div>
                <div
                  className="flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: GREEN, fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.04em" }}
                >
                  <CheckCircle size={8} />
                  Verified
                </div>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center flex flex-col gap-0.5 mt-[-10px] sm:mt-[-14px] mb-[-10px] sm:mb-[-14px]">
            <h1 style={{ color: TEXT, fontSize: "clamp(0.95rem, 4.2vw, 1.35rem)", fontWeight: 800, lineHeight: 1.2 }}>
              Unlock Your <span style={{ color: GOLD }}>Private</span> Memories
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "clamp(0.7rem, 2.2vw, 0.78rem)", lineHeight: 1.4, marginTop: "1px" }}>
              Enter your details to securely access your event photos.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3.5 text-left">
            {/* Guest Name input */}
            <div className="flex flex-col gap-1 sm:gap-1.5">
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", fontWeight: 700 }}>Guest Name</label>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 sm:py-2.5" style={{ background: "rgba(2,6,9,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <User size={15} style={{ color: GOLD }} />
                <input
                  type="text"
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  placeholder="Enter your full name"
                  className="min-w-0 flex-1 bg-transparent outline-none text-xs sm:text-sm"
                  style={{ color: TEXT, fontWeight: 500 }}
                />
              </div>
            </div>

            {/* Mobile Number input */}
            <div className="flex flex-col gap-1 sm:gap-1.5">
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", fontWeight: 700 }}>Mobile Number</label>
              <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "rgba(2,6,9,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-1 px-2.5 py-2 sm:py-2.5" style={{ borderRight: "1px solid rgba(255,255,255,0.08)", color: TEXT, fontSize: "0.8rem", fontWeight: 700 }}>
                  <Smartphone size={15} style={{ color: GOLD }} />
                  <span>+91</span>
                  <ChevronDown size={10} style={{ color: "rgba(255,255,255,0.4)" }} />
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={guestMobile}
                  onChange={(e) => setGuestMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Enter 10 digit mobile number"
                  className="min-w-0 flex-1 bg-transparent px-2.5 py-2 sm:py-2.5 outline-none text-xs sm:text-sm"
                  style={{ color: TEXT, fontWeight: 500 }}
                />
              </div>
              {otpSent && (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", marginTop: "1px", fontWeight: 600 }}>
                  {debugOtp ? `Local test OTP: ${debugOtp}` : `OTP sent to ${maskedMobile || "your mobile"}`}
                </div>
              )}
            </div>

            {/* OTP Verification */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", fontWeight: 700 }}>OTP Verification</label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resendSeconds > 0}
                  className="inline-flex items-center gap-1 font-bold transition-all hover:opacity-80"
                  style={{ color: GOLD, fontSize: "0.8rem", opacity: resendSeconds > 0 ? 0.6 : 1 }}
                >
                  <Send size={12} className="rotate-45" style={{ transform: "rotate(-45deg)" }} />
                  {resendSeconds > 0 ? `${resendSeconds}s` : otpSent ? "Resend OTP" : "Send OTP"}
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={!otpSent}
                  className="absolute inset-0 z-10 h-full w-full opacity-0 cursor-pointer"
                  aria-label="OTP verification code"
                />
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {Array.from({ length: 6 }).map((_, index) => {
                    const char = otpInput[index] || "";
                    const isCurrent = otpSent && index === otpInput.length;
                    
                    return (
                      <div 
                        key={index} 
                        className="flex aspect-square w-full max-w-9 sm:max-w-11 items-center justify-center rounded-lg text-sm sm:text-base font-bold transition-all duration-150 mx-auto" 
                        style={{ 
                          background: "rgba(2,6,9,0.45)", 
                          border: isCurrent 
                            ? `1px solid ${GOLD}` 
                            : char 
                              ? "1px solid rgba(255, 255, 255, 0.2)" 
                              : "1px solid rgba(255,255,255,0.08)", 
                          color: TEXT,
                          boxShadow: isCurrent ? "0 0 10px rgba(201,151,58,0.15)" : "none"
                        }}
                      >
                        {char || (isCurrent ? <span className="animate-pulse" style={{ color: GOLD }}>|</span> : "")}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[11px] sm:text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span>Didn't receive OTP?</span>
                <span>
                  {resendSeconds > 0 ? (
                    <>Resend in <span style={{ color: GOLD, fontWeight: 700 }}>00:{String(resendSeconds).padStart(2, "0")}</span></>
                  ) : (
                    <button type="button" onClick={handleSendOtp} className="font-bold hover:underline" style={{ color: GOLD }}>Resend now</button>
                  )}
                </span>
              </div>
            </div>
          </div>

          {otpMessage && (
            <div className="p-2.5 rounded-lg text-left text-[11px] sm:text-xs" style={{ background: "rgba(34,197,94,0.10)", color: GREEN, border: "1px solid rgba(34,197,94,0.18)" }}>
              {otpMessage}
            </div>
          )}

          {/* Info Banner */}
          <div className="rounded-lg p-2 mt-[-8px] sm:mt-[-12px]" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(201,151,58,0.06)", border: "1px solid rgba(201,151,58,0.14)" }}>
                <Lock size={12} style={{ color: GOLD }} />
              </div>
              <p className="text-left text-[10px] sm:text-xs" style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.35, margin: 0 }}>
                Your mobile number verifies your identity. Selfie is used only for <span style={{ color: GOLD, fontWeight: 600 }}>AI photo matching.</span>
              </p>
            </div>
          </div>

          {error && <div className="p-2.5 rounded-lg text-left text-[11px] sm:text-xs" style={{ background: "rgba(239,68,68,0.10)", color: RED, border: "1px solid rgba(239,68,68,0.18)", lineHeight: 1.4 }}>{error}</div>}

          {/* Continue button */}
          <div className="flex flex-col gap-1.5 mt-1 mb-[-8px] sm:mb-[-12px]">
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={!otpSent || otpInput.length < 6 || verifyLoading || verifySuccess}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold transition-all duration-300 text-sm relative overflow-hidden"
              style={{
                background: verifySuccess
                  ? "linear-gradient(135deg, #22c55e, #16a34a)"
                  : otpSent && otpInput.length === 6
                  ? `linear-gradient(180deg, #f7d681 0%, ${GOLD} 100%)`
                  : "rgba(255,255,255,0.06)",
                color: verifySuccess ? "#fff" : otpSent && otpInput.length === 6 ? "#0a0c10" : "rgba(255,255,255,0.35)",
                boxShadow: verifySuccess
                  ? "0 8px 24px rgba(34,197,94,0.3)"
                  : otpSent && otpInput.length === 6
                  ? "0 8px 20px rgba(201,151,58,0.25)"
                  : "none",
                cursor: otpSent && otpInput.length === 6 && !verifyLoading && !verifySuccess ? "pointer" : "not-allowed",
                transform: verifySuccess ? "scale(1.01)" : "scale(1)",
              }}
            >
              {verifySuccess ? (
                <>
                  <CheckCircle size={16} />
                  Verified Successfully!
                </>
              ) : verifyLoading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  <Camera size={16} />
                  Continue & Upload Selfie
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Camera size={12} style={{ color: GOLD }} />
              <span>Camera access will be requested in the next step.</span>
            </div>
          </div>

          {/* Footer badges */}
          <div className="grid grid-cols-3 gap-0.5 border-t border-zinc-800/60 pt-2 mt-0.5">
            {[
              { icon: Shield, title: "100% Private", sub: "Your data is safe" },
              { icon: Sparkles, title: "AI Powered", sub: "Fast & Accurate" },
              { icon: Trash2, title: "Selfie Auto Deleted", sub: "After matching" },
            ].map(({ icon: Icon, title, sub }, idx) => (
              <div key={title} className={`flex flex-col items-center text-center px-0.5 ${idx > 0 ? "border-l border-zinc-800/60" : ""}`}>
                <Icon size={13} style={{ color: GOLD }} />
                <span style={{ color: TEXT, fontSize: "0.62rem", fontWeight: 700, marginTop: "3px" }}>{title}</span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.54rem", marginTop: "1px", lineHeight: 1.2 }}>{sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "searching" && (
        <div
          className="min-h-[460px] sm:min-h-[560px] rounded-2xl flex flex-col items-center justify-center text-center px-6 gap-6"
          style={{ background: "linear-gradient(180deg, #0a0c12 0%, #06070a 100%)", border: `1px solid rgba(201,151,58,0.18)` }}
        >
          {/* Face scan circle */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center" style={{ background: "rgba(201,151,58,0.06)", border: `2px solid rgba(201,151,58,0.3)` }}>
            {/* Scan sweep line */}
            <div
              className="absolute left-2 right-2"
              style={{
                height: "2px",
                background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                boxShadow: `0 0 12px rgba(201,151,58,0.8)`,
                top: "10%",
                animation: "scanLine 1.8s ease-in-out infinite",
                borderRadius: "9999px",
              }}
            />
            {selfie ? (
              <img src={selfie} alt="selfie" className="w-full h-full object-cover rounded-full" style={{ opacity: 0.7 }} />
            ) : (
              <Sparkles size={36} style={{ color: GOLD, opacity: 0.8 }} />
            )}
            {/* Ping rings */}
            <div className="absolute inset-0 rounded-full animate-ping" style={{ border: `1.5px solid rgba(201,151,58,0.3)`, animationDuration: "1.6s" }} />
            <div className="absolute -inset-3 rounded-full animate-ping" style={{ border: `1px solid rgba(201,151,58,0.12)`, animationDuration: "2.2s" }} />
          </div>

          {/* Title + message */}
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold" style={{ color: TEXT }}>
              AI is finding your memories...
            </h3>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>{aiMessage}</p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs">
            <div className="flex justify-between items-center mb-2">
              <span style={{ color: MUTED, fontSize: "0.72rem", fontWeight: 700 }}>Matching Photos</span>
              <span style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 900 }}>{Math.round(aiProgress)}%</span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: "9999px",
                  width: `${aiProgress}%`,
                  background: `linear-gradient(90deg, #ffd700, ${GOLD})`,
                  boxShadow: "0 0 10px rgba(201,151,58,0.6)",
                  transition: "width 280ms ease-out",
                }}
              />
            </div>
            <p className="mt-2 text-center" style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.68rem" }}>
              Searching across {eventPhotos} event photos
            </p>
          </div>
        </div>
      )}

      {step === "results" && (
        <div className="flex flex-col gap-4 sm:gap-6">

          <div className="flex flex-col gap-3">
            <div className="text-left mt-0.5">
              <h2 className="text-xl sm:text-2xl font-extrabold leading-tight" style={{ color: TEXT }}>
                Your <span style={{ color: GOLD }}>Memories</span> Are Ready
              </h2>
              {matchedPhotos.length > 0 && (
                <p className="mt-1" style={{ fontSize: "clamp(0.74rem, 2.3vw, 0.82rem)", color: MUTED, lineHeight: 1.4 }}>
                  We found <span style={{ color: GOLD, fontWeight: 700 }}>{matchedPhotos.length} matching photos</span> from {eventName}
                </p>
              )}
            </div>

            {matchedPhotos.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0">
                {/* Select All / Clear Pill */}
                <button 
                  onClick={toggleSelectAllPhotos}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold shrink-0 transition-all duration-200"
                  style={{
                    background: selectedPhotoIds.size === matchedPhotos.length ? "rgba(201,151,58,0.12)" : "rgba(255,255,255,0.05)",
                    border: selectedPhotoIds.size === matchedPhotos.length ? `1px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)",
                    color: selectedPhotoIds.size === matchedPhotos.length ? GOLD : TEXT
                  }}
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm" style={{ 
                    background: selectedPhotoIds.size === matchedPhotos.length ? GOLD : "rgba(255,255,255,0.1)",
                    color: BG
                  }}>
                    {selectedPhotoIds.size === matchedPhotos.length && <Check size={10} strokeWidth={3} />}
                  </span>
                  {selectedPhotoIds.size === matchedPhotos.length 
                    ? `Clear Selection` 
                    : `Select All (${matchedPhotos.length})`}
                </button>

                {/* Best Match Tab */}
                <button
                  onClick={() => setResultsFilter("best")}
                  className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold shrink-0 transition-all duration-200"
                  style={{
                    background: resultsFilter === "best" ? GOLD : "rgba(255,255,255,0.05)",
                    border: resultsFilter === "best" ? `1px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)",
                    color: resultsFilter === "best" ? BG : TEXT
                  }}
                >
                  Best Match
                </button>

                {/* All Tab */}
                <button
                  onClick={() => setResultsFilter("all")}
                  className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold shrink-0 transition-all duration-200"
                  style={{
                    background: resultsFilter === "all" ? GOLD : "rgba(255,255,255,0.05)",
                    border: resultsFilter === "all" ? `1px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)",
                    color: resultsFilter === "all" ? BG : TEXT
                  }}
                >
                  All
                </button>

                {/* Latest Tab */}
                <button
                  onClick={() => setResultsFilter("latest")}
                  className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold shrink-0 transition-all duration-200"
                  style={{
                    background: resultsFilter === "latest" ? GOLD : "rgba(255,255,255,0.05)",
                    border: resultsFilter === "latest" ? `1px solid ${GOLD}` : "1px solid rgba(255,255,255,0.08)",
                    color: resultsFilter === "latest" ? BG : TEXT
                  }}
                >
                  Latest
                </button>
              </div>
            )}
          </div>

          {matchedPhotos.length === 0 ? (
            <div className="min-h-[300px] rounded-2xl flex flex-col items-center justify-center text-center px-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)", color: RED }}>
                <AlertCircle size={24} />
              </div>
              <h3 className="mt-4 text-lg font-extrabold" style={{ color: TEXT }}>{resultHeadline || "No photos found yet."}</h3>
              <p className="mt-1.5 max-w-md" style={{ color: MUTED, fontSize: "0.78rem", lineHeight: 1.6 }}>
                {resultSubtext || error || "Don't worry, try clicking a clearer selfie."}
              </p>
              <button onClick={resetFlow} className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold" style={{ background: GOLD, color: BG }}>
                <RefreshCw size={12} />
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
              {displayPhotos.map((photo, index) => {
                const isSelected = selectedPhotoIds.has(photo.photo_id);
                const isHighestMatch = photo.similarity === maxSimilarity;
                const isLoaded = loadedPhotos.has(photo.photo_id);
                const isDownloading = downloadingIds.has(photo.photo_id);

                return (
                  <div
                    key={photo.photo_id}
                    className="rounded-2xl overflow-hidden group relative flex flex-col"
                    style={{
                      background: CARD,
                      border: isSelected ? `2.5px solid #c9973a` : `1px solid ${BORDER}`,
                      boxShadow: isSelected ? "0 8px 25px rgba(201,151,58,0.18)" : "none",
                      opacity: 0,
                      animation: `photoReveal 0.45s ease-out forwards`,
                      animationDelay: `${index * 80}ms`,
                      transform: "scale(0.95)",
                      transition: "border 0.2s, box-shadow 0.2s",
                    }}
                  >
                    <div className="relative aspect-square overflow-hidden flex-1">
                      {/* Skeleton loader */}
                      {!isLoaded && (
                        <div
                          className="absolute inset-0 z-10"
                          style={{
                            background: "linear-gradient(90deg, #13161d 0%, #1c2030 50%, #13161d 100%)",
                            backgroundSize: "200% 100%",
                            animation: "shimmerLoad 1.4s ease-in-out infinite",
                          }}
                        />
                      )}
                      {/* Photo Image */}
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onLoad={() => setLoadedPhotos(prev => new Set(prev).add(photo.photo_id))}
                        style={{ opacity: isLoaded ? 1 : 0, transition: "opacity 0.3s ease" }}
                      />

                      {/* Select Toggle Overlay / Checkbox Button (Top Right) */}
                      <button
                        onClick={() => togglePhotoSelection(photo.photo_id)}
                        className="absolute right-2 top-2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-md"
                        style={{
                          background: isSelected ? GOLD : "rgba(10, 12, 16, 0.65)",
                          border: isSelected ? `1.5px solid ${GOLD}` : "1.5px solid rgba(255,255,255,0.4)",
                          color: isSelected ? BG : "transparent",
                        }}
                        aria-label={`${isSelected ? "Unselect" : "Select"} ${photo.name}`}
                      >
                        <Check size={12} strokeWidth={3} style={{ color: isSelected ? BG : "transparent" }} />
                      </button>

                      {/* Zoom trigger on image (Desktop only) */}
                      <button 
                        onClick={() => setLightboxPhoto(photo.url)} 
                        className="absolute inset-0 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
                        style={{ background: "rgba(0,0,0,0.15)" }} 
                        aria-label={`Open ${photo.name}`}
                      >
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(255,255,255,0.15)", color: TEXT, backdropFilter: "blur(6px)" }}>
                          <Eye size={13} />
                          Zoom
                        </span>
                      </button>

                      {/* Similarity / Match Badge (Top Left) */}
                      <div 
                        className="absolute left-2 top-2 px-2.5 py-1 rounded-full z-20 flex items-center gap-1 text-[10px] font-extrabold shadow-md" 
                        style={{ 
                          background: "rgba(10, 12, 16, 0.85)", 
                          border: "1px solid rgba(255,255,255,0.08)",
                          backdropFilter: "blur(4px)"
                        }}
                      >
                        {isHighestMatch ? (
                          <span style={{ color: GOLD }}>Best Match</span>
                        ) : (
                          <span style={{ color: GREEN }}>{Math.round(photo.similarity * 100)}% Match</span>
                        )}
                      </div>

                      {/* Mobile Download Button (Bottom Right) */}
                      <button
                        onClick={() => handleDownload(photo.photo_id, photo.url, photo.name, photo.size)}
                        className="absolute right-2 bottom-2 md:hidden z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-md"
                        style={{
                          background: isDownloading ? `rgba(34,197,94,0.85)` : "rgba(10, 12, 16, 0.75)",
                          border: isDownloading ? "1px solid rgba(34,197,94,0.6)" : "1px solid rgba(255,255,255,0.15)",
                          backdropFilter: "blur(8px)",
                          color: isDownloading ? "#fff" : GOLD,
                          transform: isDownloading ? "scale(1.1)" : "scale(1)",
                        }}
                        aria-label={`Download ${photo.name}`}
                      >
                        {isDownloading ? <CheckCircle size={13} /> : <Download size={13} />}
                      </button>
                    </div>

                    {/* Desktop Footer Card Details */}
                    <div className="hidden sm:flex p-3 items-center justify-between gap-2" style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
                      <div className="min-w-0 text-left">
                        <div className="truncate" style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 800 }}>{photo.name}</div>
                        <div style={{ fontSize: "0.68rem", color: GREEN, marginTop: "1px", fontWeight: 700 }}>{Math.round(photo.similarity * 100)}% match</div>
                      </div>
                      <button 
                        onClick={() => handleDownload(photo.photo_id, photo.url, photo.name, photo.size)} 
                        className="w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 hover:opacity-90" 
                        style={{ background: GOLD, color: BG }}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Selection Bar */}
          {selectedPhotoIds.size > 0 && (
            <div 
              className="fixed bottom-[108px] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-2xl p-3 shadow-2xl w-[calc(100%-24px)] max-w-md transition-all duration-300" 
              style={{ 
                background: "rgba(13,15,22,0.95)", 
                border: "1px solid rgba(201, 151, 58, 0.3)", 
                backdropFilter: "blur(20px)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 20px rgba(201, 151, 58, 0.08)"
              }}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Overlapping Previews and Count */}
                <div className="flex items-center gap-2.5">
                  <div className="flex -space-x-3 shrink-0">
                    {selectedPhotosList.slice(0, 3).map((photo, idx) => (
                      <div 
                        key={photo.photo_id} 
                        className="w-8 h-8 rounded-lg overflow-hidden border-2 shrink-0 shadow-lg" 
                        style={{ 
                          borderColor: "#0d0f14",
                          zIndex: 10 - idx
                        }}
                      >
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col text-left">
                    <span style={{ color: TEXT, fontSize: "0.78rem", fontWeight: 800 }}>
                      {selectedPhotoIds.size} Photo{selectedPhotoIds.size > 1 ? "s" : ""} Selected
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.64rem", fontWeight: 600 }}>
                      Ready to download
                    </span>
                  </div>
                </div>

                {/* Download Buttons */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={downloadSelectedPhotosZip} 
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-all duration-150 active:scale-95 hover:bg-white/10" 
                    style={{ 
                      background: "rgba(255,255,255,0.06)", 
                      border: `1px solid rgba(255,255,255,0.08)`, 
                      color: TEXT 
                    }}
                    title="Download ZIP"
                  >
                    <Folder size={14} />
                  </button>
                  <button 
                    onClick={downloadSelectedPhotos} 
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all duration-200 active:scale-95 shadow-lg hover:opacity-95" 
                    style={{ 
                      background: `linear-gradient(180deg, #f7d681 0%, ${GOLD} 100%)`, 
                      color: "#0a0c10",
                      boxShadow: "0 4px 15px rgba(201,151,58,0.25)" 
                    }}
                  >
                    <Download size={13} strokeWidth={2.5} />
                    Download HD Photos
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {lightboxPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <button onClick={() => setLightboxPhoto(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10" style={{ color: TEXT }}>
            <X size={24} />
          </button>
          <img src={lightboxPhoto} alt="Preview" className="max-w-full max-h-[85vh] rounded-xl object-contain" style={{ border: `1px solid ${BORDER}` }} />
        </div>
      )}
    </div>
  );
}

function UserMyEvents({ onViewPhotos }: { onViewPhotos: (evId: string) => void }) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventFromUrl = new URLSearchParams(window.location.search).get("event");
        const data = await api.fetchPublicEvents(eventFromUrl || undefined);
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <SectionHeader title="Available Events" sub="Search your photos in any of these active galleries" />
      {loading ? (
        <p style={{ color: MUTED, fontSize: "0.82rem" }}>Loading events...</p>
      ) : events.length === 0 ? (
        <CardBox className="text-center py-12 flex flex-col items-center gap-3">
          <CalendarDays size={36} style={{ color: MUTED }} />
          <p style={{ color: MUTED, fontSize: "0.85rem" }}>No active events found.</p>
        </CardBox>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((e) => (
            <CardBox key={e.id} className="flex gap-4 p-4 items-center">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "rgba(201,151,58,0.12)", border: `1px solid ${BORDER}` }}>
                <CalendarDays size={24} style={{ color: GOLD }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: TEXT, marginBottom: "2px" }} className="truncate">{e.name}</h3>
                <p style={{ fontSize: "0.75rem", color: MUTED, marginBottom: "12px" }}>Date: {e.date}</p>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "0.75rem", color: GOLD, background: "rgba(201,151,58,0.15)", padding: "2px 8px", borderRadius: "9999px", fontWeight: 600 }}>
                    {e.photos} Photos
                  </span>
                  <button onClick={() => onViewPhotos(e.id)} className="text-xs font-semibold flex items-center gap-1 hover:text-amber-400 transition-colors" style={{ color: GOLD }}>
                    Search Photos <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </CardBox>
          ))}
        </div>
      )}
    </div>
  );
}

function UserDownloads({ userEmail }: { userEmail: string }) {
  const [downloadHistory, setDownloadHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDownloads() {
      if (!userEmail) return;
      try {
        const data = await api.fetchUserDownloads(userEmail);
        setDownloadHistory(data);
      } catch (err) {
        console.error("Failed to load user downloads:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDownloads();
  }, [userEmail]);

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <SectionHeader title="Downloads" sub="Your photo download activity" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <CardBox style={{ padding: "16px" }}>
          <div style={{ fontSize: "0.72rem", color: MUTED, marginBottom: "4px" }}>Total Downloaded</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>
            {loading ? "..." : `${downloadHistory.length} Photos`}
          </div>
        </CardBox>
        <CardBox style={{ padding: "16px" }}>
          <div style={{ fontSize: "0.72rem", color: MUTED, marginBottom: "4px" }}>Active Plan</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: GOLD }}>Unlimited Downloads</div>
        </CardBox>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["ID", "File Name", "Event", "Size", "Downloaded At"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-6" style={{ fontSize: "0.8rem", color: MUTED }}>
                    Loading download activity...
                  </td>
                </tr>
              ) : downloadHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6" style={{ fontSize: "0.8rem", color: MUTED }}>
                    No download history found. Go to "My Photos" and download your face-matched photos!
                  </td>
                </tr>
              ) : (
                downloadHistory.map((dl) => (
                  <tr key={dl.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>DL-{dl.id}</td>
                    <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: TEXT }}>{dl.photo}</td>
                    <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>{dl.event}</td>
                    <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT }}>{dl.size}</td>
                    <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>{dl.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface UserProfileProps {
  currentUser: UserData | null;
  onUpdate: (updated: UserData) => void;
  selfie?: string | null;
}

function UserProfile({ currentUser, onUpdate, selfie }: UserProfileProps) {
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with loaded user data
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhone(currentUser.phone || "");
    }
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.updateUser(currentUser.id, name, currentUser.email, phone);
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full items-stretch animate-fadeIn">
      <div className="flex flex-col items-center text-center w-full mb-2">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: TEXT }}>Profile Settings</h2>
        <p style={{ fontSize: "0.82rem", color: MUTED, marginTop: "4px" }}>Manage your account profile</p>
      </div>
      {error && (
        <div className="p-3.5 rounded-xl text-xs mb-2 text-center w-full" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}
      
      {/* Dynamic Profile Card including Selfie */}
      <CardBox className="flex flex-col md:flex-row items-center gap-6 p-6">
        {/* Left column: Selfie Avatar */}
        <div className="flex flex-col items-center text-center shrink-0">
          {selfie ? (
            <div className="relative w-24 h-24 sm:w-28 sm:h-28">
              <img src={selfie} alt="Profile Selfie" className="w-full h-full rounded-full object-cover shadow-xl" style={{ border: `2.5px solid ${GOLD}` }} />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shadow-md">
                <CheckCircle size={9} />
                Verified
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center gap-1" style={{ background: "rgba(255,255,255,0.02)", border: `1.5px dashed ${BORDER}` }}>
              <User size={30} style={{ color: MUTED }} />
              <span style={{ fontSize: "0.62rem", color: MUTED, fontWeight: 700 }}>No Selfie</span>
            </div>
          )}
          <span className="mt-3 text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(201,151,58,0.12)", color: GOLD }}>
            {currentUser?.role || "Guest"}
          </span>
        </div>

        {/* Right column: Edit Details Form */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col gap-4 w-full text-left">
          <div className="flex flex-col gap-1.5 w-full">
            <label style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 700 }}>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl outline-none"
              style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} required />
          </div>
          
          <div className="flex flex-col gap-1.5 w-full">
            <label style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 700 }}>Phone Number</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl outline-none"
              style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} required />
          </div>
          
          {saved && (
            <div className="p-2.5 rounded-lg text-xs text-center font-bold" style={{ background: "rgba(34,197,94,0.12)", color: GREEN, border: "1px solid rgba(34,197,94,0.18)" }}>
              Profile updated successfully!
            </div>
          )}

          <div className="flex justify-end mt-1.5">
            <GoldBtn type="submit">{loading ? "Saving..." : <><Check size={14} /> Save Profile</>}</GoldBtn>
          </div>
        </form>
      </CardBox>
    </div>
  );
}


// â”€â”€ SUPPORT INQUIRIES PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SupportInquiriesPage() {
  const [messages, setMessages] = useState<ContactMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await api.fetchContactMessages();
      setMessages(data);
    } catch (err: any) {
      console.error("Failed to load support messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this support message?")) return;
    try {
      await api.deleteContactMessage(id);
      loadMessages();
    } catch (err: any) {
      alert("Failed to delete message: " + err.message);
    }
  };

  const filtered = messages.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Support Inquiries"
        sub="View and respond to photographer/client contact form submissions"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search messages..." />
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="text-center py-12" style={{ color: MUTED }}>
            <Loader2 className="animate-spin inline mr-2" size={16} /> Loading inquiries...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUTED }}>
            No support inquiries found.
          </div>
        ) : (
          filtered.map((m) => (
            <CardBox key={m.id} className="w-full flex flex-col gap-3 p-5 animate-fadeIn">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: "rgba(201,151,58,0.18)", color: GOLD }}>
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: TEXT }}>{m.name}</div>
                    <div style={{ fontSize: "0.72rem", color: MUTED }} className="flex items-center gap-1.5">
                      <span>{m.email}</span>
                      <span>-</span>
                      <span>{m.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a href={`mailto:${m.email}?subject=Re: MasterStudio Inquiry`} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all hover:opacity-90" style={{ background: GOLD, color: "#0a0c10" }}>
                    <Mail size={12} /> Reply Email
                  </a>
                  <button onClick={() => handleDelete(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10" style={{ background: "rgba(239,68,68,0.08)" }}>
                    <Trash2 size={13} style={{ color: RED }} />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl text-xs whitespace-pre-wrap leading-relaxed" style={{ background: "#0d0f16", border: `1px solid ${BORDER_SOFT}`, color: TEXT }}>
                {m.message}
              </div>
            </CardBox>
          ))
        )}
      </div>
    </div>
  );
}


// â”€â”€ MANAGE PHOTOGRAPHERS PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ManagePhotographersPage() {
  const [search, setSearch] = useState("");
  const [photographers, setPhotographers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPlan, setNewPlan] = useState("Premium");
  const [newStorageQuotaGb, setNewStorageQuotaGb] = useState(50);
  const [newStudioName, setNewStudioName] = useState("");
  const [welcomeText, setWelcomeText] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<any | null>(null);

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewStudioName("");
    setNewPlan("Premium");
    setNewStorageQuotaGb(50);
  };

  // Editing states
  const [editingPhotographer, setEditingPhotographer] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPlan, setEditPlan] = useState("Premium");
  const [editStatus, setEditStatus] = useState("Active");
  const [editStorageQuotaGb, setEditStorageQuotaGb] = useState(50);

  const loadPhotographers = async () => {
    try {
      const data = await api.fetchUsers();
      setPhotographers(data.filter(u => u.role === "Photographer"));
    } catch (e) {
      console.error("Failed to load photographers:", e);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotographers();
  }, []);

  const handleAddPhotographer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = "P" + Math.floor(1000 + Math.random() * 9000);
      const tempPass = "MS-" + Math.floor(1000 + Math.random() * 9000);
      
      await api.createUser(userId, newName, newEmail, "Photographer", {
        brand_name: newStudioName,
        phone: newPhone,
        temp_password: tempPass,
        must_change_password: true,
        first_login_done: false,
        plan: newPlan,
        storage_quota_gb: newStorageQuotaGb,
        verification_status: "Approved"
      });
      
      const welcomeMsg = `Welcome to MasterStudio!\n\nDear ${newName},\n\nCongratulations! Your Photographer Account has been successfully approved.\n\nLogin Details:\n\nUser ID: ${newEmail}\nTemporary Password: ${tempPass}\n\nImportant:\nFor your security, please login and change your password immediately.\n\nYour Studio Profile and Event Management Dashboard are now ready.\n\nStart creating events, share your QR Code with guests, and deliver photos instantly.\n\nThank you for joining MasterStudio.\n\nTeam MasterStudio`;
      
      setWelcomeText(welcomeMsg);
      setCreatedUser({
        name: newName,
        email: newEmail,
        phone: newPhone,
        userId: userId,
        tempPass: tempPass
      });
      
      closeAddModal();
      loadPhotographers();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleEditClick = (p: any) => {
    setEditingPhotographer(p);
    setEditName(p.name);
    setEditEmail(p.email);
    setEditPhone(p.phone || "");
    setEditPlan(p.plan || "Premium");
    setEditStatus(p.status || "Active");
    setEditStorageQuotaGb(Number(p.storage_quota_gb || 50));
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhotographer) return;
    try {
      await api.updateUser(editingPhotographer.id, editName, editEmail, editPhone, editPlan, editStatus, {
        brand_name: editingPhotographer.brand_name || "",
        brand_rights_text: editingPhotographer.brand_rights_text || "",
        instagram_url: editingPhotographer.instagram_url || "",
        facebook_url: editingPhotographer.facebook_url || "",
        website_url: editingPhotographer.website_url || "",
        whatsapp_url: editingPhotographer.whatsapp_url || "",
        address: editingPhotographer.address || "",
        about_studio: editingPhotographer.about_studio || "",
        storage_quota_gb: editStorageQuotaGb,
      });
      setEditingPhotographer(null);
      loadPhotographers();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteClick = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this photographer account? All their platform access will be removed.")) return;
    try {
      await api.deleteUser(userId);
      loadPhotographers();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleVerificationUpdate = async (userId: string, status: "Pending Verification" | "Verified" | "Rejected") => {
    try {
      await api.updateBrandVerification(userId, status);
      loadPhotographers();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleBrandChangeReview = async (userId: string, action: "approve" | "reject") => {
    try {
      await api.reviewBrandChange(userId, action);
      loadPhotographers();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const filtered = photographers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <SectionHeader title="Manage Photographers" sub="Overview of platform clients and tenants"
        action={<GoldBtn onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Photographer</GoldBtn>} />
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Total Photographers", value: String(photographers.length), color: BLUE, icon: Camera },
          { label: "Active Subscriptions", value: String(photographers.filter(p => p.status !== "Suspended").length), color: GREEN, icon: Star },
          { label: "Allocated Storage", value: `${photographers.reduce((sum, p) => sum + Number(p.storage_quota_gb || 50), 0)} GB`, color: PURPLE, icon: Archive }
        ].map(({ label, value, color, icon: Icon }) => (
          <CardBox key={label} style={{ padding: "16px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{value}</div>
          </CardBox>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search photographers..." />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Photographer ID", "Name", "Login Email & Password", "Phone", "Events", "Storage Quota", "Plan", "Joined", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-6" style={{ fontSize: "0.8rem", color: MUTED }}>Loading photographers...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-6" style={{ fontSize: "0.8rem", color: MUTED }}>No photographers found.</td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const storageQuota = `${Number(p.storage_quota_gb || 50)} GB`;
                  const planTier = p.plan || (p.id === "U002" ? "Premium" : "Enterprise");
                  const isSuspended = p.status === "Suspended";
                  const verification = p.verification_status || "Pending Verification";
                  const hasRequest = Boolean(p.brand_change_request);
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>{p.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: "rgba(201,151,58,0.2)", color: GOLD }}>{p.name[0]}</div>
                          <span style={{ fontSize: "0.8rem", color: TEXT, fontWeight: 600 }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div style={{ fontSize: "0.75rem", color: TEXT }}>{p.email}</div>
                        <div style={{ fontSize: "0.68rem", marginTop: "2.5px" }} className="flex items-center gap-1.5">
                          <Lock size={10} style={{ color: p.first_login_done ? GREEN : GOLD }} />
                          {p.first_login_done ? (
                            <span style={{ color: GREEN }}>Password Set</span>
                          ) : (
                            <span style={{ color: GOLD }}>Temporary password sent</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>{p.phone || "--"}</td>
                      <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 600 }}>{p.events_count ?? 0}</td>
                      <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>{storageQuota}</td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: "0.72rem", color: planTier === "Enterprise" ? PURPLE : GOLD, fontWeight: 600,
                          background: `${planTier === "Enterprise" ? PURPLE : GOLD}20`, padding: "3px 10px", borderRadius: "9999px" }}>{planTier}</span>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.75rem", color: MUTED }}>{p.joined || "Jun 2026"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold w-fit" 
                          style={{ 
                            background: isSuspended ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", 
                            color: isSuspended ? RED : GREEN 
                          }}>
                          {p.status || "Active"}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold w-fit"
                          style={{
                            background: verification === "Verified" ? "rgba(34,197,94,0.12)" : verification === "Rejected" ? "rgba(239,68,68,0.12)" : "rgba(201,151,58,0.12)",
                            color: verification === "Verified" ? GREEN : verification === "Rejected" ? RED : GOLD,
                          }}
                        >
                          {verification}
                        </span>
                        {hasRequest && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold w-fit" style={{ background: "rgba(168,85,247,0.12)", color: PURPLE }}>
                            Brand Request
                          </span>
                        )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {verification !== "Verified" && (
                            <button onClick={() => handleVerificationUpdate(p.id, "Verified")} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(34,197,94,0.15)" }} title="Verify brand"><ShieldCheck size={13} style={{ color: GREEN }} /></button>
                          )}
                          {verification !== "Rejected" && (
                            <button onClick={() => handleVerificationUpdate(p.id, "Rejected")} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(239,68,68,0.15)" }} title="Reject verification"><X size={13} style={{ color: RED }} /></button>
                          )}
                          {hasRequest && (
                            <>
                              <button onClick={() => handleBrandChangeReview(p.id, "approve")} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(201,151,58,0.15)" }} title="Approve brand change"><CheckCircle size={13} style={{ color: GOLD }} /></button>
                              <button onClick={() => handleBrandChangeReview(p.id, "reject")} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(168,85,247,0.15)" }} title="Reject brand change"><AlertCircle size={13} style={{ color: PURPLE }} /></button>
                            </>
                          )}
                          <button onClick={() => handleEditClick(p)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(201,151,58,0.15)" }}><Edit size={13} style={{ color: GOLD }} /></button>
                          <button onClick={() => handleDeleteClick(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(239,68,68,0.15)" }}><Trash2 size={13} style={{ color: RED }} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAddModal} />
          <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md my-auto">
              <CardBox className="w-full flex flex-col gap-4">
                <div className="flex justify-between items-center mb-1">
                  <span style={{ fontWeight: 700, fontSize: "1.05rem", color: TEXT }}>Add New Photographer</span>
                  <button onClick={closeAddModal} type="button" className="p-1 rounded-lg hover:bg-white/5 cursor-pointer">
                    <X size={16} style={{ color: MUTED }} />
                  </button>
                </div>
                <form onSubmit={handleAddPhotographer} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Photographer Name</label>
                    <input type="text" placeholder="e.g. Ramesh Kumar" value={newName} onChange={(e) => setNewName(e.target.value)} required
                      className="w-full px-3 py-2 rounded-xl outline-none focus:border-amber-500 focus:shadow-[0_0_8px_rgba(201,151,58,0.2)] transition-all duration-200"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Studio / Brand Name</label>
                    <input type="text" placeholder="e.g. Royal Photography" value={newStudioName} onChange={(e) => setNewStudioName(e.target.value)} required
                      className="w-full px-3 py-2 rounded-xl outline-none focus:border-amber-500 focus:shadow-[0_0_8px_rgba(201,151,58,0.2)] transition-all duration-200"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Email Address</label>
                    <input type="email" placeholder="e.g. ramesh@gmail.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required
                      className="w-full px-3 py-2 rounded-xl outline-none focus:border-amber-500 focus:shadow-[0_0_8px_rgba(201,151,58,0.2)] transition-all duration-200"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Phone Number (Mobile)</label>
                    <input type="text" placeholder="e.g. +919999988888" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required
                      className="w-full px-3 py-2 rounded-xl outline-none focus:border-amber-500 focus:shadow-[0_0_8px_rgba(201,151,58,0.2)] transition-all duration-200"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Subscription Plan</label>
                    <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl outline-none focus:border-amber-500 focus:shadow-[0_0_8px_rgba(201,151,58,0.2)] transition-all duration-200"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}>
                      <option value="Premium">Premium - Rs 4,999/mo</option>
                      <option value="Enterprise">Enterprise - Rs 9,999/mo</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Storage Quota (GB)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={newStorageQuotaGb}
                        onChange={(e) => setNewStorageQuotaGb(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-xl outline-none focus:border-amber-500 focus:shadow-[0_0_8px_rgba(201,151,58,0.2)] transition-all duration-200"
                        style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}
                      />
                      <span className="shrink-0 rounded-xl px-3 py-2" style={{ background: "rgba(201,151,58,0.1)", border: `1px solid ${BORDER}`, color: GOLD, fontSize: "0.76rem", fontWeight: 800 }}>
                        GB
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <OutlineBtn type="button" onClick={closeAddModal}>Cancel</OutlineBtn>
                    <GoldBtn type="submit"><Check size={14} /> Add & Approve</GoldBtn>
                  </div>
                </form>
              </CardBox>
            </div>
          </div>
        </div>,
        document.body
      )}

      {welcomeText && createdUser && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWelcomeText(null)} />
          <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg my-auto">
              <CardBox className="w-full flex flex-col gap-4">
                <div className="flex justify-between items-center mb-1">
                  <span style={{ fontWeight: 700, fontSize: "1.05rem", color: GREEN }} className="flex items-center gap-1.5">
                    <CheckCircle size={16} /> Photographer Account Created & Approved!
                  </span>
                  <button onClick={() => setWelcomeText(null)} className="p-1 rounded-lg hover:bg-white/5">
                    <X size={16} style={{ color: MUTED }} />
                  </button>
                </div>
                
                <p style={{ fontSize: "0.8rem", color: MUTED }}>
                  Photographer profile matches the welcome message template. Copy or send it directly via WhatsApp:
                </p>

                <div className="p-4 rounded-xl font-mono text-xs overflow-y-auto max-h-[250px] leading-relaxed whitespace-pre-wrap select-all" 
                  style={{ background: "#06080d", border: `1px solid ${BORDER}`, color: TEXT }}>
                  {welcomeText}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <button onClick={() => {
                    navigator.clipboard.writeText(welcomeText);
                    alert("Welcome message copied to clipboard!");
                  }} className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/5" style={{ border: `1px solid ${BORDER}`, color: TEXT }}>
                    Copy Message
                  </button>
                  <button onClick={() => {
                    const cleanPhone = createdUser.phone.replace(/[^\d]/g, "");
                    window.open(`https://wa.me/${cleanPhone.startsWith("91") || cleanPhone.length > 10 ? cleanPhone : "91" + cleanPhone}?text=${encodeURIComponent(welcomeText)}`, "_blank");
                  }} className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110" style={{ background: GREEN, color: "#fff" }}>
                    <Send size={12} /> Send on WhatsApp
                  </button>
                </div>
              </CardBox>
            </div>
          </div>
        </div>,
        document.body
      )}


      {editingPhotographer && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingPhotographer(null)} />
          <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md my-auto">
              <CardBox className="w-full flex flex-col gap-4">
                <div className="flex justify-between items-center mb-1">
                  <span style={{ fontWeight: 700, fontSize: "1.05rem", color: TEXT }}>Edit Photographer</span>
                  <button onClick={() => setEditingPhotographer(null)} className="p-1 rounded-lg hover:bg-white/5">
                    <X size={16} style={{ color: MUTED }} />
                  </button>
                </div>
                <form onSubmit={handleEditSave} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: MUTED }}>Credentials (View Only)</label>
                    <div className="p-3 rounded-xl text-xs font-mono flex flex-col gap-1.5" style={{ background: "#0d0f16", border: `1px solid ${BORDER_SOFT}` }}>
                      <div className="flex justify-between">
                        <span style={{ color: MUTED }}>Login ID:</span>
                        <span style={{ color: TEXT }} className="select-all font-bold">{editingPhotographer.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: MUTED }}>Password:</span>
                        {editingPhotographer.first_login_done ? (
                          <span style={{ color: GREEN, fontWeight: 700 }}>Permanent Password Set</span>
                        ) : (
                          <span style={{ color: GOLD }} className="font-bold">Temporary password already sent</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Photographer Name</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required
                      className="w-full px-3 py-2 rounded-xl outline-none"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Email Address</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required
                      className="w-full px-3 py-2 rounded-xl outline-none"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Phone Number</label>
                    <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl outline-none"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Subscription Plan</label>
                    <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl outline-none"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}>
                      <option value="Premium">Premium - Rs 4,999/mo</option>
                      <option value="Enterprise">Enterprise - Rs 9,999/mo</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Storage Quota (GB)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={editStorageQuotaGb}
                        onChange={(e) => setEditStorageQuotaGb(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-xl outline-none"
                        style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}
                      />
                      <span className="shrink-0 rounded-xl px-3 py-2" style={{ background: "rgba(201,151,58,0.1)", border: `1px solid ${BORDER}`, color: GOLD, fontSize: "0.76rem", fontWeight: 800 }}>
                        GB
                      </span>
                    </div>
                    <div style={{ color: MUTED, fontSize: "0.68rem", lineHeight: 1.45 }}>
                      Uploads will stop automatically when this photographer reaches the quota.
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "0.78rem", color: TEXT }}>Account Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl outline-none"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}>
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <OutlineBtn onClick={() => setEditingPhotographer(null)}>Cancel</OutlineBtn>
                    <GoldBtn><Check size={14} /> Save Changes</GoldBtn>
                  </div>
                </form>
              </CardBox>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// â”€â”€ STORAGE MANAGEMENT PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StorageManagementPage() {
  const [report, setReport] = useState<any | null>(null);
  const [policy, setPolicy] = useState<any | null>(null);
  const [cleanupPreview, setCleanupPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [storageReport, storagePolicy] = await Promise.all([
        api.fetchStorageReport(),
        api.fetchStoragePolicy(),
      ]);
      setReport(storageReport);
      setPolicy(storagePolicy);
    } catch (err) {
      console.error("Error loading storage metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const savePolicy = async () => {
    if (!policy) return;
    try {
      setSaving(true);
      const saved = await api.saveStoragePolicy(policy);
      setPolicy(saved);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save storage policy");
    } finally {
      setSaving(false);
    }
  };

  const previewCleanup = async () => {
    const result = await api.cleanupOriginals(true, policy?.delete_originals_after_days);
    setCleanupPreview(result);
  };

  const runCleanup = async () => {
    if (!cleanupPreview || cleanupPreview.eligible_photos === 0) return;
    if (!window.confirm(`Delete original files for ${cleanupPreview.eligible_photos} photos and keep previews only?`)) return;
    const result = await api.cleanupOriginals(false, policy?.delete_originals_after_days);
    setCleanupPreview(result);
    await loadData();
  };

  const tenantRows = [...(report?.tenants || [])].sort((a, b) => b.used_bytes - a.used_bytes);
  const pieData = tenantRows.length > 0
    ? tenantRows.map((tenant, idx) => ({
        name: tenant.photographer_name,
        value: Math.max(0.001, tenant.used_bytes / (1024 * 1024 * 1024)),
        color: [GOLD, BLUE, PURPLE, GREEN, "#f43f5e", "#06b6d4"][idx % 6],
      }))
    : [{ name: "Free", value: 1, color: "rgba(255,255,255,0.06)" }];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px] animate-fadeIn">
        <Loader2 className="animate-spin" size={36} style={{ color: GOLD }} />
        <p className="text-xs mt-3" style={{ color: MUTED }}>Loading storage metrics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <SectionHeader title="Storage Management" sub="Real usage, quota warnings, and cleanup policy" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardBox className="flex flex-col justify-between">
          <div>
            <div style={{ fontSize: "0.72rem", color: MUTED }}>Total Used Storage</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: GOLD, marginTop: "4px" }}>
              {report?.total_used || "0 KB"}
            </div>
            <div style={{ fontSize: "0.7rem", color: MUTED }}>Out of {report?.total_quota || "0 KB"} allocated quota</div>
          </div>
          <div className="mt-4">
            <div className="rounded-full overflow-hidden" style={{ height: "8px", background: "rgba(255,255,255,0.08)" }}>
              <div style={{ width: `${report?.percent || 0}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, #e8b84b)` }} />
            </div>
            <div className="flex justify-between text-xs mt-2" style={{ color: MUTED }}>
              <span>{report?.percent || 0}% Used</span>
              <span>{report?.free || "0 KB"} Free</span>
            </div>
          </div>
        </CardBox>

        <CardBox>
          <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "8px" }}>Usage Breakdown by Tenant</div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                {pieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
              </Pie>
              <Tooltip formatter={(v) => `${v} GB`} contentStyle={{ background: "#1c2030", border: `1px solid ${BORDER}`, borderRadius: "10px", fontSize: "0.75rem" }} />
            </PieChart>
          </ResponsiveContainer>
        </CardBox>

        <CardBox>
          <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "8px" }}>Lean Storage Policy</div>
          <div className="flex flex-col gap-2">
            {[
              ["Auto archive", `${policy?.auto_archive_days || 45} days`],
              ["Delete originals", `${policy?.delete_originals_after_days || 90} days`],
              ["Warning", `${policy?.warning_threshold_percent || 80}%`],
              ["Critical", `${policy?.critical_threshold_percent || 95}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-xs py-1" style={{ color: MUTED, borderBottom: `1px solid ${BORDER_SOFT}` }}>
                <span>{label}</span>
                <span style={{ color: TEXT, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </CardBox>
      </div>

      {policy && (
        <CardBox>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div style={{ color: TEXT, fontWeight: 700 }}>Storage Cleanup Controls</div>
              <div style={{ color: MUTED, fontSize: "0.75rem", marginTop: "3px" }}>Keep previews for guest/client browsing, remove old originals to save VPS disk.</div>
            </div>
            <GoldBtn type="button" onClick={savePolicy}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Policy</GoldBtn>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              ["Auto Archive Days", "auto_archive_days", 7, 365],
              ["Delete Originals After", "delete_originals_after_days", 7, 730],
              ["Warning %", "warning_threshold_percent", 50, 99],
              ["Critical %", "critical_threshold_percent", 60, 100],
            ].map(([label, key, min, max]) => (
              <label key={String(key)} className="flex flex-col gap-1">
                <span style={{ color: MUTED, fontSize: "0.72rem" }}>{label}</span>
                <input
                  type="number"
                  min={Number(min)}
                  max={Number(max)}
                  value={policy[key as string] || ""}
                  onChange={(e) => setPolicy({ ...policy, [key as string]: Number(e.target.value) })}
                  className="px-3 py-2 rounded-xl outline-none"
                  style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <OutlineBtn onClick={previewCleanup}><Search size={14} /> Preview Cleanup</OutlineBtn>
            <button
              onClick={runCleanup}
              disabled={!cleanupPreview || cleanupPreview.eligible_photos === 0}
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-40"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: RED }}
            >
              <Trash2 size={14} /> Delete Old Originals
            </button>
            {cleanupPreview && (
              <span style={{ color: MUTED, fontSize: "0.76rem" }}>
                {cleanupPreview.eligible_photos} photos eligible, reclaim about {cleanupPreview.reclaimable}.
              </span>
            )}
          </div>
        </CardBox>
      )}

      <CardBox>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "12px" }}>Tenant Storage Distribution</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Tenant / Photographer", "Allocated Limit", "Used Storage", "Usage %", "Photos Count", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenantRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center" style={{ fontSize: "0.8rem", color: MUTED }}>
                    No tenant storage data yet.
                  </td>
                </tr>
              ) : tenantRows.map((tenant) => {
                const warningColor = tenant.warning_level === "critical" ? RED : tenant.warning_level === "warning" ? GOLD : GREEN;
                return (
                  <tr key={tenant.photographer_id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.01]">
                    <td className="px-4 py-3" style={{ fontSize: "0.8rem", color: TEXT, fontWeight: 500 }}>
                      {tenant.photographer_name}
                      <div style={{ color: MUTED, fontSize: "0.68rem" }}>{tenant.photographer_email}</div>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: MUTED }}>{tenant.quota_gb} GB</td>
                    <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 600 }}>
                      {tenant.used}
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: "120px" }}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: "5px", background: "rgba(255,255,255,0.08)" }}>
                          <div style={{ width: `${tenant.percent}%`, height: "100%", background: warningColor }} />
                        </div>
                        <span style={{ fontSize: "0.7rem", color: warningColor }}>{tenant.percent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT }}>{tenant.photo_count}</td>
                    <td className="px-4 py-3"><span style={{ fontSize: "0.7rem", background: tenant.status === "Active" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: tenant.status === "Active" ? GREEN : RED, padding: "2px 8px", borderRadius: "9999px" }}>{tenant.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBox>
    </div>
  );
}

// â”€â”€ ANALYTICS PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AnalyticsPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedUsers, fetchedSearchLogs, fetchedDownloads, fetchedPayments] = await Promise.all([
          api.fetchUsers(),
          api.fetchSearchLogs(),
          api.fetchAllDownloads(),
          api.fetchTransactions()
        ]);
        setUsers(fetchedUsers);
        setSearchLogs(fetchedSearchLogs);
        setDownloads(fetchedDownloads);
        setPayments(fetchedPayments);
      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalUsers = users.length;
  const totalMatches = searchLogs.reduce((sum, log) => sum + (log.photos || 0), 0);

  const successfulSearches = searchLogs.filter(log => (log.photos || 0) > 0).length;
  const successRate = searchLogs.length > 0 
    ? ((successfulSearches / searchLogs.length) * 100).toFixed(1) 
    : "100.0";

  const getMonthName = (dateStr: string) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const m of months) {
      if (dateStr.includes(m)) return m;
    }
    return null;
  };

  const parseAmount = (amountStr: string) => {
    const cleaned = amountStr.replace(/[^\d]/g, "");
    return parseInt(cleaned) || 0;
  };

  const getPast6Months = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const list = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(months[d.getMonth()]);
    }
    return list;
  };

  const last6Months = getPast6Months();
  const analyticsData = last6Months.map(month => {
    const searchesCount = searchLogs.filter(log => {
      const m = getMonthName(log.time || "");
      return m === month;
    }).length;

    const downloadsCount = downloads.filter(dl => {
      const m = getMonthName(dl.time || "");
      return m === month;
    }).length;

    const revenueSum = payments.filter(p => {
      const m = getMonthName(p.date || "");
      return m === month && p.status === "Paid";
    }).reduce((sum, p) => sum + parseAmount(p.amount), 0);

    return {
      name: month,
      searches: searchesCount,
      downloads: downloadsCount,
      revenue: revenueSum
    };
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px] animate-fadeIn">
        <Loader2 className="animate-spin" size={36} style={{ color: GOLD }} />
        <p className="text-xs mt-3" style={{ color: MUTED }}>Loading analytics metrics...</p>
      </div>
    );
  }

  const stats = [
    { label: "Total Platform Users", value: totalUsers.toLocaleString(), icon: Users, color: BLUE },
    { label: "AI Matches Generated", value: totalMatches.toLocaleString(), icon: Cpu, color: GOLD },
    { label: "Search Success Rate", value: `${successRate}%`, icon: CheckCircle, color: GREEN },
    { label: "Avg Search Time", value: "0.8s", icon: Zap, color: PURPLE }
  ];

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <SectionHeader title="Platform Analytics" sub="Aggregate system-wide metrics and growth charts" />
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <CardBox key={label} style={{ padding: "16px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{value}</div>
          </CardBox>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardBox>
          <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "12px" }}>Platform Search & Download Growth</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={analyticsData}>
              <defs>
                <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GOLD} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1c2030", border: `1px solid ${BORDER}`, borderRadius: "10px", fontSize: "0.75rem" }} labelStyle={{ color: TEXT }} />
              <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
              <Area type="monotone" dataKey="searches" stroke={GREEN} strokeWidth={2} fill="url(#searchGrad)" name="Searches" />
              <Area type="monotone" dataKey="downloads" stroke={GOLD} strokeWidth={2} fill="url(#dlGrad)" name="Downloads" />
            </AreaChart>
          </ResponsiveContainer>
        </CardBox>

        <CardBox>
          <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "12px" }}>Platform Revenue Growth (INR)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `Rs ${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#1c2030", border: `1px solid ${BORDER}`, borderRadius: "10px", fontSize: "0.75rem" }} labelStyle={{ color: TEXT }} />
              <Line type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={3} dot={{ stroke: GOLD, strokeWidth: 2, r: 4 }} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </CardBox>
      </div>
    </div>
  );
}

// COMMUNICATION SETTINGS PAGE
function SystemSettingsPage() {
  const [modelThreshold, setModelThreshold] = useState("0.65");
  const [enableCache, setEnableCache] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [maintMode, setMaintMode] = useState(false);

  // WhatsApp Gateway Settings (Meta API config)
  const [whatsappMethod, setWhatsappMethod] = useState("Manual"); // "Manual" or "Automated"
  const [waProvider, setWaProvider] = useState("Fast2SMS");
  const [waEnabled, setWaEnabled] = useState(false);
  const [waApiToken, setWaApiToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  const [waWelcomeTemplateName, setWaWelcomeTemplateName] = useState("");
  const [waOtpTemplateName, setWaOtpTemplateName] = useState("");
  const [waGalleryTemplateName, setWaGalleryTemplateName] = useState("");
  const [waLanguageCode, setWaLanguageCode] = useState("en_US");
  const [waDailyLimit, setWaDailyLimit] = useState(100);
  const [waTestMobile, setWaTestMobile] = useState("");
  const [notifyPhotographerApproval, setNotifyPhotographerApproval] = useState(true);
  const [notifyGuestOtp, setNotifyGuestOtp] = useState(false);
  const [notifyGalleryReady, setNotifyGalleryReady] = useState(false);
  const [waNotes, setWaNotes] = useState("");

  const [showSecret, setShowSecret] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const isFast2Sms = waProvider === "Fast2SMS";

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="relative w-11 h-6 rounded-full transition-all duration-200"
      style={{ background: value ? GOLD : "rgba(255,255,255,0.12)" }}>
      <span className="absolute top-1 w-4 h-4 rounded-full transition-all duration-200"
        style={{ background: "#fff", left: value ? "calc(100% - 20px)" : "4px" }} />
    </button>
  );

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await api.fetchWhatsAppSettings();
        setWhatsappMethod(data.method || "Manual");
        setWaProvider(data.provider || "Fast2SMS");
        setWaEnabled(Boolean(data.enabled));
        setWaApiToken(data.api_token || "");
        setWaPhoneNumberId(data.phone_number_id || "");
        setWaBusinessAccountId(data.business_account_id || "");
        setWaWelcomeTemplateName(data.welcome_template_name || "");
        setWaOtpTemplateName(data.otp_template_name || "");
        setWaGalleryTemplateName(data.gallery_template_name || "");
        setWaLanguageCode(data.language_code || "en_US");
        setWaDailyLimit(Number(data.daily_limit || 100));
        setWaTestMobile(data.test_mobile || "");
        setNotifyPhotographerApproval(data.notify_photographer_approval ?? true);
        setNotifyGuestOtp(Boolean(data.notify_guest_otp));
        setNotifyGalleryReady(Boolean(data.notify_gallery_ready));
        setWaNotes(data.notes || "");
      } catch (err) {
        console.error("Failed to load WhatsApp settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await api.saveWhatsAppSettings({
        method: whatsappMethod,
        provider: waProvider,
        enabled: waEnabled,
        api_token: waApiToken,
        phone_number_id: waPhoneNumberId,
        business_account_id: waBusinessAccountId,
        welcome_template_name: waWelcomeTemplateName,
        otp_template_name: waOtpTemplateName,
        gallery_template_name: waGalleryTemplateName,
        language_code: waLanguageCode,
        daily_limit: waDailyLimit,
        test_mobile: waTestMobile,
        notify_photographer_approval: notifyPhotographerApproval,
        notify_guest_otp: notifyGuestOtp,
        notify_gallery_ready: notifyGalleryReady,
        notes: waNotes,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save WhatsApp settings:", err);
      alert("Failed to save WhatsApp settings. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin" style={{ color: GOLD }} size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full items-stretch animate-fadeIn pb-10">
      <div className="flex flex-col items-center text-center w-full mb-2">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: TEXT }}>Communication Settings</h2>
        <p style={{ fontSize: "0.82rem", color: MUTED, marginTop: "4px" }}>Manual WhatsApp now, Fast2SMS OTP ready for private pilot</p>
      </div>
      
      {/* AI Model Settings */}
      <CardBox className="flex flex-col items-center text-center gap-4">
        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: TEXT }}>AI Recognition Model</div>
        <div className="flex flex-col gap-2 items-center w-full max-w-md">
          <label style={{ fontSize: "0.78rem", color: MUTED }}>Similarity Match Threshold (Cosine similarity)</label>
          <select value={modelThreshold} onChange={(e) => setModelThreshold(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl outline-none text-center"
            style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem", textAlignLast: "center" }}>
            <option value="0.55">0.55 - Relaxed Match</option>
            <option value="0.65">0.65 - Default Recommended</option>
            <option value="0.75">0.75 - Strict Match</option>
          </select>
        </div>
      </CardBox>

      {/* WhatsApp Gateway Settings (Meta API config) */}
      <CardBox className="flex flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between gap-3">
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: TEXT }}>WhatsApp Automation Control</div>
            <div style={{ fontSize: "0.74rem", color: MUTED, marginTop: "3px" }}>Keep manual now, switch automation on when demand grows</div>
          </div>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: waEnabled ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${waEnabled ? "rgba(34,197,94,0.25)" : BORDER_SOFT}` }}>
            <span style={{ color: waEnabled ? GREEN : MUTED, fontSize: "0.72rem", fontWeight: 800 }}>{waEnabled ? "LIVE" : "OFF"}</span>
            <Toggle value={waEnabled} onChange={() => setWaEnabled(!waEnabled)} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: "0.75rem", color: MUTED }}>Notification Method</label>
            <select value={whatsappMethod} onChange={(e) => setWhatsappMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}>
              <option value="Manual">Manual Redirect (Web Links - Free)</option>
              <option value="Automated">Automated SMS / WhatsApp API</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: "0.75rem", color: MUTED }}>Provider</label>
            <select value={waProvider} onChange={(e) => setWaProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}>
              <option value="Fast2SMS">Fast2SMS</option>
              <option value="Meta Cloud API">Meta Cloud API</option>
              <option value="Interakt">Interakt</option>
              <option value="AiSensy">AiSensy</option>
              <option value="WATI">WATI</option>
              <option value="Manual Provider">Manual Provider</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">

          {whatsappMethod === "Manual" ? (
            <div className="p-3.5 rounded-xl text-xs" style={{ background: "rgba(201,151,58,0.06)", border: `1px dashed ${BORDER}`, color: MUTED, lineHeight: 1.5 }}>
              <span style={{ color: GOLD, fontWeight: 600 }}>Manual Redirect Mode:</span> Welcome messages use WhatsApp web links. Admin clicks send, WhatsApp opens, and the message can be sent without Meta API cost or approval.
            </div>
          ) : (
            <>
              {!waEnabled && (
                <div className="p-3.5 rounded-xl text-xs" style={{ background: "rgba(59,130,246,0.07)", border: "1px dashed rgba(59,130,246,0.22)", color: MUTED, lineHeight: 1.5 }}>
                  <span style={{ color: BLUE, fontWeight: 700 }}>Setup Mode:</span> Fill provider details now. Messages will not auto-send until the LIVE switch is enabled.
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label style={{ fontSize: "0.75rem", color: MUTED }}>{isFast2Sms ? "Fast2SMS API Key" : "Meta API Token (Permanent System Access Token)"}</label>
                <div className="relative">
                  <input type={showSecret ? "text" : "password"} value={waApiToken} onChange={(e) => setWaApiToken(e.target.value)}
                    placeholder={isFast2Sms ? "Paste Fast2SMS authorization key" : ""}
                    className="w-full px-3 py-2 pr-10 rounded-xl outline-none"
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  <button type="button" onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-2.5 text-xs focus:outline-none" style={{ color: GOLD }}>
                    {showSecret ? <X size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {!isFast2Sms && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label style={{ fontSize: "0.75rem", color: MUTED }}>Phone Number ID</label>
                    <input type="text" value={waPhoneNumberId} onChange={(e) => setWaPhoneNumberId(e.target.value)}
                      placeholder="e.g. 102938475610293"
                      className="w-full px-3 py-2 rounded-xl outline-none"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label style={{ fontSize: "0.75rem", color: MUTED }}>Business Account ID</label>
                    <input type="text" value={waBusinessAccountId} onChange={(e) => setWaBusinessAccountId(e.target.value)}
                      placeholder="Meta WABA ID"
                      className="w-full px-3 py-2 rounded-xl outline-none"
                      style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: "0.75rem", color: MUTED }}>Welcome Template</label>
                  <input type="text" value={waWelcomeTemplateName} onChange={(e) => setWaWelcomeTemplateName(e.target.value)}
                    placeholder="photographer_welcome"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: "0.75rem", color: MUTED }}>OTP Template</label>
                  <input type="text" value={waOtpTemplateName} onChange={(e) => setWaOtpTemplateName(e.target.value)}
                    placeholder="guest_otp"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: "0.75rem", color: MUTED }}>Gallery Template</label>
                  <input type="text" value={waGalleryTemplateName} onChange={(e) => setWaGalleryTemplateName(e.target.value)}
                    placeholder="gallery_ready"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: "0.75rem", color: MUTED }}>Language Code</label>
                  <input type="text" value={waLanguageCode} onChange={(e) => setWaLanguageCode(e.target.value)}
                    placeholder="en_US"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: "0.75rem", color: MUTED }}>Daily Send Limit</label>
                  <input type="number" min={1} max={10000} value={waDailyLimit} onChange={(e) => setWaDailyLimit(Number(e.target.value || 100))}
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: "0.75rem", color: MUTED }}>Test Mobile</label>
                  <input type="tel" value={waTestMobile} onChange={(e) => setWaTestMobile(e.target.value.replace(/\D/g, "").slice(0, 15))}
                    placeholder="9198xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
                </div>
              </div>

              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER_SOFT}` }}>
                <div style={{ fontSize: "0.78rem", color: TEXT, fontWeight: 700, marginBottom: "8px" }}>Automation Triggers</div>
                {[
                  { label: "Photographer approval welcome message", value: notifyPhotographerApproval, toggle: () => setNotifyPhotographerApproval(!notifyPhotographerApproval) },
                  { label: "Guest OTP delivery through WhatsApp", value: notifyGuestOtp, toggle: () => setNotifyGuestOtp(!notifyGuestOtp) },
                  { label: "Gallery ready / new photos notification", value: notifyGalleryReady, toggle: () => setNotifyGalleryReady(!notifyGalleryReady) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 py-2" style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
                    <span style={{ color: MUTED, fontSize: "0.76rem" }}>{item.label}</span>
                    <Toggle value={item.value} onChange={item.toggle} />
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl text-[11px]" style={{ background: "rgba(34,197,94,0.06)", border: `1px dashed rgba(34,197,94,0.2)`, color: MUTED, lineHeight: 1.4 }}>
                <span style={{ color: GREEN, fontWeight: 600 }}>{isFast2Sms ? "Fast2SMS Ready:" : "Automation Ready:"}</span> {isFast2Sms ? "For pilot, keep daily limit low and enable only Guest OTP delivery. Each OTP consumes SMS credit." : "Use this after validation. Templates must be approved in your provider dashboard before enabling LIVE mode."}
              </div>
            </>
          )}

          <div className="flex flex-col gap-1">
            <label style={{ fontSize: "0.75rem", color: MUTED }}>Admin Notes</label>
            <textarea value={waNotes} onChange={(e) => setWaNotes(e.target.value)}
              placeholder="Provider account status, template approval notes, pricing plan, launch checklist..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl outline-none resize-none"
              style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }} />
          </div>
        </div>
      </CardBox>

      {/* Platform Features Toggle */}
      <CardBox className="flex flex-col items-center gap-4">
        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: TEXT }} className="text-center w-full">Future Controls</div>
        
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between py-3.5" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
            <div>
              <div style={{ fontSize: "0.82rem", color: TEXT, fontWeight: 500 }}>Face Vector Caching</div>
              <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "2px" }}>Keep disabled until real event volume needs it</div>
            </div>
            <Toggle value={enableCache} onChange={() => setEnableCache(!enableCache)} />
          </div>

          <div className="flex items-center justify-between py-3.5" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
            <div>
              <div style={{ fontSize: "0.82rem", color: TEXT, fontWeight: 500 }}>Daily Database Backups</div>
              <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "2px" }}>Turn on when first real customers start using events</div>
            </div>
            <Toggle value={autoBackup} onChange={() => setAutoBackup(!autoBackup)} />
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div>
              <div style={{ fontSize: "0.82rem", color: TEXT, fontWeight: 500 }}>Maintenance Mode</div>
              <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: "2px" }}>Block guest search and uploads during system updates</div>
            </div>
            <Toggle value={maintMode} onChange={() => setMaintMode(!maintMode)} />
          </div>
        </div>
      </CardBox>

      {/* Save Settings Button */}
      <div className="flex flex-col items-center gap-2 mt-2 w-full max-w-md mx-auto">
        <button onClick={handleSaveSettings} className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110"
          style={{ background: GOLD, color: "#fff", boxShadow: "0 4px 15px rgba(201, 151, 58, 0.25)" }}>
          <CheckCircle size={15} /> Save Communication Settings
        </button>
        {saveSuccess && (
          <span style={{ color: GREEN, fontSize: "0.75rem", fontWeight: 600 }} className="animate-fadeIn">
            Settings saved successfully.
          </span>
        )}
      </div>
    </div>
  );
}

// â”€â”€ LEADS & ANALYTICS PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LeadsPage({ photographerEmail }: { photographerEmail: string }) {
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [stats, setStats] = useState<LeadStatsData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [lData, sData] = await Promise.all([
          api.fetchPhotographerLeads(photographerEmail),
          api.fetchPhotographerStats(photographerEmail)
        ]);
        setLeads(lData);
        setStats(sData);
      } catch (err) {
        console.error("Failed to load leads data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [photographerEmail]);

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.mobile.includes(search) ||
    l.event_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const dataToExport = filtered.map(l => ({
      "Guest Name": l.name || "Anonymous",
      "Mobile Number": l.mobile,
      "Event Joined": l.event_name,
      "Search Count": l.search_count,
      "Joined Date": l.created_at
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guest Leads");
    XLSX.writeFile(wb, `masterstudio_leads_${Date.now()}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin" style={{ color: GOLD }} size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <SectionHeader 
        title="Guest Leads & Analytics" 
        sub="Monitor verified guest registrations, QR scans, and search metrics"
        action={
          <GoldBtn onClick={handleExport}>
            <Download size={14} /> Export Leads (.xlsx)
          </GoldBtn>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Guest Leads", value: String(stats?.total_leads ?? 0), color: BLUE, icon: Users },
          { label: "Total QR / Face Scans", value: String(stats?.total_scans ?? 0), color: GOLD, icon: Search },
          { label: "Active Events", value: String(stats?.active_events ?? 0), color: GREEN, icon: CalendarDays },
          { label: "Storage Used", value: `${stats?.storage_used_gb ?? 0} GB`, color: PURPLE, icon: Archive },
        ].map(({ label, value, color, icon: Icon }) => (
          <CardBox key={label} style={{ padding: "16px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: TEXT }}>{value}</div>
          </CardBox>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search leads by name, mobile, event..." />

      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Guest Name", "Mobile Number", "Event", "Face Scans", "Access Time"].map((h) => (
                  <th key={h} className="px-4 py-3" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-sm" style={{ color: MUTED }}>
                    No guest leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02] text-sm">
                    <td className="px-4 py-3 font-semibold" style={{ color: TEXT }}>
                      {l.name || "Anonymous Guest"}
                    </td>
                    <td className="px-4 py-3 select-all" style={{ color: TEXT }}>
                      {l.mobile}
                    </td>
                    <td className="px-4 py-3" style={{ color: MUTED }}>
                      {l.event_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(201,151,58,0.12)", color: GOLD }}>
                        {l.search_count} scans
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: MUTED }}>
                      {l.created_at}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── BILLING & PLANS PAGE ────────────────────────────────
function BillingPlansPage({ photographerEmail }: { photographerEmail: string }) {
  const [history, setHistory] = useState<PaymentTransactionData[]>([]);
  const [storageSummary, setStorageSummary] = useState<StorageSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const [data, storage] = await Promise.all([
          api.fetchPaymentHistory(photographerEmail),
          api.fetchStorageSummary(photographerEmail),
        ]);
        setHistory(data);
        setStorageSummary(storage);
      } catch (err) {
        console.error("Failed to load billing data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [photographerEmail]);

  const storageUsedBytes = storageSummary?.used_bytes ?? 0;
  const storageQuotaBytes = storageSummary?.quota_bytes ?? (50 * 1024 * 1024 * 1024);
  const storageRemainingBytes = Math.max(0, storageQuotaBytes - storageUsedBytes);
  const storageRemaining = storageRemainingBytes >= 1024 * 1024 * 1024
    ? `${(storageRemainingBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    : `${(storageRemainingBytes / (1024 * 1024)).toFixed(1)} MB`;
  const storagePercent = storageSummary?.percent ?? 0;

  const pricingPlans = [
    {
      id: "launch",
      name: "SaaS Launch Offer",
      tagline: "Early Bird Special",
      price: "₹0",
      period: "forever free",
      features: [
        { text: "50 GB Premium Cloud Storage", included: true },
        { text: "Unlimited Face Recognition", included: true },
        { text: "Custom Logo & Event Branding", included: true },
        { text: "Client Album Photo Selections", included: true },
        { text: "Manual WhatsApp/SMS Links", included: true },
        { text: "Standard Web-Link Portals", included: true },
        { text: "White-label Gallery Domain", included: false },
        { text: "Automated WhatsApp API", included: false },
      ],
      current: true,
      buttonText: "Current Plan",
      accentColor: GOLD,
      accentGlow: "rgba(201,151,58,0.25)",
      gradientFrom: "rgba(201,151,58,0.08)",
      gradientTo: "rgba(201,151,58,0.02)",
      icon: Zap,
    },
    {
      id: "premium",
      name: "Studio Premium",
      tagline: "Most Popular",
      price: "₹1,499",
      period: "/ month",
      features: [
        { text: "150 GB Premium Cloud Storage", included: true },
        { text: "Everything in Launch Offer", included: true },
        { text: "White-label Gallery Domain", included: true },
        { text: "Automated WhatsApp Templates", included: true },
        { text: "Watermark-free HD Downloads", included: true },
        { text: "Priority AI GPU Processing", included: true },
        { text: "Custom Domain Mapping", included: false },
        { text: "Dedicated VIP Support", included: false },
      ],
      current: false,
      buttonText: "Upgrade Now",
      accentColor: BLUE,
      accentGlow: "rgba(59,130,246,0.25)",
      gradientFrom: "rgba(59,130,246,0.08)",
      gradientTo: "rgba(59,130,246,0.02)",
      icon: Star,
    },
    {
      id: "elite",
      name: "Studio Elite",
      tagline: "Enterprise Grade",
      price: "₹2,999",
      period: "/ month",
      features: [
        { text: "500 GB Premium Cloud Storage", included: true },
        { text: "Everything in Premium", included: true },
        { text: "Fully Custom Domain Mapping", included: true },
        { text: "WhatsApp with Client Branding", included: true },
        { text: "Contract & Invoice PDF Gen", included: true },
        { text: "Dedicated VIP Support", included: true },
        { text: "SLA Guaranteed Uptime", included: true },
        { text: "Custom Integrations", included: true },
      ],
      current: false,
      buttonText: "Upgrade Now",
      accentColor: PURPLE,
      accentGlow: "rgba(168,85,247,0.25)",
      gradientFrom: "rgba(168,85,247,0.08)",
      gradientTo: "rgba(168,85,247,0.02)",
      icon: Shield,
    }
  ];

  const billingFaqs = [
    { q: "Can I switch plans at any time?", a: "Yes — upgrades take effect immediately and you'll be prorated for the remaining period. Downgrades apply at the start of your next billing cycle." },
    { q: "What happens if I exceed my storage limit?", a: "New uploads will be blocked once you reach your storage quota. Existing photos remain accessible. Contact admin or upgrade your plan for more storage." },
    { q: "Is there a limit on face recognition searches?", a: "No — all plans include unlimited face recognition queries. The Premium and Elite plans include priority GPU processing for faster results." },
    { q: "How do I download guest details or analytics?", a: "Navigate to the 'Users & Guests' tab to export guest registration data, selfie scan logs, and download history in CSV or Excel format." },
    { q: "Can I pay annually for a discount?", a: "Annual plans with discounted pricing are coming soon. Currently all paid plans are billed monthly." },
  ];

  // Circular gauge SVG params
  const gaugeRadius = 58;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeStrokeDash = (storagePercent / 100) * gaugeCircumference;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <Loader2 className="animate-spin" style={{ color: GOLD }} size={36} />
        <span style={{ color: MUTED, fontSize: "0.82rem" }}>Loading billing data...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 animate-fadeIn pb-12">
      {/* Inline styles for billing-specific animations */}
      <style>{`
        @keyframes billing-glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(201,151,58,0.15), inset 0 0 20px rgba(201,151,58,0.03); }
          50% { box-shadow: 0 0 35px rgba(201,151,58,0.25), inset 0 0 30px rgba(201,151,58,0.06); }
        }
        @keyframes billing-gauge-fill {
          from { stroke-dasharray: 0 ${gaugeCircumference}; }
          to { stroke-dasharray: ${gaugeStrokeDash} ${gaugeCircumference - gaugeStrokeDash}; }
        }
        @keyframes billing-float-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes billing-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .billing-plan-card {
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .billing-plan-card:hover {
          transform: translateY(-6px);
        }
        .billing-faq-item {
          transition: all 0.25s ease;
        }
        .billing-faq-item:hover {
          background: rgba(255,255,255,0.03) !important;
        }
      `}</style>

      {/* ── Page Header ── */}
      <SectionHeader
        title="Billing & Plans"
        sub="Manage your subscription, track storage usage, and review invoices"
      />

      {/* ── Current Plan Hero Banner ── */}
      <div
        style={{
          background: `linear-gradient(135deg, rgba(201,151,58,0.1) 0%, rgba(13,15,22,0.98) 50%, rgba(201,151,58,0.06) 100%)`,
          border: `1.5px solid rgba(201,151,58,0.25)`,
          borderRadius: "20px",
          padding: "28px 32px",
          position: "relative",
          overflow: "hidden",
          animation: "billing-glow-pulse 4s ease-in-out infinite",
        }}
      >
        {/* Decorative corner gradient */}
        <div style={{
          position: "absolute", top: 0, right: 0, width: "200px", height: "200px",
          background: "radial-gradient(circle at top right, rgba(201,151,58,0.12), transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, width: "150px", height: "150px",
          background: "radial-gradient(circle at bottom left, rgba(201,151,58,0.08), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5" style={{ position: "relative", zIndex: 1 }}>
          <div className="flex items-start gap-4">
            <div style={{
              width: "52px", height: "52px", borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(201,151,58,0.2), rgba(201,151,58,0.08))",
              border: "1px solid rgba(201,151,58,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Zap size={22} style={{ color: GOLD }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span style={{
                  background: `linear-gradient(90deg, ${GOLD}, #e8b84b)`,
                  color: "#000", fontSize: "0.65rem", fontWeight: 800,
                  padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.5px",
                }}>Active Plan</span>
                <span style={{
                  background: "rgba(34,197,94,0.12)", color: GREEN,
                  fontSize: "0.65rem", fontWeight: 700,
                  padding: "3px 10px", borderRadius: "6px",
                  display: "flex", alignItems: "center", gap: "4px",
                }}>
                  <CheckCircle size={10} /> Subscribed
                </span>
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: TEXT, marginTop: "8px", letterSpacing: "-0.01em" }}>
                SaaS Launch Offer — {storageSummary?.quota || "50.00 GB"} Storage
              </h3>
              <p style={{ fontSize: "0.78rem", color: MUTED, marginTop: "4px", lineHeight: 1.5, maxWidth: "480px" }}>
                Enjoy full platform access during our early bird launch period. Storage quota is managed by MasterStudio.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1" style={{ flexShrink: 0 }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: GOLD, letterSpacing: "-0.02em" }}>₹0</div>
            <span style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 500 }}>Forever Free (Early Bird)</span>
          </div>
        </div>
      </div>

      {/* ── Storage Gauge + Quick Stats Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Circular Storage Gauge */}
        <CardBox className="lg:col-span-4 flex flex-col items-center justify-center" style={{
          background: "linear-gradient(180deg, rgba(201,151,58,0.04) 0%, rgba(19,22,29,0.98) 100%)",
        }}>
          <div style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "16px" }}>
            Storage Usage
          </div>
          <div style={{ position: "relative", width: "148px", height: "148px" }}>
            <svg width="148" height="148" viewBox="0 0 148 148" style={{ transform: "rotate(-90deg)" }}>
              {/* Background track */}
              <circle cx="74" cy="74" r={gaugeRadius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              {/* Filled arc */}
              <circle
                cx="74" cy="74" r={gaugeRadius} fill="none"
                stroke={storagePercent >= 90 ? `url(#gaugeGradRed)` : `url(#gaugeGradGold)`}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${gaugeStrokeDash} ${gaugeCircumference - gaugeStrokeDash}`}
                style={{ animation: `billing-gauge-fill 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards` }}
              />
              <defs>
                <linearGradient id="gaugeGradGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={GOLD} />
                  <stop offset="100%" stopColor="#e8b84b" />
                </linearGradient>
                <linearGradient id="gaugeGradRed" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={RED} />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: storagePercent >= 90 ? RED : TEXT, lineHeight: 1 }}>
                {storagePercent}%
              </div>
              <div style={{ fontSize: "0.62rem", color: MUTED, marginTop: "4px" }}>used</div>
            </div>
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT, marginTop: "16px" }}>
            {storageSummary?.used || "0 KB"} <span style={{ color: MUTED, fontWeight: 400 }}>of</span> {storageSummary?.quota || "50.00 GB"}
          </div>
          <div style={{ fontSize: "0.68rem", color: MUTED, marginTop: "4px" }}>
            {storageRemaining} remaining
          </div>
        </CardBox>

        {/* Quick Stats Cards */}
        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Current Plan", value: "Launch Offer", sub: "Free Tier", icon: Zap, color: GOLD },
            { label: "Storage Used", value: storageSummary?.used || "0 KB", sub: `of ${storageSummary?.quota || "50 GB"}`, icon: Archive, color: storagePercent >= 90 ? RED : GREEN },
            { label: "Transactions", value: String(history.length), sub: "all time", icon: CreditCard, color: BLUE },
            { label: "Plan Status", value: "Active", sub: "No renewal needed", icon: CheckCircle, color: GREEN },
          ].map((stat, i) => (
            <CardBox key={stat.label} className="flex flex-col justify-between" style={{
              animation: `billing-float-up 0.5s ${0.1 * i}s both`,
            }}>
              <div className="flex items-center justify-between mb-3">
                <div style={{
                  width: "36px", height: "36px", borderRadius: "12px",
                  background: `${stat.color}15`, border: `1px solid ${stat.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <stat.icon size={16} style={{ color: stat.color }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: TEXT, lineHeight: 1.2 }}>{stat.value}</div>
                <div style={{ fontSize: "0.68rem", color: MUTED, marginTop: "3px" }}>{stat.label}</div>
                <div style={{ fontSize: "0.62rem", color: `${stat.color}99`, marginTop: "2px", fontWeight: 600 }}>{stat.sub}</div>
              </div>
            </CardBox>
          ))}
        </div>
      </div>

      {/* ── Pricing Plans ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: TEXT }}>Choose Your Plan</div>
            <div style={{ fontSize: "0.74rem", color: MUTED, marginTop: "2px" }}>Scale your studio with the right package</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pricingPlans.map((plan, index) => {
            const isHovered = hoveredPlan === plan.id;
            const PlanIcon = plan.icon;
            return (
              <div
                key={plan.id}
                className="billing-plan-card flex flex-col rounded-2xl"
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{
                  background: `linear-gradient(180deg, ${plan.gradientFrom}, ${plan.gradientTo}, ${CARD})`,
                  border: `1.5px solid ${plan.current ? plan.accentColor : isHovered ? `${plan.accentColor}60` : BORDER}`,
                  padding: "28px 24px",
                  position: "relative",
                  overflow: "hidden",
                  animation: `billing-float-up 0.5s ${0.15 * index}s both`,
                  boxShadow: plan.current
                    ? `0 0 30px ${plan.accentGlow}, 0 8px 32px rgba(0,0,0,0.3)`
                    : isHovered
                    ? `0 0 20px ${plan.accentGlow}, 0 8px 24px rgba(0,0,0,0.2)`
                    : "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                {/* Recommended badge for Premium */}
                {plan.id === "premium" && (
                  <div style={{
                    position: "absolute", top: "16px", right: "-30px",
                    background: `linear-gradient(90deg, ${BLUE}, #60a5fa)`,
                    color: "#fff", fontSize: "0.58rem", fontWeight: 800,
                    padding: "4px 36px", transform: "rotate(45deg)",
                    textTransform: "uppercase", letterSpacing: "0.8px",
                  }}>
                    Popular
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3 mb-1">
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "14px",
                    background: `${plan.accentColor}15`, border: `1px solid ${plan.accentColor}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PlanIcon size={18} style={{ color: plan.accentColor }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 800, color: TEXT }}>{plan.name}</div>
                    <div style={{ fontSize: "0.65rem", color: plan.accentColor, fontWeight: 600 }}>{plan.tagline}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mt-4 mb-5">
                  <span style={{ fontSize: "2.2rem", fontWeight: 900, color: TEXT, lineHeight: 1, letterSpacing: "-0.03em" }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: MUTED, fontWeight: 400 }}>{plan.period}</span>
                </div>

                {/* Divider */}
                <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${plan.accentColor}30, transparent)`, margin: "0 0 20px 0" }} />

                {/* Features list */}
                <ul className="flex flex-col gap-2.5 mb-7 flex-grow">
                  {plan.features.map((feat) => (
                    <li key={feat.text} className="flex items-start gap-2.5" style={{ fontSize: "0.76rem" }}>
                      {feat.included ? (
                        <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: GREEN }} />
                      ) : (
                        <X size={13} className="mt-0.5 flex-shrink-0" style={{ color: `${MUTED}50` }} />
                      )}
                      <span style={{ color: feat.included ? TEXT : `${MUTED}60`, fontWeight: feat.included ? 500 : 400 }}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  disabled={plan.current}
                  className="w-full py-3 rounded-xl font-bold transition-all"
                  style={{
                    background: plan.current
                      ? `linear-gradient(90deg, ${plan.accentColor}, ${plan.accentColor}dd)`
                      : "rgba(255,255,255,0.04)",
                    color: plan.current ? "#000" : TEXT,
                    border: plan.current ? "none" : `1px solid ${plan.accentColor}40`,
                    fontSize: "0.82rem",
                    letterSpacing: "0.01em",
                    cursor: plan.current ? "default" : "pointer",
                    opacity: plan.current ? 1 : isHovered ? 1 : 0.85,
                  }}
                >
                  {plan.current ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle size={14} /> {plan.buttonText}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {plan.buttonText} <ChevronRight size={14} />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: TEXT }}>Transaction History</div>
            <div style={{ fontSize: "0.74rem", color: MUTED, marginTop: "2px" }}>Your billing activity and payment receipts</div>
          </div>
          {history.length > 0 && (
            <OutlineBtn onClick={() => {}}>
              <Download size={13} /> Export CSV
            </OutlineBtn>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 gap-3">
              <div style={{
                width: "56px", height: "56px", borderRadius: "16px",
                background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <FileText size={24} style={{ color: GOLD }} />
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: TEXT }}>No transactions yet</div>
              <div style={{ fontSize: "0.75rem", color: MUTED, textAlign: "center", maxWidth: "300px" }}>
                Your payment history will appear here once you make a purchase or upgrade your plan.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: "640px" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Transaction ID", "Plan / Activation", "Date", "Amount", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3.5" style={{
                        fontSize: "0.68rem", color: MUTED, fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.5px",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx, i) => (
                    <tr
                      key={tx.id}
                      className="transition-colors"
                      style={{
                        borderBottom: i < history.length - 1 ? `1px solid ${BORDER_SOFT}` : "none",
                        animation: `billing-float-up 0.3s ${0.05 * i}s both`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-xs select-all" style={{ color: GOLD }}>
                          {tx.id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div style={{ fontSize: "0.8rem", color: TEXT, fontWeight: 600 }}>{tx.plan}</div>
                      </td>
                      <td className="px-5 py-3.5" style={{ fontSize: "0.78rem", color: MUTED }}>{tx.date}</td>
                      <td className="px-5 py-3.5">
                        <span style={{ fontSize: "0.82rem", color: TEXT, fontWeight: 700 }}>{tx.amount}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── FAQ Section ── */}
      <div>
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: TEXT, marginBottom: "14px" }}>
          Frequently Asked Questions
        </div>
        <div className="flex flex-col gap-2">
          {billingFaqs.map((faq, i) => (
            <div
              key={i}
              className="billing-faq-item rounded-xl overflow-hidden"
              style={{
                background: CARD,
                border: `1px solid ${openFaq === i ? `${GOLD}40` : BORDER}`,
                transition: "border-color 0.25s ease",
              }}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: TEXT }}>{faq.q}</span>
                <ChevronDown
                  size={16}
                  style={{
                    color: MUTED, flexShrink: 0, marginLeft: "12px",
                    transition: "transform 0.25s ease",
                    transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4" style={{
                  fontSize: "0.76rem", color: MUTED, lineHeight: 1.65,
                  animation: "billing-float-up 0.2s ease both",
                  borderTop: `1px solid ${BORDER_SOFT}`,
                  paddingTop: "12px", marginTop: "0",
                }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Need Help CTA ── */}
      <CardBox className="flex flex-col sm:flex-row items-center justify-between gap-4" style={{
        background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(168,85,247,0.04), rgba(19,22,29,0.98))",
        border: `1px solid rgba(59,130,246,0.15)`,
      }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: "44px", height: "44px", borderRadius: "14px",
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <HelpCircle size={20} style={{ color: BLUE }} />
          </div>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: TEXT }}>Need help choosing a plan?</div>
            <div style={{ fontSize: "0.74rem", color: MUTED, marginTop: "2px" }}>
              Our team can help you find the right package for your studio's needs.
            </div>
          </div>
        </div>
        <OutlineBtn onClick={() => {}}>
          <MessageSquare size={14} /> Contact Support
        </OutlineBtn>
      </CardBox>
    </div>
  );
}

// â”€â”€ PHOTO SELECTION PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PhotoSelectionPage({ photographerEmail }: { photographerEmail: string }) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selections, setSelections] = useState<PhotoSelectionData[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSelections, setLoadingSelections] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoadingEvents(true);
        const evs = await api.fetchEvents(photographerEmail);
        setEvents(evs);
        if (evs.length > 0) {
          setSelectedEventId(evs[0].id);
        }
      } catch (err) {
        console.error("Failed to load events for selection:", err);
      } finally {
        setLoadingEvents(false);
      }
    }
    loadEvents();
  }, [photographerEmail]);

  useEffect(() => {
    if (!selectedEventId) return;
    async function loadSelections() {
      try {
        setLoadingSelections(true);
        const data = await api.fetchEventSelections(selectedEventId, photographerEmail);
        setSelections(data);
      } catch (err) {
        console.error("Failed to load selections:", err);
        setSelections([]);
      } finally {
        setLoadingSelections(false);
      }
    }
    loadSelections();
  }, [selectedEventId]);

  useEffect(() => {
    const event = events.find((item) => item.id === selectedEventId);
    setClientName(event?.client_name || "");
    setClientMobile(event?.client_mobile || "");
  }, [events, selectedEventId]);

  const handleStatusUpdate = async (selectionId: number, status: string) => {
    try {
      setUpdatingId(selectionId);
      const updated = await api.updateSelectionStatus(selectionId, status, photographerEmail);
      setSelections(prev => prev.map(s => s.id === selectionId ? { ...s, status: updated.status } : s));
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getSelectionStatusLabel = (status: string) => {
    switch (status) {
      case "Approved": return { text: "Approved", color: GREEN, bg: "rgba(34, 197, 94, 0.15)" };
      case "Rejected": return { text: "Rejected", color: RED, bg: "rgba(239, 68, 68, 0.15)" };
      default: return { text: "Client Pick", color: GOLD, bg: "rgba(201, 151, 58, 0.15)" };
    }
  };

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const clientSelectionLink = selectedEventId ? getClientSelectionLink(selectedEventId) : "";
  const pendingCount = selections.filter((item) => item.status === "Selected").length;
  const approvedCount = selections.filter((item) => item.status === "Approved").length;
  const rejectedCount = selections.filter((item) => item.status === "Rejected").length;
  const copyClientSelectionLink = async () => {
    if (!clientSelectionLink) return;
    await copyText(clientSelectionLink);
    alert("Client selection link copied.");
  };
  const openClientSelectionLink = () => {
    if (!clientSelectionLink) return;
    window.open(clientSelectionLink, "_blank", "noopener,noreferrer");
  };
  const downloadClientSelectionZip = async () => {
    const ids = selections.map((item) => item.photo_id);
    if (ids.length === 0) return;
    const name = `${(selectedEvent?.name || "client-selection").replace(/\s+/g, "-").toLowerCase()}-selected-originals.zip`;
    await api.downloadPhotosZip(ids, name, photographerEmail);
  };
  const saveClientDetails = async () => {
    if (!selectedEventId) return;
    setSavingClient(true);
    try {
      const updated = await api.updateEventClient(selectedEventId, clientName.trim(), clientMobile.trim(), photographerEmail);
      setEvents((prev) => prev.map((event) => event.id === selectedEventId ? { ...event, ...updated } : event));
    } catch (err: any) {
      alert(err.message || "Failed to save client details.");
    } finally {
      setSavingClient(false);
    }
  };

  if (loadingEvents) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin" style={{ color: GOLD }} size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn pb-[112px] lg:pb-10">
      <div className="rounded-2xl p-5 lg:p-6" style={{ background: "linear-gradient(135deg, rgba(201,151,58,0.14), rgba(19,22,29,0.98) 54%, rgba(10,12,16,0.98))", border: `1px solid ${BORDER}`, boxShadow: "0 20px 55px rgba(0,0,0,0.22)" }}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Client Selection Center</div>
            <h2 className="mt-2" style={{ fontSize: "clamp(1.25rem, 5.8vw, 1.55rem)", fontWeight: 900, color: TEXT, lineHeight: 1.12 }}>Client album picks in one place</h2>
            <p className="mt-2 max-w-2xl" style={{ color: MUTED, fontSize: "0.84rem", lineHeight: 1.55 }}>
              Send the full-album link to the client. Guests still use selfie search only for their own photos.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 min-w-full sm:min-w-[360px] xl:min-w-[420px]">
            {[
              { label: "Pending", value: pendingCount, color: GOLD },
              { label: "Approved", value: approvedCount, color: GREEN },
              { label: "Rejected", value: rejectedCount, color: RED },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${BORDER_SOFT}` }}>
                <div style={{ color: item.color, fontSize: "1.2rem", fontWeight: 900 }}>{item.value}</div>
                <div style={{ color: MUTED, fontSize: "0.68rem", fontWeight: 800 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "0.75rem", color: MUTED, fontWeight: 800 }}>Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-3 rounded-xl outline-none"
              style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}
            >
              {events.length === 0 ? (
                <option value="">No events available</option>
              ) : (
                events.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label style={{ fontSize: "0.75rem", color: MUTED, fontWeight: 800 }}>Client full-album selection link</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="hidden min-w-0 flex-1 rounded-xl px-3 py-3 sm:block" style={{ background: "rgba(10,12,16,0.48)", border: `1px solid ${BORDER_SOFT}`, color: MUTED, fontSize: "0.76rem" }}>
                <div className="truncate">{clientSelectionLink || "Select an event to generate link"}</div>
              </div>
              <div className="rounded-xl px-3 py-3 sm:hidden" style={{ background: "rgba(10,12,16,0.48)", border: `1px solid ${BORDER_SOFT}` }}>
                <div style={{ color: TEXT, fontSize: "0.78rem", fontWeight: 900 }}>Client gallery link ready</div>
                <div className="mt-1 truncate" style={{ color: MUTED, fontSize: "0.68rem" }}>{selectedEvent?.name || "Select event"}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={copyClientSelectionLink} disabled={!clientSelectionLink} className="flex-1 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold disabled:opacity-40 sm:flex-none" style={{ background: "rgba(201,151,58,0.14)", border: `1px solid ${BORDER}`, color: GOLD, fontSize: "0.76rem" }}>
                  <Share2 size={14} /> Copy
                </button>
                <button onClick={openClientSelectionLink} disabled={!clientSelectionLink} className="flex-1 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold disabled:opacity-40 sm:flex-none" style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${BORDER_SOFT}`, color: TEXT, fontSize: "0.76rem" }}>
                  <Eye size={14} /> Open
                </button>
                <button onClick={downloadClientSelectionZip} disabled={selections.length === 0} className="hidden px-3 py-2.5 rounded-xl items-center justify-center gap-2 font-bold disabled:opacity-40 lg:flex" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.22)", color: GREEN, fontSize: "0.76rem" }}>
                  <Download size={14} /> ZIP
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${BORDER_SOFT}` }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <label style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 800 }}>Registered Client Name</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name required for verification"
                className="mt-1 w-full rounded-xl px-3 py-2.5 outline-none"
                style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <label style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 800 }}>Registered Client Mobile</label>
              <input
                value={clientMobile}
                onChange={(e) => setClientMobile(e.target.value)}
                placeholder="Same mobile must be used by client"
                className="mt-1 w-full rounded-xl px-3 py-2.5 outline-none"
                style={{ background: "#1c2030", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "0.82rem" }}
              />
            </div>
            <button
              onClick={saveClientDetails}
              disabled={!selectedEventId || savingClient}
              className="rounded-xl px-4 py-2.5 font-black disabled:opacity-50"
              style={{ background: GOLD, color: BG, fontSize: "0.78rem" }}
            >
              {savingClient ? "Saving..." : "Save Client"}
            </button>
          </div>
          <div className="mt-2 flex items-start gap-2 text-[0.68rem]" style={{ color: MUTED, lineHeight: 1.45 }}>
            <ShieldCheck size={13} className="mt-0.5 shrink-0" style={{ color: GREEN }} />
            Client must enter this exact name and mobile on the full-album page before selecting photos.
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          {[
            "1. Share this link with client",
            "2. Client selects from full album",
            "3. Approve or reject picks here",
          ].map((step) => (
            <div key={step} className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${BORDER_SOFT}`, color: MUTED, fontWeight: 700 }}>
              {step}
            </div>
          ))}
        </div>
      </div>

      {loadingSelections ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="animate-spin" style={{ color: GOLD }} size={24} />
        </div>
      ) : selectedEventId && selections.length === 0 ? (
        <CardBox className="text-center py-10" style={{ color: MUTED }}>
          <Heart size={26} className="mx-auto mb-3" style={{ color: GOLD }} />
          <div style={{ color: TEXT, fontWeight: 900 }}>No client picks yet</div>
          <div className="mt-1" style={{ fontSize: "0.78rem" }}>
            Share the client selection link for {selectedEvent?.name || "this event"}.
          </div>
        </CardBox>
      ) : (
        <>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 style={{ color: TEXT, fontSize: "1rem", fontWeight: 900 }}>{selectedEvent?.name || "Selected Event"}</h3>
            <p style={{ color: MUTED, fontSize: "0.76rem", marginTop: "2px" }}>{selections.length} client pick{selections.length === 1 ? "" : "s"} received</p>
          </div>
          <button onClick={downloadClientSelectionZip} className="rounded-xl px-3 py-2 flex items-center gap-2 font-bold lg:hidden" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.22)", color: GREEN, fontSize: "0.72rem" }}>
            <Download size={13} /> ZIP
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4">
          {selections.map((sel) => {
            const photoUrl = sel.preview_url
              ? (sel.preview_url.startsWith("http") ? sel.preview_url : `${API_ORIGIN}${sel.preview_url}`)
              : `${API_ORIGIN}/static/uploads/photos/${sel.photo_name}`;
            const badge = getSelectionStatusLabel(sel.status);
            return (
              <CardBox key={sel.id} className="flex flex-col gap-3" style={{ padding: "12px", border: `1px solid ${BORDER}`, borderRadius: "16px" }}>
                {/* Photo Preview */}
                <div className="relative aspect-[4/3] sm:aspect-[3/2] rounded-xl overflow-hidden bg-black/40 flex items-center justify-center group">
                  <img 
                    src={photoUrl} 
                    alt={sel.photo_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=500&auto=format&fit=crop&q=60";
                    }}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold" 
                    style={{ background: badge.bg, color: badge.color }}>
                    {badge.text}
                  </div>
                </div>

                {/* Selection Info */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs font-bold" style={{ color: TEXT }}>
                    <span>{sel.guest_name || "Client"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-[10px] sm:flex-row sm:items-center sm:justify-between" style={{ color: MUTED }}>
                    <span className="select-all font-semibold">{sel.guest_mobile}</span>
                    <span>{sel.created_at}</span>
                  </div>
                </div>

                {/* Approve/Reject Buttons */}
                <div className="flex gap-2 mt-1">
                  <button 
                    disabled={updatingId === sel.id || sel.status === "Approved"}
                    onClick={() => handleStatusUpdate(sel.id, "Approved")}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 hover:brightness-110 disabled:opacity-40"
                    style={{ background: "rgba(34,197,94,0.15)", color: GREEN, border: `1px solid rgba(34,197,94,0.3)` }}
                  >
                    {updatingId === sel.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={12} />} Approve
                  </button>
                  <button 
                    disabled={updatingId === sel.id || sel.status === "Rejected"}
                    onClick={() => handleStatusUpdate(sel.id, "Rejected")}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 hover:brightness-110 disabled:opacity-40"
                    style={{ background: "rgba(239,68,68,0.15)", color: RED, border: `1px solid rgba(239,68,68,0.3)` }}
                  >
                    {updatingId === sel.id ? <Loader2 size={10} className="animate-spin" /> : <X size={12} />} Reject
                  </button>
                </div>
              </CardBox>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}

function SystemMonitoringPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [indexingJobs, setIndexingJobs] = useState<PhotoData[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [storageReport, setStorageReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedEvents, fetchedUsers, fetchedSearchLogs, fetchedIndexingJobs, fetchedDownloads, fetchedStorageReport] = await Promise.all([
        api.fetchEvents(),
        api.fetchUsers(),
        api.fetchSearchLogs(),
        api.fetchIndexingJobs(),
        api.fetchAllDownloads(),
        api.fetchStorageReport(),
      ]);
      setEvents(fetchedEvents);
      setUsers(fetchedUsers);
      setSearchLogs(fetchedSearchLogs);
      setIndexingJobs(fetchedIndexingJobs);
      setDownloads(fetchedDownloads);
      setStorageReport(fetchedStorageReport);

      const active = fetchedIndexingJobs.filter(j => ["Queued", "Processing", "Pending"].includes(j.status));
      setLogs([
        `[${new Date().toLocaleTimeString()}] [OK] Backend API responded successfully.`,
        `[${new Date().toLocaleTimeString()}] [OK] Loaded ${fetchedUsers.length} users, ${fetchedEvents.length} events, ${fetchedSearchLogs.length} search logs.`,
        `[${new Date().toLocaleTimeString()}] [OK] AI indexing queue: ${active.length} pending/processing photos.`,
        `[${new Date().toLocaleTimeString()}] [OK] Storage usage: ${fetchedStorageReport.total_used} / ${fetchedStorageReport.total_quota}.`,
      ]);
    } catch (err) {
      console.error("Error loading system monitoring metrics:", err);
      addLog("[ERROR] Failed to fetch live system diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const queueItems = indexingJobs.filter(j => ["Queued", "Processing", "Pending"].includes(j.status));
  const failedJobs = indexingJobs.filter(j => j.status === "Failed").length;
  const completedJobs = indexingJobs.filter(j => j.status === "Completed").length;
  const activePhotographers = users.filter(u => u.role === "Photographer" && u.status === "Active").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px] animate-fadeIn">
        <Loader2 className="animate-spin" size={36} style={{ color: GOLD }} />
        <p className="text-xs mt-3" style={{ color: MUTED }}>Loading system monitoring dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <SectionHeader title="System Monitoring" sub="Live application diagnostics from current backend data" action={<OutlineBtn onClick={loadData}><RefreshCw size={14} /> Refresh</OutlineBtn>} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "API Status", value: "Online", sub: "Authenticated endpoints responding", color: GREEN, icon: Activity },
          { label: "Active Photographers", value: String(activePhotographers), sub: `${users.filter(u => u.role === "Photographer").length} total photographers`, color: BLUE, icon: Camera },
          { label: "AI Indexing Queue", value: String(queueItems.length), sub: `${completedJobs} completed, ${failedJobs} failed`, color: queueItems.length ? GOLD : GREEN, icon: Cpu },
          { label: "Storage Used", value: storageReport?.total_used || "0 KB", sub: `${storageReport?.percent || 0}% of allocated quota`, color: PURPLE, icon: Archive },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <CardBox key={label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: "0.76rem", color: MUTED, fontWeight: 700 }}>{label}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}33` }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <div style={{ color: TEXT, fontSize: "1.55rem", fontWeight: 900, lineHeight: 1 }}>{value}</div>
            <div style={{ color: MUTED, fontSize: "0.72rem", marginTop: "8px" }}>{sub}</div>
          </CardBox>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 flex flex-col rounded-2xl overflow-hidden" style={{ background: "#06080d", border: `1px solid ${BORDER}`, minHeight: "260px" }}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: TEXT }}>Live Diagnostics Log</span>
            </div>
            <button onClick={() => setLogs([])} className="text-[10px] hover:underline" style={{ color: GOLD }}>Clear</button>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-1.5 font-mono text-[11px] overflow-y-auto max-h-[260px]" style={{ color: "#38bdf8" }}>
            {logs.length === 0 ? <span style={{ color: MUTED }}>No diagnostics log entries.</span> : logs.map((log, i) => (
              <div key={i} className="leading-normal whitespace-pre-wrap select-all">
                {log.includes("[ERROR]") ? <span style={{ color: RED }}>{log}</span> : <span>{log}</span>}
              </div>
            ))}
          </div>
        </div>

        <CardBox className="lg:col-span-5 flex flex-col gap-3">
          <div style={{ color: TEXT, fontWeight: 800 }}>Operational Counts</div>
          {[
            ["Events", events.length],
            ["Users", users.length],
            ["Guest Searches", searchLogs.length],
            ["Downloads", downloads.length],
            ["Indexed Photos", completedJobs],
            ["Failed Jobs", failedJobs],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
              <span style={{ color: MUTED, fontSize: "0.78rem" }}>{label}</span>
              <span style={{ color: TEXT, fontWeight: 850 }}>{value}</span>
            </div>
          ))}
          <p style={{ color: MUTED, fontSize: "0.72rem", lineHeight: 1.5 }}>
            Server-level CPU/RAM metrics are intentionally not shown until real monitoring is connected. This page only shows verified application data.
          </p>
        </CardBox>
      </div>

      <CardBox>
        <div style={{ color: TEXT, fontWeight: 800, marginBottom: "10px" }}>Indexing Queue</div>
        {queueItems.length === 0 ? (
          <div style={{ color: MUTED, fontSize: "0.8rem" }}>No pending AI indexing jobs.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Photo", "Event", "Status", "Progress"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left" style={{ color: MUTED, fontSize: "0.7rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queueItems.map((job) => (
                  <tr key={job.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
                    <td className="px-4 py-2" style={{ color: TEXT, fontSize: "0.78rem" }}>{job.name}</td>
                    <td className="px-4 py-2" style={{ color: MUTED, fontSize: "0.76rem" }}>{job.event_id}</td>
                    <td className="px-4 py-2"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-2" style={{ color: TEXT, fontSize: "0.76rem" }}>{job.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBox>
    </div>
  );
}

function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [resultFilter, setResultFilter] = useState("All");

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await api.fetchAuditLogs({ limit: 500 });
      setLogs(data || []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const actions = Array.from(new Set(logs.map(log => log.action).filter(Boolean))).sort();
  const filtered = logs.filter(log => {
    const haystack = [
      log.actor_email,
      log.actor_role,
      log.action,
      log.resource_type,
      log.resource_id,
      log.ip_address,
      log.details,
    ].join(" ").toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesAction = actionFilter === "All" || log.action === actionFilter;
    const matchesResult = resultFilter === "All" || log.result === resultFilter;
    return matchesSearch && matchesAction && matchesResult;
  });

  const parseDetails = (value?: string) => {
    if (!value) return "-";
    try {
      const parsed = JSON.parse(value);
      const entries = Object.entries(parsed)
        .filter(([, entryValue]) => entryValue !== "" && entryValue !== null && entryValue !== undefined)
        .slice(0, 4)
        .map(([key, entryValue]) => `${key.replace(/_/g, " ")}: ${typeof entryValue === "object" ? JSON.stringify(entryValue) : entryValue}`);
      return entries.join(" | ") || "-";
    } catch {
      return value;
    }
  };

  const exportCsv = () => {
    if (!filtered.length) return;
    const headers = ["Time", "Actor", "Role", "Action", "Resource", "Result", "IP", "Details"];
    const rows = filtered.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.actor_email || "-",
      log.actor_role || "-",
      log.action,
      `${log.resource_type || "-"} ${log.resource_id || ""}`.trim(),
      log.result,
      log.ip_address || "-",
      parseDetails(log.details),
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Audit Logs"
        sub={`${filtered.length} records shown`}
        action={<OutlineBtn onClick={loadAuditLogs}><RefreshCw size={14} /> Refresh</OutlineBtn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Records", value: String(logs.length), color: BLUE, icon: FileText },
          { label: "Successful", value: String(logs.filter(log => log.result === "success").length), color: GREEN, icon: CheckCircle },
          { label: "Failed", value: String(logs.filter(log => log.result === "failed").length), color: RED, icon: AlertCircle },
          { label: "QR Actions", value: String(logs.filter(log => log.action.includes("qr")).length), color: PURPLE, icon: QrCode },
        ].map(({ label, value, color, icon: Icon }) => (
          <CardBox key={label} style={{ padding: "16px" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 600 }}>{label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}33` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 850, color: TEXT }}>{value}</div>
          </CardBox>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER_SOFT}` }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search actor, action, resource, IP..." />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 rounded-xl outline-none text-sm" style={{ background: "#0d0f16", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="All">All actions</option>
          {actions.map(action => <option key={action} value={action}>{action.replace(/_/g, " ")}</option>)}
        </select>
        <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="px-3 py-2 rounded-xl outline-none text-sm" style={{ background: "#0d0f16", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="All">All results</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <GoldBtn onClick={exportCsv} small><Download size={14} /> Export CSV</GoldBtn>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Time", "Actor", "Action", "Resource", "Result", "IP", "Details"].map(header => (
                  <th key={header} className="px-4 py-3 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 700 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: MUTED }}>Loading audit logs...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: MUTED }}>No audit records found.</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap" style={{ fontSize: "0.72rem", color: MUTED }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3" style={{ fontSize: "0.78rem", color: TEXT }}>
                    <div className="font-bold truncate max-w-[180px]">{log.actor_email || "System"}</div>
                    <div style={{ color: MUTED, fontSize: "0.68rem" }}>{log.actor_role || "-"}</div>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "0.76rem", color: TEXT, fontWeight: 750 }}>{log.action.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3" style={{ fontSize: "0.74rem", color: MUTED }}>
                    <div>{log.resource_type || "-"}</div>
                    <div className="truncate max-w-[160px]" style={{ color: TEXT }}>{log.resource_id || "-"}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={log.result === "failed" ? "Failed" : "Success"} /></td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ fontSize: "0.72rem", color: MUTED }}>{log.ip_address || "-"}</td>
                  <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED, maxWidth: "320px" }}>
                    <div className="truncate">{parseDetails(log.details)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FounderValidationPage() {
  const [summary, setSummary] = useState<ValidationSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await api.fetchValidationSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load validation summary:", err);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const progress = (value: number, target: number) => Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
  const readinessScore = summary ? Math.round((
    progress(summary.photographers_registered, summary.target_photographers) +
    progress(summary.guest_accesses, summary.target_guests) +
    progress(summary.real_events, summary.target_real_events) +
    Math.min(100, summary.guest_searches * 10) +
    Math.min(100, summary.downloads * 10) +
    Math.min(100, summary.feedback_messages * 25)
  ) / 6) : 0;
  const targetCards = summary ? [
    { label: "Photographers", value: summary.photographers_registered, target: summary.target_photographers, color: BLUE, icon: Camera },
    { label: "Real Guests", value: summary.guest_accesses, target: summary.target_guests, color: GREEN, icon: Users },
    { label: "Real Events", value: summary.real_events, target: summary.target_real_events, color: GOLD, icon: CalendarDays },
    { label: "Payment Signals", value: summary.payment_interest, target: summary.target_photographers, color: PURPLE, icon: CreditCard },
  ] : [];

  const stageRows = summary?.photographers || [];

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Founder Validation"
        sub="Track demand before spending on infrastructure"
        action={<OutlineBtn onClick={loadSummary}><RefreshCw size={14} /> Refresh</OutlineBtn>}
      />

      <div className="rounded-2xl p-5 lg:p-6" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(19,22,29,0.96) 45%, rgba(10,12,16,0.98))", border: `1px solid ${BORDER}` }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-center">
          <div>
            <div style={{ color: GREEN, fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Lean Startup Scoreboard</div>
            <h2 className="mt-2" style={{ color: TEXT, fontSize: "1.35rem", fontWeight: 900 }}>5 photographers, 50 guests, 1 real event</h2>
            <p className="mt-2 max-w-2xl" style={{ color: MUTED, fontSize: "0.84rem", lineHeight: 1.55 }}>
              Validate use, repeat value, and payment intent before buying scaling infrastructure.
            </p>
          </div>
          <div className="rounded-2xl p-4 min-w-[150px] text-center" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_SOFT}` }}>
            <div style={{ color: MUTED, fontSize: "0.72rem", fontWeight: 700 }}>Validation Score</div>
            <div style={{ color: readinessScore >= 70 ? GREEN : readinessScore >= 40 ? GOLD : RED, fontSize: "2.1rem", fontWeight: 950, lineHeight: 1 }}>{readinessScore}%</div>
          </div>
        </div>
      </div>

      {loading ? (
        <CardBox className="text-center py-10" style={{ color: MUTED }}>Loading validation metrics...</CardBox>
      ) : !summary ? (
        <CardBox className="text-center py-10" style={{ color: MUTED }}>Validation data unavailable.</CardBox>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {targetCards.map(({ label, value, target, color, icon: Icon }) => (
              <CardBox key={label} style={{ padding: "16px" }}>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: "0.72rem", color: MUTED, fontWeight: 700 }}>{label}</span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}33` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                </div>
                <div className="flex items-end gap-1">
                  <span style={{ fontSize: "1.55rem", fontWeight: 900, color: TEXT, lineHeight: 1 }}>{value}</span>
                  <span style={{ fontSize: "0.75rem", color: MUTED, marginBottom: "2px" }}>/ {target}</span>
                </div>
                <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${progress(value, target)}%`, background: color }} />
                </div>
              </CardBox>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              { label: "Active Events", value: summary.active_events, icon: Activity, color: GREEN },
              { label: "Photos Uploaded", value: summary.photos_uploaded, icon: Image, color: GOLD },
              { label: "Guest Searches", value: summary.guest_searches, icon: Search, color: BLUE },
              { label: "Downloads", value: summary.downloads, icon: Download, color: PURPLE },
              { label: "Client Selections", value: summary.client_selections, icon: Heart, color: RED },
              { label: "Feedback", value: summary.feedback_messages, icon: MessageSquare, color: MUTED },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER_SOFT}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: "0.68rem", color: MUTED, fontWeight: 700 }}>{label}</span>
                  <Icon size={13} style={{ color }} />
                </div>
                <div style={{ color: TEXT, fontSize: "1.25rem", fontWeight: 850 }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <div style={{ color: TEXT, fontWeight: 850, fontSize: "0.95rem" }}>Photographer Validation Funnel</div>
                <div style={{ color: MUTED, fontSize: "0.74rem", marginTop: "2px" }}>Profile → event → upload → QR use → guest value → client selection</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Photographer", "Profile", "Event", "Photos", "QR/Guests", "Selection", "Usage", "Plan"].map(header => (
                      <th key={header} className="px-4 py-3 text-left" style={{ fontSize: "0.7rem", color: MUTED, fontWeight: 700 }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stageRows.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: MUTED }}>No photographers onboarded yet.</td></tr>
                  ) : stageRows.map(row => {
                    const Step = ({ ok }: { ok: boolean }) => (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: ok ? "rgba(34,197,94,0.13)" : "rgba(255,255,255,0.04)", color: ok ? GREEN : MUTED, border: `1px solid ${ok ? "rgba(34,197,94,0.22)" : BORDER_SOFT}` }}>
                        {ok ? <Check size={14} /> : <Clock size={14} />}
                      </span>
                    );
                    return (
                      <tr key={row.id} style={{ borderBottom: `1px solid ${BORDER_SOFT}` }} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div style={{ color: TEXT, fontSize: "0.8rem", fontWeight: 800 }}>{row.name}</div>
                          <div className="truncate max-w-[190px]" style={{ color: MUTED, fontSize: "0.7rem" }}>{row.email}</div>
                        </td>
                        <td className="px-4 py-3"><Step ok={row.profile_done} /></td>
                        <td className="px-4 py-3"><Step ok={row.event_created} /></td>
                        <td className="px-4 py-3"><Step ok={row.photos_uploaded} /></td>
                        <td className="px-4 py-3"><Step ok={row.guests_used || row.qr_shared} /></td>
                        <td className="px-4 py-3"><Step ok={row.client_selection_used} /></td>
                        <td className="px-4 py-3" style={{ fontSize: "0.72rem", color: MUTED }}>
                          <div>{row.event_count} events · {row.photo_count} photos</div>
                          <div>{row.guest_count} guests · {row.search_count} searches · {row.download_count} downloads</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ color: row.plan ? GOLD : MUTED, background: row.plan ? "rgba(201,151,58,0.12)" : "rgba(255,255,255,0.04)" }}>
                            {row.plan || "No plan"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// â”€â”€ MAIN WRAPPER COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SUPER_ADMIN_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Platform Overview" },
  { icon: CheckCircle, label: "Founder Validation" },
  { icon: Users, label: "Manage Photographers" },
  { icon: CalendarDays, label: "View All Events" },
  { icon: Archive, label: "Storage Management" },
  { icon: Cpu, label: "System Monitoring" },
  { icon: ShieldCheck, label: "Audit Logs" },
  { icon: TrendingUp, label: "Analytics" },
  { icon: Mail, label: "Support Inquiries" },
  { icon: MessageSquare, label: "Communication Settings" },
  { icon: LogOut, label: "Logout" },
];

const PHOTOGRAPHER_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: CalendarDays, label: "Events" },
  { icon: Upload, label: "Upload Photos" },
  { icon: Cpu, label: "AI Indexing" },
  { icon: Search, label: "Search Logs" },
  { icon: Heart, label: "Client Selection" },
  { icon: Users, label: "Leads & Guests" },
  { icon: Download, label: "Downloads" },
  { icon: CreditCard, label: "Billing & Plans" },
  { icon: Settings, label: "Settings" },
  { icon: User, label: "Profile" },
  { icon: HelpCircle, label: "Support" },
  { icon: LogOut, label: "Logout" },
];

const GUEST_NAV_ITEMS = [
  { icon: Image, label: "My Photos", sub: "Find matches" },
  { icon: Download, label: "Downloads", sub: "Saved photos" },
  { icon: User, label: "Profile", sub: "Account" },
];

type NotificationItem = {
  id: string;
  title: string;
  text: string;
  time: string;
  type: "warning" | "info" | "success";
  read: boolean;
  actionNav?: string;
  actionEventId?: string;
  actionLabel?: string;
};

export function Dashboard({ onLogout, role = "admin", userEmail = "", onBackHome }: { onLogout: () => void; role?: "super_admin" | "photographer" | "user" | "admin"; userEmail?: string; onBackHome?: () => void }) {
  const [activeNav, setActiveNav] = useState(role === "user" ? "My Photos" : role === "super_admin" ? "Platform Overview" : "Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEventFilter, setSelectedEventFilter] = useState("");
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(Boolean(userEmail && role !== "super_admin"));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [guestBrand, setGuestBrand] = useState<GuestBrand>({});
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [guestAccessVerified, setGuestAccessVerified] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationStorageKey = `masterstudio.notifications.${role}.${userEmail || "guest"}`;

  const handleGuestAccessVerified = async (name: string, mobile: string) => {
    setGuestAccessVerified(true);
    try {
      const users = await api.fetchUsers();
      const tempEmail = `${mobile}@guest.masterstudio.local`.toLowerCase();
      let found = users.find(u => u.phone === mobile || u.email.toLowerCase() === tempEmail);
      if (!found) {
        const newUserId = `G-${mobile}`;
        found = await api.createUser(newUserId, name, tempEmail, "Guest");
      }
      if (found.name !== name || found.phone !== mobile) {
        found = await api.updateUser(found.id, name, found.email, mobile, found.plan, found.status);
      }
      setCurrentUser(found);
    } catch (err) {
      console.error("Failed to sync guest user details:", err);
      setCurrentUser({
        id: `G-${mobile}`,
        name: name,
        email: `${mobile}@guest.masterstudio.local`,
        role: "Guest",
        phone: mobile,
        events_count: 1,
        joined: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        plan: "Guest Access",
        status: "Active",
      });
    }
  };

  useEffect(() => {
    async function loadNotifications() {
      if (!userEmail || role === "super_admin") return;
      try {
        const events = await api.fetchEvents(userEmail);
        const savedReadState: Record<string, boolean> = JSON.parse(window.localStorage.getItem(notificationStorageKey) || "{}");
        const list: NotificationItem[] = [];
        const now = new Date();
        
        events.forEach(e => {
          if (e.created_at) {
            const createdDate = new Date(e.created_at);
            const ageInMs = now.getTime() - createdDate.getTime();
            const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
            const remainingDays = Math.ceil(45 - ageInDays);
            
            if (e.status === "Active") {
              if (remainingDays <= 5 && remainingDays > 0) {
                list.push({
                  id: `warning-${e.id}`,
                  title: "Archive due soon",
                  text: `${e.name} will auto-archive in ${remainingDays} day${remainingDays === 1 ? "" : "s"}. Download the final files or keep the event active before that date.`,
                  time: `${remainingDays} day${remainingDays === 1 ? "" : "s"} left`,
                  type: "warning",
                  read: Boolean(savedReadState[`warning-${e.id}`]),
                  actionNav: "Events",
                  actionEventId: e.id,
                  actionLabel: "Open event"
                });
              }
            } else if (e.status === "Archived") {
              list.push({
                id: `archived-${e.id}`,
                title: "Event archived",
                text: `${e.name} has moved to archive. Guest selfie temp files were cleaned automatically.`,
                time: "Cleaned up",
                type: "info",
                read: Boolean(savedReadState[`archived-${e.id}`]),
                actionNav: "Events",
                actionEventId: e.id,
                actionLabel: "View archive"
              });
            }
          }
        });
        
        if (list.length === 0) {
          list.push({
            id: "welcome",
            title: "Workspace is healthy",
            text: "Events, storage, uploads, and your active session are being monitored.",
            time: "Now",
            type: "success",
            read: Boolean(savedReadState.welcome),
            actionNav: "Dashboard",
            actionLabel: "Open dashboard"
          });
        }
        
        setNotifications(list);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    }
    loadNotifications();
  }, [userEmail, role, notificationStorageKey]);

  useEffect(() => {
    if (!userEmail || role === "super_admin") return;
    if (notifications.length === 0) return;
    const readState = notifications.reduce<Record<string, boolean>>((acc, item) => {
      if (item.read) acc[item.id] = true;
      return acc;
    }, {});
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(readState));
  }, [notifications, notificationStorageKey, role, userEmail]);

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };
  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const handleNotificationClick = (notification: NotificationItem) => {
    markNotificationRead(notification.id);
    if (notification.actionEventId) {
      setSelectedEventId(notification.actionEventId);
      setSelectedEventFilter(notification.actionEventId);
    }
    if (notification.actionNav) {
      setActiveNav(notification.actionNav);
      setShowNotifications(false);
      setMobileMenuOpen(false);
    }
  };

  const navItems = role === "super_admin"
    ? SUPER_ADMIN_NAV_ITEMS
    : (role === "photographer" || role === "admin")
      ? PHOTOGRAPHER_NAV_ITEMS
      : [];

  useEffect(() => {
    async function loadCurrentUser() {
      if (!userEmail || role === "super_admin") {
        setCurrentUserLoading(false);
        return;
      }
      setCurrentUserLoading(true);
      try {
        const users = await api.fetchUsers();
        const found = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
        if (found) {
          setCurrentUser(found);
        }
      } catch (err) {
        console.error("Failed to load current user details:", err);
      } finally {
        setCurrentUserLoading(false);
      }
    }
    loadCurrentUser();
  }, [userEmail, role]);

  const [dashboardEvents, setDashboardEvents] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardEvents() {
      try {
        const data = await api.fetchEvents(userEmail);
        setDashboardEvents(data);
      } catch (err) {
        console.error("Failed to load dashboard events for storage:", err);
      }
    }
    if (userEmail && (role === "photographer" || role === "admin")) {
      loadDashboardEvents();
    }
  }, [userEmail, role, activeNav]);

  const totalPhotosCount = dashboardEvents.reduce((sum, ev) => {
    const count = Number(String(ev.photos).replace(/,/g, "")) || 0;
    return sum + count;
  }, 0);
  const estimatedStorageUsed = parseFloat(((totalPhotosCount * 3.2) / 1024).toFixed(1));
  const storageLimit = 50;
  const storagePercent = Math.max(3, Math.min(100, Math.round((estimatedStorageUsed / storageLimit) * 100)));

  const studioSetupComplete = Boolean(
    currentUser?.brand_name?.trim() &&
    currentUser?.brand_logo_url?.trim() &&
    currentUser?.phone?.trim()
  );

  const needsStudioSetup = (role === "photographer" || role === "admin") && currentUser && (
    currentUser.must_change_password ||
    !currentUser.first_login_done ||
    !studioSetupComplete
  );
  const mobileAppNavItems = role === "super_admin"
    ? [
        { icon: LayoutDashboard, label: "Platform Overview" },
        { icon: CheckCircle, label: "Founder Validation" },
        { icon: Users, label: "Manage Photographers" },
        { icon: CalendarDays, label: "View All Events" },
        { icon: MessageSquare, label: "Communication Settings" },
      ]
    : [
        { icon: LayoutDashboard, label: "Dashboard" },
        { icon: CalendarDays, label: "Events" },
        { icon: Upload, label: "Upload Photos" },
        { icon: User, label: "Profile" },
      ];

  const isPrimaryNavActive = mobileAppNavItems.some(item => item.label === activeNav);
  const isMoreActive = !isPrimaryNavActive;

  const menuGroups = useMemo(() => {
    if (role === "super_admin") {
      return [
        {
          title: "Platform",
          items: [
            { icon: LayoutDashboard, label: "Platform Overview" },
            { icon: CheckCircle, label: "Founder Validation" },
            { icon: Users, label: "Manage Photographers" },
            { icon: CalendarDays, label: "View All Events" },
          ]
        },
        {
          title: "System",
          items: [
            { icon: Archive, label: "Storage Management" },
            { icon: Cpu, label: "System Monitoring" },
            { icon: ShieldCheck, label: "Audit Logs" },
            { icon: TrendingUp, label: "Analytics" },
            { icon: Mail, label: "Support Inquiries" },
          ]
        },
        {
          title: "Preferences",
          items: [
            { icon: MessageSquare, label: "Communication Settings" }
          ]
        }
      ];
    } else {
      return [
        {
          title: "Core",
          items: [
            { icon: LayoutDashboard, label: "Dashboard" },
            { icon: CalendarDays, label: "Events" },
            { icon: Upload, label: "Upload Photos" },
          ]
        },
        {
          title: "AI & Tools",
          items: [
            { icon: Cpu, label: "AI Indexing" },
            { icon: Search, label: "Search Logs" },
            { icon: Download, label: "Downloads" },
            { icon: Heart, label: "Client Selection" },
          ]
        },
        {
          title: "Management",
          items: [
            { icon: Users, label: "Leads & Guests" },
            { icon: CreditCard, label: "Billing & Plans" },
            { icon: User, label: "Profile" },
            { icon: Settings, label: "Settings" },
            { icon: HelpCircle, label: "Support" },
          ]
        }
      ];
    }
  }, [role]);

  const renderContent = () => {
    if (role === "super_admin") {
      switch (activeNav) {
        case "Platform Overview":
          return <DashboardHome photographerEmail={undefined} setActiveNav={setActiveNav} />;
        case "Founder Validation":
          return <FounderValidationPage />;
        case "Manage Photographers":
          return <ManagePhotographersPage />;
        case "Create New Event":
          return <EventsPage photographerEmail={undefined} isAdminView={true} autoOpenCreate={true} setActiveNav={setActiveNav} setSelectedEventId={setSelectedEventId} />;
        case "View All Events":
          return <EventsPage photographerEmail={undefined} isAdminView={true} setActiveNav={setActiveNav} setSelectedEventId={setSelectedEventId} />;
        case "Upload Photos":
          return <UploadPhotosPage photographerEmail={undefined} isAdminView={true} setActiveNav={setActiveNav} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId} />;
        case "Storage Management":
          return <StorageManagementPage />;
        case "System Monitoring":
          return <SystemMonitoringPage />;
        case "Audit Logs":
          return <AuditLogsPage />;
        case "Analytics":
          return <AnalyticsPage />;
        case "Support Inquiries":
          return <SupportInquiriesPage />;
        case "Communication Settings":
          return <SystemSettingsPage />;
        default:
          return <DashboardHome photographerEmail={undefined} setActiveNav={setActiveNav} />;
      }
    }

    switch (activeNav) {
      case "Dashboard":
        return <DashboardHome photographerEmail={userEmail} setActiveNav={setActiveNav} />;
      case "Events":
        return <EventsPage photographerEmail={userEmail} setActiveNav={setActiveNav} setSelectedEventId={setSelectedEventId} />;
      case "Upload Photos":
        return <UploadPhotosPage photographerEmail={userEmail} setActiveNav={setActiveNav} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId} />;
      case "AI Indexing":
        return <AiIndexingPage photographerEmail={userEmail} />;
      case "Search Logs":
        return <SearchLogsPage photographerEmail={userEmail} setActiveNav={setActiveNav} />;
      case "Client Selection":
        return <PhotoSelectionPage photographerEmail={userEmail} />;
      case "Leads & Guests":
        return <LeadsPage photographerEmail={userEmail} />;
      case "Downloads":
        return <DownloadsPage photographerEmail={userEmail} />;
      case "Billing & Plans":
        return <BillingPlansPage photographerEmail={userEmail} />;
      case "Settings":
        return <SettingsPage />;
      case "Profile":
        return <ProfilePage currentUser={currentUser} onUpdate={(updated) => setCurrentUser(updated)} />;
      case "Support":
        return <SupportPage />;
      default:
        return <DashboardHome photographerEmail={userEmail} />;
    }
  };

  const renderUserContent = () => {
    switch (activeNav) {
      case "My Photos":
        return <UserMyPhotos selectedEventFilter={selectedEventFilter} setSelectedEventFilter={setSelectedEventFilter} userEmail={userEmail} userName={currentUser?.name || "Guest User"} onBrandChange={setGuestBrand} onAccessVerified={handleGuestAccessVerified} selfie={selfie} setSelfie={setSelfie} selfieFile={selfieFile} setSelfieFile={setSelfieFile} />;
      case "Downloads":
        return <UserDownloads userEmail={userEmail} />;
      case "Profile":
        return <UserProfile currentUser={currentUser} onUpdate={(updated) => setCurrentUser(updated)} selfie={selfie} />;
      default:
        return <UserMyPhotos selectedEventFilter={selectedEventFilter} setSelectedEventFilter={setSelectedEventFilter} userEmail={userEmail} userName={currentUser?.name || "Guest User"} onBrandChange={setGuestBrand} onAccessVerified={handleGuestAccessVerified} selfie={selfie} setSelfie={setSelfie} selfieFile={selfieFile} setSelfieFile={setSelfieFile} />;
    }
  };

  if ((role === "photographer" || role === "admin") && currentUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT, fontFamily: "'Poppins', sans-serif" }}>
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <Loader2 className="animate-spin" size={18} style={{ color: GOLD }} />
          <span style={{ fontSize: "0.86rem", fontWeight: 800 }}>Loading profile setup...</span>
        </div>
      </div>
    );
  }

  if ((role === "photographer" || role === "admin") && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG, color: TEXT, fontFamily: "'Poppins', sans-serif" }}>
        <div className="w-full max-w-md rounded-2xl p-5 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <AlertCircle className="mx-auto mb-3" size={28} style={{ color: RED }} />
          <h2 className="text-lg font-black">Profile load nahi hua</h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>Please dobara login karo. Dashboard profile verification ke bina open nahi hoga.</p>
          <button onClick={onLogout} className="mt-4 rounded-xl px-4 py-2 text-sm font-black" style={{ background: GOLD, color: BG }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (needsStudioSetup) {
    return <StudioSetupPage currentUser={currentUser} onUpdate={(updated) => setCurrentUser(updated)} onLogout={onLogout} />;
  }

  if (role === "user") {
    return (
      <div
        className="min-h-screen w-full max-w-full overflow-x-hidden"
        style={{
          background: "#07090d",
          fontFamily: "'Poppins', sans-serif",
          color: TEXT,
        }}
      >
        {/* â”€â”€ Keyframe Styles Injected for guest nav â”€â”€ */}
        <style>{`
          @keyframes brandSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes brandPulse {
            0%   { box-shadow: 0 0 0 0 rgba(201,151,58,0.55); }
            60%  { box-shadow: 0 0 0 8px rgba(201,151,58,0); }
            100% { box-shadow: 0 0 0 0 rgba(201,151,58,0); }
          }
          @keyframes shimmerSlide {
            0%   { left: -33%; }
            100% { left: 133%; }
          }
          @keyframes liveGlow {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
          @keyframes navEntrance {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes stepPulse {
            0%   { box-shadow: 0 0 0 0 rgba(201,151,58,0.55); }
            60%  { box-shadow: 0 0 0 8px rgba(201,151,58,0); }
            100% { box-shadow: 0 0 0 0 rgba(201,151,58,0); }
          }
          @keyframes photoReveal {
            from { opacity: 0; transform: scale(0.94) translateY(10px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes scanLine {
            0%   { top: 5%; }
            50%  { top: 88%; }
            100% { top: 5%; }
          }
          @keyframes shimmerLoad {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .guest-nav-btn:hover { background: rgba(201,151,58,0.1) !important; }
        `}</style>

        <nav
          className="sticky top-0 z-50 border-b"
          style={{
            background: "rgba(6,7,10,0.82)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderColor: "rgba(201,151,58,0.14)",
            boxShadow: "0 1px 0 rgba(201,151,58,0.08), 0 8px 32px rgba(0,0,0,0.4)",
            animation: "navEntrance 0.4s ease-out",
          }}
        >
          {/* Gold shimmer line at top of nav */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "1.5px",
              background: "linear-gradient(90deg, transparent 0%, rgba(201,151,58,0.6) 30%, rgba(255,215,0,0.9) 50%, rgba(201,151,58,0.6) 70%, transparent 100%)",
            }}
          />

          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-3 sm:py-4 min-h-[64px] sm:min-h-[72px] flex items-center justify-between gap-3 sm:gap-4">

            {/* â”€â”€ LEFT: Brand Identity â”€â”€ */}
            <button
              className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 group"
              onClick={() => guestAccessVerified ? setActiveNav("My Photos") : onBackHome?.()}
            >
              <BrandMark
                logoUrl={guestBrand.logoUrl}
                name={guestBrand.brandName || guestBrand.photographerName}
                size="md"
              />

              <div className="min-w-0 text-left">
                {/* Brand name with gradient */}
                <div
                  className="truncate max-w-[160px] sm:max-w-none"
                  style={{
                    background: "linear-gradient(90deg, #fff8e1 0%, #ffd700 40%, #c9973a 80%, #fff 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontSize: "clamp(1rem, 3vw, 1.15rem)",
                    fontWeight: 900,
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                    transition: "all 0.2s ease",
                  }}
                >
                  {guestBrand.brandName || guestBrand.photographerName || "Photographer"}
                </div>

                {/* Official Gallery badge */}
                <div
                  className={`mt-1 ${guestAccessVerified ? "inline-flex" : "hidden sm:inline-flex"} items-center gap-1.5 rounded-full px-2 py-0.5`}
                  style={{
                    background: "linear-gradient(90deg, rgba(201,151,58,0.18), rgba(201,151,58,0.08))",
                    border: "1px solid rgba(201,151,58,0.35)",
                    color: GOLD,
                    fontSize: "0.58rem",
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    boxShadow: "0 2px 8px rgba(201,151,58,0.12)",
                  }}
                >
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 6px rgba(34,197,94,0.8)",
                      animation: "liveGlow 1.8s ease-in-out infinite",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  Official Gallery
                </div>
              </div>
            </button>

            {/* â”€â”€ CENTER: Nav Items (desktop) â”€â”€ */}
            {guestAccessVerified && (
              <ul className="hidden md:flex items-center gap-1">
                {GUEST_NAV_ITEMS.map(({ icon: Icon, label }) => (
                  <li key={label}>
                    <button
                      onClick={() => setActiveNav(label)}
                      className="guest-nav-btn flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 relative"
                      style={{
                        background: activeNav === label
                          ? "linear-gradient(135deg, rgba(201,151,58,0.22), rgba(201,151,58,0.08))"
                          : "transparent",
                        color: activeNav === label ? GOLD : MUTED,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        border: activeNav === label ? "1px solid rgba(201,151,58,0.28)" : "1px solid transparent",
                        boxShadow: activeNav === label ? "0 4px 12px rgba(201,151,58,0.12)" : "none",
                      }}
                    >
                      <Icon size={15} />
                      {label}
                      {activeNav === label && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: "-1px",
                            left: "20%",
                            right: "20%",
                            height: "1.5px",
                            background: "linear-gradient(90deg, transparent, #c9973a, transparent)",
                            borderRadius: "2px",
                          }}
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* â”€â”€ RIGHT: Back / User Info / Logout â”€â”€ */}
            {!guestAccessVerified && (
              <button
                onClick={onBackHome}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER_SOFT}`,
                  color: TEXT,
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  backdropFilter: "blur(8px)",
                }}
              >
                <Home size={15} style={{ color: GOLD }} />
                <span className="hidden sm:inline">Back to Home</span>
              </button>
            )}

            {guestAccessVerified && (
              <div className="hidden md:flex items-center gap-3">
                {/* User info pill */}
                <div
                  className="flex items-center gap-3 rounded-2xl px-3 py-2"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${BORDER_SOFT}`,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(201,151,58,0.28), rgba(201,151,58,0.08))",
                      border: "1.5px solid rgba(201,151,58,0.45)",
                      color: GOLD,
                      fontSize: "0.82rem",
                      fontWeight: 900,
                      boxShadow: "0 0 12px rgba(201,151,58,0.2)",
                    }}
                  >
                    {(currentUser?.name || userEmail || "G").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="max-w-[140px] truncate" style={{ color: TEXT, fontSize: "0.82rem", fontWeight: 800 }}>
                      {currentUser?.name || "Guest User"}
                    </div>
                    <div className="max-w-[140px] truncate" style={{ color: MUTED, fontSize: "0.68rem" }}>
                      {currentUser?.email || userEmail}
                    </div>
                  </div>
                </div>

                {/* Logout button */}
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:opacity-90"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.22)",
                    color: RED,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                  }}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            )}

            {/* Mobile logout */}
            {guestAccessVerified && (
              <button
                onClick={onLogout}
                className="md:hidden p-2.5 rounded-xl transition-all duration-200 hover:opacity-80"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: RED }}
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </nav>

        <main className={`w-full max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-10 ${guestAccessVerified ? "pt-3 pb-28 sm:pb-5" : "pt-1.5 sm:pt-3 pb-2"}`}>
          <div className="max-w-6xl mx-auto w-full min-w-0">
            <div className={`w-full min-w-0 ${activeNav === "My Photos" ? "premium-page-enter block" : "hidden"}`}>
              <UserMyPhotos
                selectedEventFilter={selectedEventFilter}
                setSelectedEventFilter={setSelectedEventFilter}
                userEmail={userEmail}
                userName={currentUser?.name || "Guest User"}
                onBrandChange={setGuestBrand}
                onAccessVerified={handleGuestAccessVerified}
                selfie={selfie}
                setSelfie={setSelfie}
                selfieFile={selfieFile}
                setSelfieFile={setSelfieFile}
              />
            </div>
            <div className={activeNav === "Downloads" ? "premium-page-enter block" : "hidden"}>
              <UserDownloads userEmail={userEmail} />
            </div>
            <div className={activeNav === "Profile" ? "premium-page-enter block" : "hidden"}>
              <UserProfile currentUser={currentUser} onUpdate={(updated) => setCurrentUser(updated)} selfie={selfie} />
            </div>
          </div>
        </main>

        {guestAccessVerified && <div className="fixed inset-x-0 bottom-0 z-50 md:hidden px-2.5 pb-2 pt-2" style={{ background: "linear-gradient(180deg, rgba(7,9,13,0) 0%, rgba(7,9,13,0.96) 34%, #07090d 100%)" }}>
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl p-1.5" style={{ background: "rgba(13,15,22,0.96)", border: `1px solid ${BORDER_SOFT}`, boxShadow: "0 18px 44px rgba(0,0,0,0.45)" }}>
            {GUEST_NAV_ITEMS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => setActiveNav(label)}
                className="min-h-[58px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                style={{
                  background: activeNav === label ? "rgba(201,151,58,0.16)" : "transparent",
                  color: activeNav === label ? GOLD : MUTED,
                  fontSize: "0.68rem",
                  fontWeight: 800,
                }}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
          {/* Bottom Trust Badge */}
          <div className="text-center mt-2 pb-1.5 text-[9px] font-bold flex items-center justify-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>100% Private & Secure - Your data is never shared</span>
          </div>
        </div>}

      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: BG, fontFamily: "'Poppins', sans-serif", color: TEXT }}>

      {/* â”€â”€ DESKTOP Sidebar â”€â”€ */}
      <aside
        className="hidden lg:flex flex-col w-60 shrink-0 h-full pt-3 pb-5 relative overflow-hidden"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 18%), ${SIDEBAR_BG}`,
          borderRight: `1px solid ${BORDER}`,
          boxShadow: "18px 0 38px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: "linear-gradient(180deg, rgba(201,151,58,0.08), transparent)" }}
        />
        {role === "super_admin" ? (
          <div className="mx-3 mt-0.5 mb-4 px-3 py-4">
            <div className="flex items-center justify-center">
              <img src={logoImg} alt="MASTER STUDIO" className="h-11 w-auto object-contain" />
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setActiveNav?.("Profile")}
            className="mx-3 mt-0.5 mb-4 pt-3.5 pb-4 px-3 rounded-2xl flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-300 relative group overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.012) 100%)",
              border: "1px solid rgba(223, 183, 108, 0.12)",
              boxShadow: "0 10px 26px rgba(0, 0, 0, 0.28)"
            }}
          >
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "radial-gradient(circle at center, rgba(223, 183, 108, 0.06) 0%, transparent 70%)" }}
            />

            <div 
              className="relative rounded-full transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_18px_rgba(223,183,108,0.4)]"
              style={{
                padding: "3px",
                background: "conic-gradient(from 180deg at 50% 50%, #ffd700 0deg, #dfb76c 90deg, #7d5512 180deg, #dfb76c 270deg, #ffd700 360deg)",
                boxShadow: "0 0 15px rgba(223, 183, 108, 0.22), 0 3px 10px rgba(0, 0, 0, 0.45)",
              }}
            >
              <div 
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center relative bg-[#0d0f16]"
                style={{ border: "1.5px solid rgba(255,255,255,0.15)" }}
              >
                {(() => {
                  const logoUrl = currentUser?.brand_logo_url ? getAssetUrl(currentUser.brand_logo_url) : "";
                  const dispName = currentUser?.brand_name || currentUser?.name || userEmail || "M";
                  
                  if (logoUrl) {
                    return <img src={logoUrl} alt={dispName} className="w-full h-full object-cover" />;
                  }
                  return (
                    <span 
                      className="font-extrabold text-[1.85rem] font-serif"
                      style={{
                        background: "linear-gradient(135deg, #ffd700 0%, #dfb76c 60%, #ffffff 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {dispName.slice(0, 1).toUpperCase()}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="text-center w-full min-w-0 z-10 mt-1">
              <div 
                className="truncate text-white text-[0.85rem] font-bold font-serif group-hover:text-[#dfb76c] transition-colors duration-200"
                style={{ letterSpacing: "0.5px" }}
              >
                {currentUser?.brand_name || currentUser?.name || (userEmail ? userEmail.split("@")[0] : "Studio")}
              </div>
              <div className="text-[0.56rem] font-extrabold tracking-[0.2em] text-white/40 uppercase mt-1 transition-colors duration-200 group-hover:text-white/60">
                STUDIO OWNER
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 flex flex-col gap-4 px-2.5 overflow-y-auto sidebar-scroll">
          {menuGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <span
                className="px-3 text-[0.58rem] font-extrabold uppercase mb-1"
                style={{ color: "rgba(240,237,230,0.38)", letterSpacing: "0.16em" }}
              >
                {group.title}
              </span>
              {group.items.map(({ icon: Icon, label }) => {
                const isActive = activeNav === label;
                return (
                  <button
                    key={label}
                    onClick={() => setActiveNav(label)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-200 relative group cursor-pointer overflow-hidden"
                    style={{
                      background: isActive 
                        ? "linear-gradient(90deg, rgba(201,151,58,0.18) 0%, rgba(201,151,58,0.055) 100%)" 
                        : "transparent",
                      border: isActive ? "1px solid rgba(201,151,58,0.22)" : "1px solid transparent",
                      color: isActive ? GOLD : MUTED,
                      fontSize: "0.8rem",
                      fontWeight: isActive ? 700 : 500,
                      boxShadow: isActive ? "0 8px 20px rgba(201,151,58,0.10)" : "none",
                    }}
                  >
                    <span
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                      style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.045), rgba(255,255,255,0.01))" }}
                    />
                    {isActive && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
                        style={{ background: GOLD, boxShadow: "0 0 12px rgba(201,151,58,0.75)" }}
                      />
                    )}
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                      style={{
                        background: isActive ? "rgba(201,151,58,0.16)" : "rgba(255,255,255,0.045)",
                        border: isActive ? "1px solid rgba(201,151,58,0.28)" : "1px solid rgba(255,255,255,0.055)",
                      }}
                    >
                      <Icon 
                        size={14} 
                        style={{ 
                          color: isActive ? GOLD : MUTED, 
                          transform: isActive ? "scale(1.06)" : "scale(1)",
                          transition: "transform 200ms ease, color 200ms ease"
                        }} 
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate transition-transform duration-200 group-hover:translate-x-0.5 relative z-10">{label}</span>
                    {isActive && (
                      <ChevronRight size={13} className="relative z-10" style={{ color: GOLD, opacity: 0.9 }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        {role !== "super_admin" && (
          <div className="mx-3 mt-2.5 p-2.5 rounded-xl mb-2 shrink-0 flex flex-col gap-1.5" style={{ background: "rgba(223,183,108,0.035)", border: "1px solid rgba(223, 183, 108, 0.11)" }}>
            <div className="flex justify-between items-center text-[0.52rem] font-bold tracking-[0.1em] text-[#dfb76c] uppercase">
              <span>STORAGE TRACKER</span>
              <span>{storagePercent}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden relative" style={{ border: "1px solid rgba(255,255,255,0.02)" }}>
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${storagePercent}%`,
                  background: "linear-gradient(90deg, #dfb76c 0%, #ffd700 100%)",
                  boxShadow: "0 0 6px rgba(223, 183, 108, 0.25)"
                }}
              />
            </div>
            
            <div className="flex justify-between items-center text-[0.6rem]" style={{ color: MUTED }}>
              <span>{estimatedStorageUsed} GB / {storageLimit} GB</span>
              <span className="text-[0.58rem] font-semibold text-white/30">{totalPhotosCount} Photos</span>
            </div>
          </div>
        )}
        <div className="px-2.5 pt-2 pb-1 shrink-0 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${BORDER_SOFT}` }}>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:bg-red-500/10 cursor-pointer group"
            style={{
              color: MUTED,
              fontSize: "0.8rem",
              fontWeight: 500
            }}
          >
            <LogOut 
              size={15} 
              className="text-red-500 transition-transform duration-200 group-hover:translate-x-[-2px]" 
              style={{ color: RED }}
            />
            <span className="group-hover:text-red-400 transition-colors duration-200">Logout</span>
          </button>

          {/* Subtle Whitelabel Logo Watermark */}
          <div className="flex items-center justify-center gap-1.5 opacity-35 hover:opacity-65 transition-opacity duration-200 mt-1.5 pb-0.5 select-none">
            <span style={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "1px", color: MUTED }}>POWERED BY</span>
            <img src={logoImg} alt="MasterStudio" style={{ height: "14px", width: "auto" }} />
          </div>
        </div>
      </aside>

      {/* â”€â”€ MOBILE: More Drawer Overlay â”€â”€ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex lg:hidden">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl flex flex-col z-10 pb-safe"
            style={{ background: "#0d0f16", border: `1px solid ${BORDER}`, maxHeight: "78vh" }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pb-3" style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}>
              <img src={logoImg} alt="MasterStudio" style={{ height: "34px", width: "auto" }} />
              <div className="min-w-0 text-right">
                <div className="text-xs font-bold truncate max-w-[150px]" style={{ color: TEXT }}>{currentUser?.name || "Photographer"}</div>
                <div className="text-[10px] truncate max-w-[150px]" style={{ color: MUTED }}>{userEmail}</div>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 grid grid-cols-2 gap-2">
              {navItems.filter(i => i.label !== "Logout").map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => { setMobileMenuOpen(false); setActiveNav(label); }}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left transition-all duration-150"
                  style={{
                    background: activeNav === label ? "rgba(201,151,58,0.18)" : "rgba(255,255,255,0.04)",
                    border: activeNav === label ? `1px solid rgba(201,151,58,0.35)` : "1px solid rgba(255,255,255,0.06)",
                    color: activeNav === label ? GOLD : TEXT,
                    fontSize: "0.8rem",
                    fontWeight: activeNav === label ? 700 : 500,
                  }}
                >
                  <Icon size={15} style={{ color: activeNav === label ? GOLD : MUTED, flexShrink: 0 }} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="px-4 pb-5 pt-2 flex gap-3">
              <button
                onClick={onLogout}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: RED }}
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* â”€â”€ Main Content Pane â”€â”€ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* â”€â”€ TOPBAR â”€â”€ */}
        <header
          className="flex items-center justify-between shrink-0 relative overflow-visible z-[70]"
          style={{
            padding: "9px 16px",
            borderBottom: `1px solid ${BORDER_SOFT}`,
            background: "linear-gradient(180deg, rgba(16,18,26,0.98) 0%, rgba(10,12,16,0.96) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            minHeight: "62px",
            boxShadow: "0 10px 28px rgba(0,0,0,0.16)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,151,58,0.35), transparent)" }} />
          {/* LEFT: Logo or Active page name (mobile) / Page title (desktop) */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile View: Page Title or Logo */}
            <div className="lg:hidden">
              {(activeNav === "Dashboard" || activeNav === "Platform Overview") ? (
                <img src={logoImg} alt="MasterStudio" style={{ height: "28px", width: "auto" }} />
              ) : (
                <h1 className="truncate max-w-[190px]" style={{ fontWeight: 900, fontSize: "1.02rem", color: GOLD }}>{activeNav}</h1>
              )}
            </div>
            {/* Desktop: page title */}
            <div className="hidden lg:flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(201,151,58,0.12)", border: `1px solid ${BORDER}`, color: GOLD }}>
                  {(() => {
                    const activeItem = navItems.find((item) => item.label === activeNav);
                    const ActiveIcon = activeItem?.icon || LayoutDashboard;
                    return <ActiveIcon size={14} />;
                  })()}
                </span>
                <h1 className="truncate" style={{ color: TEXT, fontSize: "0.98rem", fontWeight: 900, lineHeight: 1.1 }}>{activeNav}</h1>
              </div>
              <p className="truncate mt-1" style={{ color: MUTED, fontSize: "0.72rem", fontWeight: 500 }}>
                {role === "super_admin" ? "MasterStudio control center" : `Welcome back, ${currentUser?.name || "Photographer"}`}
              </p>
            </div>
            <div className="hidden">
              <p style={{ color: MUTED, fontSize: "0.82rem", fontWeight: 500 }}>
                Welcome back, <span style={{ color: TEXT, fontWeight: 700 }}>{currentUser?.name || (role === "super_admin" ? "Super Admin" : "Photographer")}</span>
              </p>
            </div>
          </div>

          {/* RIGHT: Bell + Avatar + Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden xl:flex items-center gap-2">
              {(role === "photographer" || role === "admin") && (
                <>
                  <button
                    onClick={() => setActiveNav("Events")}
                    className="h-9 px-3 rounded-xl flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: "rgba(201,151,58,0.14)", border: `1px solid ${BORDER}`, color: GOLD, fontSize: "0.76rem", fontWeight: 800 }}
                  >
                    <Plus size={14} /> Event
                  </button>
                  <button
                    onClick={() => setActiveNav("Upload Photos")}
                    className="h-9 px-3 rounded-xl flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${BORDER_SOFT}`, color: TEXT, fontSize: "0.76rem", fontWeight: 700 }}
                  >
                    <Upload size={14} /> Upload
                  </button>
                </>
              )}
            </div>
            {/* Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: showNotifications ? "rgba(201,151,58,0.14)" : "rgba(255,255,255,0.045)",
                  border: `1px solid ${showNotifications ? "rgba(201,151,58,0.32)" : BORDER_SOFT}`,
                  boxShadow: showNotifications ? "0 0 0 3px rgba(201,151,58,0.08)" : "none",
                }}
                aria-label="Notifications"
              >
                <Bell size={14} style={{ color: showNotifications ? GOLD : MUTED }} />
              </button>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full flex items-center justify-center" style={{ background: RED, color: "#fff", fontSize: "0.55rem", fontWeight: 900, border: "1px solid #0a0c10", boxShadow: "0 0 0 2px rgba(239,68,68,0.14)" }}>
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
              {showNotifications && (
                <div
                  className="absolute right-0 mt-2 w-[min(23rem,calc(100vw-1.25rem))] rounded-2xl shadow-2xl z-[90] overflow-hidden"
                  style={{ background: "rgba(15,18,27,0.98)", border: `1px solid rgba(201,151,58,0.2)`, boxShadow: "0 24px 60px rgba(0,0,0,0.58)", backdropFilter: "blur(18px)" }}
                >
                  <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${BORDER_SOFT}`, background: "linear-gradient(180deg, rgba(201,151,58,0.08), rgba(15,18,27,0))" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(201,151,58,0.12)", border: `1px solid ${BORDER}`, color: GOLD }}>
                          <Bell size={14} />
                        </span>
                        <div className="min-w-0">
                          <div style={{ fontWeight: 950, fontSize: "0.92rem", color: TEXT, lineHeight: 1.15 }}>Notifications</div>
                          <div className="truncate" style={{ color: MUTED, fontSize: "0.68rem", marginTop: "3px" }}>
                            {unreadNotifications > 0
                              ? `${unreadNotifications} unread ${unreadNotifications === 1 ? "update" : "updates"} need attention`
                              : "Everything important is already read"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {unreadNotifications > 0 && (
                          <button onClick={markAllNotificationsRead} className="rounded-lg px-2 py-1 transition-all hover:bg-white/[0.06]" style={{ color: GOLD, fontSize: "0.66rem", fontWeight: 850 }}>
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setShowNotifications(false)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.06]" style={{ color: MUTED }} aria-label="Close notifications">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[22rem] overflow-y-auto p-3">
                    {notifications.length === 0 ? (
                      <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${BORDER_SOFT}` }}>
                        <span className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)", color: GREEN, border: "1px solid rgba(34,197,94,0.2)" }}>
                          <CheckCircle size={18} />
                        </span>
                        <div className="mt-3" style={{ color: TEXT, fontSize: "0.82rem", fontWeight: 900 }}>All caught up</div>
                        <div className="mt-1" style={{ color: MUTED, fontSize: "0.7rem", lineHeight: 1.45 }}>No new system updates right now.</div>
                      </div>
                    ) : notifications.map((n) => {
                      const tone = n.type === "warning"
                        ? { color: RED, bg: "rgba(239,68,68,0.1)", label: "Action needed", Icon: AlertCircle }
                        : n.type === "info"
                          ? { color: BLUE, bg: "rgba(59,130,246,0.1)", label: "System update", Icon: Clock }
                          : { color: GREEN, bg: "rgba(34,197,94,0.1)", label: "Healthy", Icon: CheckCircle };
                      const ToneIcon = tone.Icon;
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className="group w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5"
                          style={{
                            background: n.read ? "rgba(255,255,255,0.024)" : "linear-gradient(135deg, rgba(255,255,255,0.065), rgba(255,255,255,0.032))",
                            border: `1px solid ${n.read ? BORDER_SOFT : "rgba(201,151,58,0.22)"}`,
                            boxShadow: n.read ? "none" : "0 12px 26px rgba(0,0,0,0.2)",
                          }}
                        >
                          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: tone.bg, color: tone.color, border: `1px solid ${tone.color}33` }}>
                            <ToneIcon size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate" style={{ fontSize: "0.64rem", color: tone.color, lineHeight: 1, fontWeight: 900, textTransform: "uppercase" }}>{tone.label}</span>
                              <span style={{ fontSize: "0.62rem", color: MUTED, whiteSpace: "nowrap" }}>{n.time}</span>
                            </span>
                            <span className="block mt-1.5" style={{ fontSize: "0.79rem", color: n.read ? "rgba(240,237,230,0.72)" : TEXT, lineHeight: 1.35, fontWeight: 900 }}>{n.title}</span>
                            <span className="block mt-1" style={{ fontSize: "0.72rem", color: n.read ? "rgba(139,143,168,0.78)" : "rgba(196,199,216,0.96)", lineHeight: 1.5, fontWeight: 520 }}>{n.text}</span>
                            <span className="mt-2 flex items-center justify-between gap-2">
                              <span style={{ fontSize: "0.64rem", color: n.read ? MUTED : GOLD, fontWeight: n.read ? 650 : 850 }}>
                                {n.actionLabel || (n.read ? "Read" : "Click to mark as read")}
                              </span>
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GOLD, boxShadow: "0 0 8px rgba(201,151,58,0.65)" }} />}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Account chip (desktop only) */}
            <div className="hidden md:flex items-center gap-2 rounded-xl px-3 py-1.5 min-w-0" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_SOFT}` }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GREEN, boxShadow: "0 0 8px rgba(34,197,94,0.55)" }} />
              <div className="hidden lg:block min-w-0">
                <div className="truncate max-w-[130px]" style={{ fontSize: "0.74rem", fontWeight: 800, color: TEXT }}>{currentUser?.name || (role === "super_admin" ? "Super Admin" : "Photographer")}</div>
                <div className="truncate max-w-[130px]" style={{ fontSize: "0.61rem", color: MUTED }}>{currentUser?.role || (role === "super_admin" ? "Owner" : "Online")}</div>
              </div>
            </div>
          </div>
        </header>

        {/* â”€â”€ Content Body â”€â”€ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-[88px] lg:pb-5">
          <div key={activeNav} className="premium-page-enter w-full min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* â”€â”€ MOBILE Bottom Tab Bar â”€â”€ */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
        style={{
          background: "linear-gradient(180deg, rgba(10,12,16,0) 0%, rgba(10,12,16,0.97) 20%, #0a0c10 100%)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div
          className="mx-2 mb-2 rounded-2xl flex items-center"
          style={{
            background: "rgba(13,15,22,0.98)",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 -4px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
            backdropFilter: "blur(20px)",
          }}
        >
          {mobileAppNavItems.map(({ icon: Icon, label }) => {
            const isActive = activeNav === label;
            return (
              <button
                key={label}
                onClick={() => setActiveNav(label)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 relative transition-all duration-200"
                style={{ minHeight: "60px" }}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span
                    className="absolute top-1.5 left-1/2"
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: GOLD,
                      transform: "translateX(-50%)",
                      boxShadow: "0 0 6px rgba(201,151,58,0.9)",
                    }}
                  />
                )}
                <Icon
                  size={20}
                  style={{
                    color: isActive ? GOLD : MUTED,
                    transform: isActive ? "scale(1.15)" : "scale(1)",
                    transition: "transform 200ms ease, color 200ms ease",
                    filter: isActive ? "drop-shadow(0 0 6px rgba(201,151,58,0.7))" : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.58rem",
                    fontWeight: isActive ? 800 : 500,
                    color: isActive ? GOLD : MUTED,
                    transition: "color 200ms ease",
                    letterSpacing: isActive ? "0.01em" : "0",
                  }}
                >
                  {label.split(" ")[0]}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 relative transition-all duration-200"
            style={{ minHeight: "60px" }}
          >
            {/* Active indicator dot for More */}
            {(mobileMenuOpen || isMoreActive) && (
              <span
                className="absolute top-1.5 left-1/2"
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: GOLD,
                  transform: "translateX(-50%)",
                  boxShadow: "0 0 6px rgba(201,151,58,0.9)",
                }}
              />
            )}
            <Menu
              size={20}
              style={{
                color: (mobileMenuOpen || isMoreActive) ? GOLD : MUTED,
                transform: (mobileMenuOpen || isMoreActive) ? "scale(1.15)" : "scale(1)",
                transition: "transform 200ms ease, color 200ms ease",
                filter: (mobileMenuOpen || isMoreActive) ? "drop-shadow(0 0 6px rgba(201,151,58,0.7))" : "none",
              }}
            />
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: (mobileMenuOpen || isMoreActive) ? 800 : 500,
                color: (mobileMenuOpen || isMoreActive) ? GOLD : MUTED,
                transition: "color 200ms ease",
                letterSpacing: (mobileMenuOpen || isMoreActive) ? "0.01em" : "0",
              }}
            >
              More
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}

