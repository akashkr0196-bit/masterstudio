import { useEffect, useMemo, useRef, useState } from "react";
import logoImg from "../../imports/logo.png";
import { api, EventData } from "../api";
import { API_ORIGIN } from "../config";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle,
  Download,
  Home,
  Image,
  Loader2,
  Lock,
  Phone,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  X,
  ChevronLeft,
  Heart,
} from "lucide-react";


const GOLD = "#c9973a";
const BG = "#07090d";
const PANEL = "#10131a";
const TEXT = "#f8f3e7";
const MUTED = "#9498aa";
const BORDER = "rgba(245,199,95,0.16)";
const SOFT = "rgba(255,255,255,0.07)";
const GREEN = "#22c55e";
const RED = "#ef4444";
type Step = "verify" | "selfie" | "processing" | "gallery";
type MatchPhoto = {
  id: number;
  name: string;
  url: string;
  matchScore: number;
};

const getAssetUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
  return `${API_ORIGIN}${url}`;
};

const formatEventDate = (date?: string) => {
  if (!date) return "18 June 2026";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
};

function AppButton({
  children,
  onClick,
  disabled,
  type = "button",
  variant = "gold",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "gold" | "dark";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="guest-app-press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background:
          variant === "gold"
            ? "linear-gradient(180deg, #ffe69a 0%, #c9973a 100%)"
            : "rgba(255,255,255,0.06)",
        border: variant === "gold" ? "1px solid rgba(255,230,154,0.72)" : `1px solid ${SOFT}`,
        color: variant === "gold" ? BG : TEXT,
        boxShadow: variant === "gold" ? "0 14px 36px rgba(201,151,58,0.26), 0 0 22px rgba(201,151,58,0.12)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = [
    { key: "verify", label: "Verify" },
    { key: "selfie", label: "Selfie" },
    { key: "gallery", label: "Memories" },
  ];
  const activeIndex = step === "processing" ? 2 : Math.max(0, steps.findIndex((item) => item.key === step));

  return (
    <div className="flex items-center justify-center gap-2 text-[0.72rem] font-bold" style={{ color: MUTED }}>
      {steps.map((item, index) => (
        <div key={item.key} className="flex items-center gap-2">
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: index <= activeIndex ? GOLD : "rgba(255,255,255,0.18)" }}
          />
          <span style={{ color: index === activeIndex ? TEXT : MUTED }}>{item.label}</span>
          {index < steps.length - 1 && <span className="h-px w-7" style={{ background: index < activeIndex ? GOLD : SOFT }} />}
        </div>
      ))}
    </div>
  );
}

function BrandHeader({ brandLogo, brandName, verified, onBack }: { brandLogo: string; brandName: string; verified?: boolean; onBack?: () => void }) {
  return (
    <header className="sticky top-0 z-30 px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]" style={{ background: "linear-gradient(180deg, rgba(7,9,13,0.98), rgba(7,9,13,0.72), rgba(7,9,13,0))" }}>
      <div className="mx-auto flex max-w-md items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 -ml-1 rounded-xl active:scale-90 transition-all" style={{ color: MUTED, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}` }}>
            <img src={brandLogo || logoImg} alt={brandName} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate text-base font-black leading-tight" style={{ color: TEXT }}>
              <span className="truncate">{brandName}</span>
              <ShieldCheck size={13} style={{ color: GOLD }} />
            </div>
            <div className="mt-0.5 truncate text-[0.66rem] font-extrabold uppercase tracking-[0.08em]" style={{ color: GOLD }}>
              Private Gallery
            </div>
          </div>
        </div>
        {verified && (
          <div className="rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em]" style={{ color: GREEN, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.22)" }}>
            Verified
          </div>
        )}
      </div>
    </header>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const cleanValue = value.replace(/\D/g, "").slice(0, 6);
  const digits = cleanValue.padEnd(6, " ").slice(0, 6).split("");

  const applyOtpValue = (rawValue: string, startIndex = 0) => {
    const incoming = rawValue.replace(/\D/g, "").slice(0, 6 - startIndex);
    if (!incoming) return;

    const next = cleanValue.padEnd(6, " ").split("");
    incoming.split("").forEach((digit, offset) => {
      next[startIndex + offset] = digit;
    });
    const nextValue = next.join("").replace(/\s/g, "").slice(0, 6);
    onChange(nextValue);

    const nextFocusIndex = Math.min(startIndex + incoming.length, 5);
    window.setTimeout(() => refs.current[nextFocusIndex]?.focus(), 0);
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit.trim()}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          aria-label={`OTP digit ${index + 1}`}
          onChange={(event) => {
            applyOtpValue(event.target.value, index);
          }}
          onPaste={(event) => {
            event.preventDefault();
            applyOtpValue(event.clipboardData.getData("text"), index);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index].trim() && index > 0) refs.current[index - 1]?.focus();
          }}
          className="h-12 rounded-2xl text-center text-lg font-black outline-none"
          style={{ background: "rgba(255,255,255,0.055)", border: `1px solid ${BORDER}`, color: TEXT }}
        />
      ))}
    </div>
  );
}

export function FindMyPhoto({ onBack }: { onBack: () => void }) {
  const [showSplash, setShowSplash] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestMobile, setGuestMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpVerifiedToken, setOtpVerifiedToken] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verified, setVerified] = useState(false);
  const [step, setStep] = useState<Step>("verify");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [flash, setFlash] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matches, setMatches] = useState<MatchPhoto[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<number>>(new Set());
  const [favoritedPhotoIds, setFavoritedPhotoIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<"all" | "best" | "latest">("all");
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "photos" | "profile">("photos");
  const [errorMsg, setErrorMsg] = useState("");

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const [pendingNewPhotos, setPendingNewPhotos] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
    const splashTimer = window.setTimeout(() => setShowSplash(false), prefersReducedMotion ? 450 : 1450);
    return () => window.clearTimeout(splashTimer);
  }, []);

  const currentEventSelectedCount = useMemo(() => {
    return matches.filter((p) => selectedMatchIds.has(Number(p.id))).length;
  }, [matches, selectedMatchIds]);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!selectedEvent) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = API_ORIGIN.replace(/^https?:\/\//, "");
    const wsUrl = `${protocol}//${wsHost}/api/ws/events/${selectedEvent}`;

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_PHOTOS") {
            setPendingNewPhotos((prev) => prev + (data.count || 1));
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      socket.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [selectedEvent]);

  useEffect(() => {
    async function loadEvents() {
      try {
        const eventFromLink = new URLSearchParams(window.location.search).get("event");
        const data = await api.fetchPublicEvents(eventFromLink || undefined);
        setEvents(data);
        const linkedEvent = eventFromLink ? data.find((event) => event.id === eventFromLink) : null;
        setSelectedEvent(linkedEvent?.id || data[0]?.id || "");
      } catch (err) {
        console.error("Failed to load events:", err);
        setEvents([]);
      }
    }
    loadEvents();
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    return () => cameraStream?.getTracks().forEach((track) => track.stop());
  }, [cameraStream]);

  useEffect(() => {
    if (step !== "processing") return;
    setProgress(12);
    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(88, current + Math.floor(Math.random() * 9) + 3));
    }, 320);
    return () => window.clearInterval(interval);
  }, [step]);

  const selectedEventData = events.find((event) => event.id === selectedEvent);
  const brandName = selectedEventData?.photographer_brand_name || selectedEventData?.photographer_name || "MASTER STUDIO";
  const brandLogo = selectedEventData?.photographer_logo_url ? getAssetUrl(selectedEventData.photographer_logo_url) : logoImg;
  const eventName = selectedEventData?.name || "Event Gallery";
  const eventDate = formatEventDate(selectedEventData?.date);

  const filteredMatches = useMemo(() => {
    const sorted = [...matches];
    if (filter === "best") return sorted.sort((a, b) => b.matchScore - a.matchScore);
    if (filter === "latest") return sorted.reverse();
    return sorted;
  }, [filter, matches]);

  useEffect(() => {
    if (previewPhotoIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setPreviewPhotoIndex((prev) => (prev! + 1) % filteredMatches.length);
      } else if (e.key === "ArrowLeft") {
        setPreviewPhotoIndex((prev) => (prev! - 1 + filteredMatches.length) % filteredMatches.length);
      } else if (e.key === "Escape") {
        setPreviewPhotoIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPhotoIndex, filteredMatches]);

  const sendOtp = async () => {
    if (!guestName.trim() || guestMobile.length < 10) {
      setErrorMsg("Name aur 10 digit mobile number required hai.");
      return;
    }
    if (!selectedEvent) {
      setErrorMsg("Valid event QR link required hai.");
      return;
    }
    setErrorMsg("");
    setSendingOtp(true);
    try {
      const result = await api.sendOtp(selectedEvent, guestName.trim(), guestMobile.trim());
      setOtpValue("");
      setOtpVerifiedToken("");
      setDebugOtp(result.debug_otp || "");
      setOtpSent(true);
      window.setTimeout(() => document.querySelector<HTMLInputElement>("[aria-label='OTP digit 1']")?.focus(), 80);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "OTP send nahi hua. Dobara try karo.");
    } finally {
      setSendingOtp(false);
    }
  };

  const continueAfterOtp = async () => {
    if (otpValue.length !== 6) {
      setErrorMsg("6 digit OTP enter karo.");
      return;
    }
    if (!selectedEvent) {
      setErrorMsg("Valid event QR link required hai.");
      return;
    }
    try {
      setErrorMsg("");
      const result = await api.verifyOtp(selectedEvent, guestMobile.trim(), otpValue);
      setOtpVerifiedToken(result.verification_token);
      setVerified(true);
      window.navigator.vibrate?.(35);
      window.setTimeout(() => {
        setStep("selfie");
        window.setTimeout(() => {
          startLiveCamera();
        }, 180);
      }, 620);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "OTP verify nahi hua. Dobara try karo.");
    }
  };

  const startLiveCamera = async () => {
    try {
      setErrorMsg("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 900 }, height: { ideal: 1200 } },
        audio: false,
      });
      setCameraOpen(true);
      setCameraStream(stream);
    } catch (err) {
      console.error("Camera open failed:", err);
      setErrorMsg("Camera permission allow karo, phir capture retry karo.");
    }
  };

  const stopLiveCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraOpen(false);
  };

  const runSearch = async (file: File) => {
    if (!selectedEvent) {
      setErrorMsg("Event select nahi hua. QR link check karo.");
      setStep("selfie");
      return;
    }

    setStep("processing");
    setSelectedMatchIds(new Set());
    setMatches([]);

    try {
      const result = await api.searchSelfie(selectedEvent, guestName.trim() || "Guest User", file, guestMobile, otpVerifiedToken);
      const nextMatches = result.matches.map((match) => ({
        id: match.photo_id,
        name: match.name,
        url: getAssetUrl(match.url),
        matchScore: Math.round(match.similarity * 100),
      }));
      setProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 520));
      setMatches(nextMatches);
      try {
        const favs = await api.fetchGuestSelections(guestMobile, selectedEvent, otpVerifiedToken);
        setFavoritedPhotoIds(favs);
      } catch (e) {
        console.error("Error loading existing selections:", e);
      }
      setStep("gallery");
    } catch (err) {
      console.error("Search failed:", err);
      setProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      setErrorMsg("Search failed. Event photos upload/index hone ke baad retry karo.");
      setStep("selfie");
    }
  };

  const handleToggleFavorite = async (photoId: number) => {
    try {
      await api.toggleSelectionFavorite(selectedEvent, photoId, guestMobile, guestName, otpVerifiedToken);
      setFavoritedPhotoIds(prev => 
        prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
      );
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      alert("Selection update failed. Please try again.");
    }
  };

  const captureLiveSelfie = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setErrorMsg("Camera ready nahi hai. Ek second wait karo.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 900;
    canvas.height = video.videoHeight || 1200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;

    const file = new File([blob], `guest-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(blob));
    setFlash(true);
    window.navigator.vibrate?.(40);
    window.setTimeout(() => setFlash(false), 220);
    stopLiveCamera();
    await runSearch(file);
  };

  const toggleMatchSelection = (photoId: any) => {
    const id = Number(photoId);
    setSelectedMatchIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedMatchIds((current) => {
      const allSelected = matches.length > 0 && matches.every((photo) => current.has(Number(photo.id)));
      const next = new Set(current);
      if (allSelected) {
        matches.forEach((photo) => next.delete(Number(photo.id)));
      } else {
        matches.forEach((photo) => next.add(Number(photo.id)));
      }
      return next;
    });
  };

  const downloadPhoto = async (photo: MatchPhoto) => {
    try {
      await api.downloadPhoto(photo.id, photo.name, photo.url);
    } catch {
      window.location.href = photo.url;
    }
  };

  const downloadSelected = async () => {
    const ids = matches.filter((photo) => selectedMatchIds.has(Number(photo.id))).map((photo) => Number(photo.id));
    if (ids.length === 0) return;
    try {
      await api.downloadPhotosZip(ids, `${eventName.replace(/\s+/g, "-").toLowerCase()}-memories.zip`);
    } catch {
      for (const photo of matches.filter((item) => selectedMatchIds.has(Number(item.id)))) {
        await downloadPhoto(photo);
      }
    }
  };

  const shareMemories = async () => {
    const text = `${matches.length} memories found in ${eventName}`;
    if (navigator.share) {
      await navigator.share({ title: "MasterStudio Memories", text, url: window.location.href });
      return;
    }
    await navigator.clipboard?.writeText(window.location.href);
  };

  const handleRefreshPhotos = async () => {
    setPendingNewPhotos(0);
    if (selfieFile) {
      await runSearch(selfieFile);
    }
  };

  const showNextPhoto = () => {
    if (previewPhotoIndex === null) return;
    setPreviewPhotoIndex((prev) => (prev! + 1) % filteredMatches.length);
  };

  const showPrevPhoto = () => {
    if (previewPhotoIndex === null) return;
    setPreviewPhotoIndex((prev) => (prev! - 1 + filteredMatches.length) % filteredMatches.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      showNextPhoto();
    } else if (diff < -50) {
      showPrevPhoto();
    }
  };

  return (
    <div className="guest-app-shell fixed inset-0 flex flex-col overflow-hidden" style={{ background: BG, color: TEXT, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .guest-app-press:active {
          transform: scale(0.97);
          opacity: 0.9;
        }
        .guest-app-press {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .guest-splash {
          animation: guestSplashOut 0.45s ease 1.12s forwards;
        }
        .guest-splash-logo {
          animation: guestSplashLogo 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .guest-splash-ring {
          animation: guestSplashRing 1.35s ease-out infinite;
        }
        .guest-splash-scan {
          animation: guestSplashScan 1.25s ease-in-out infinite;
        }
        .guest-splash-dots span {
          animation: guestSplashDot 0.9s ease-in-out infinite;
        }
        .guest-splash-dots span:nth-child(2) {
          animation-delay: 0.12s;
        }
        .guest-splash-dots span:nth-child(3) {
          animation-delay: 0.24s;
        }
        @keyframes guestSplashLogo {
          0% { transform: translateY(12px) scale(0.88); opacity: 0; filter: blur(8px); }
          55% { transform: translateY(0) scale(1.04); opacity: 1; filter: blur(0); }
          100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes guestSplashRing {
          0% { transform: scale(0.88); opacity: 0.7; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes guestSplashScan {
          0%, 100% { transform: translateY(-46px); opacity: 0; }
          20%, 80% { opacity: 1; }
          50% { transform: translateY(46px); opacity: 1; }
        }
        @keyframes guestSplashDot {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes guestSplashOut {
          to { opacity: 0; transform: scale(1.015); visibility: hidden; }
        }
        @media (prefers-reduced-motion: reduce) {
          .guest-splash,
          .guest-splash-logo,
          .guest-splash-ring,
          .guest-splash-scan,
          .guest-splash-dots span {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
      {showSplash && (
        <div className="guest-splash absolute inset-0 z-[80] flex flex-col items-center justify-center px-8 text-center" style={{ background: "radial-gradient(circle at 50% 38%, rgba(201,151,58,0.16), transparent 34%), linear-gradient(180deg, #07090d 0%, #0c1018 54%, #07090d 100%)" }}>
          <div className="guest-splash-logo relative flex h-28 w-28 items-center justify-center rounded-[2rem]" style={{ background: "rgba(255,255,255,0.055)", border: `1px solid ${BORDER}`, boxShadow: "0 22px 70px rgba(0,0,0,0.42)" }}>
            <span className="guest-splash-ring absolute inset-0 rounded-[2rem]" style={{ border: `1px solid ${GOLD}` }} />
            <span className="guest-splash-ring absolute inset-0 rounded-[2rem]" style={{ border: `1px solid rgba(255,230,154,0.55)`, animationDelay: "0.25s" }} />
            <img src={brandLogo || logoImg} alt={brandName} className="relative z-10 max-h-20 max-w-20 object-contain" />
            <span className="guest-splash-scan absolute left-5 right-5 z-20 h-px rounded-full" style={{ background: "linear-gradient(90deg, transparent, #ffe69a, transparent)", boxShadow: "0 0 18px rgba(255,230,154,0.75)" }} />
          </div>
          <div className="mt-7">
            <div className="text-[0.68rem] font-black uppercase tracking-[0.22em]" style={{ color: GOLD }}>Private Gallery</div>
            <h1 className="mt-2 text-2xl font-black leading-tight" style={{ color: TEXT }}>{brandName}</h1>
            <p className="mt-2 text-sm font-semibold" style={{ color: MUTED }}>Preparing your secure photo experience</p>
          </div>
          <div className="guest-splash-dots mt-7 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: GOLD }} />
            <span className="h-2 w-2 rounded-full" style={{ background: GOLD }} />
            <span className="h-2 w-2 rounded-full" style={{ background: GOLD }} />
          </div>
        </div>
      )}
      <BrandHeader brandLogo={brandLogo} brandName={brandName} verified={verified} onBack={onBack} />

      {/* Real-time Update Alert Toast */}
      {step === "gallery" && pendingNewPhotos > 0 && (
        <div 
          onClick={handleRefreshPhotos}
          className="absolute bottom-[96px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl animate-bounce"
          style={{
            background: "linear-gradient(135deg, #ffe69a 0%, #c9973a 100%)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: BG,
            boxShadow: "0 10px 25px rgba(201,151,58,0.4), 0 0 10px rgba(201,151,58,0.15)",
          }}
        >
          <Sparkles size={15} className="animate-pulse" style={{ color: BG }} />
          <span className="text-[0.68rem] sm:text-xs font-black tracking-wide whitespace-nowrap">
            📸 New Photos Added — {pendingNewPhotos} new photo{pendingNewPhotos > 1 ? 's are' : ' is'} available. Tap to view.
          </span>
          <ArrowRight size={13} style={{ color: BG }} />
        </div>
      )}

      <main className="mx-auto flex-1 overflow-y-auto w-full max-w-md flex flex-col px-4 pb-[calc(6.8rem+env(safe-area-inset-bottom))] no-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="guest-app-slide flex flex-1 flex-col">
          {step !== "gallery" && <Stepper step={step} />}

          {step === "verify" && (
            <section className="flex flex-1 flex-col justify-center gap-5 py-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(201,151,58,0.12)", border: `1px solid ${BORDER}` }}>
                  <Sparkles size={24} style={{ color: GOLD }} />
                </div>
                <h1 className="text-2xl font-black leading-tight">Welcome to your private gallery</h1>
                {events.length > 0 ? (
                  <div className="mt-4 rounded-3xl p-4 text-left flex flex-col gap-1.5" style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${SOFT}` }}>
                    <label style={{ color: GOLD, fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Choose Event</label>
                    <div className="relative">
                      <select 
                        value={selectedEvent} 
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="w-full h-12 bg-[#10131a] border rounded-2xl pl-4 pr-10 text-sm font-extrabold outline-none cursor-pointer appearance-none"
                        style={{ borderColor: "rgba(245,199,95,0.22)", color: TEXT }}
                      >
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id} style={{ background: "#0d0f16", color: TEXT }}>
                            {ev.name} ({formatEventDate(ev.date)})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `6px solid ${GOLD}` }} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-3xl p-4 text-left" style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${SOFT}` }}>
                    <div className="text-lg font-extrabold">{eventName}</div>
                    <div className="mt-1 text-sm font-semibold" style={{ color: MUTED }}>{eventDate}</div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <label className="relative block">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2" size={17} style={{ color: GOLD }} />
                  <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Your Name" className="h-13 w-full rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none" style={{ background: PANEL, border: `1px solid ${BORDER}`, color: TEXT }} />
                </label>
                <label className="relative block">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2" size={17} style={{ color: GOLD }} />
                  <input value={guestMobile} onChange={(event) => setGuestMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Mobile Number" inputMode="numeric" className="h-13 w-full rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none" style={{ background: PANEL, border: `1px solid ${BORDER}`, color: TEXT }} />
                </label>
              </div>

              {!otpSent ? (
                <AppButton onClick={sendOtp} disabled={sendingOtp}>
                  {sendingOtp ? <Loader2 size={17} className="animate-spin" /> : <Phone size={17} />}
                  Send OTP
                </AppButton>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl px-4 py-3 text-center text-xs font-extrabold" style={{ background: "rgba(201,151,58,0.12)", color: GOLD, border: `1px solid ${BORDER}` }}>
                    {debugOtp ? `Local test OTP: ${debugOtp}` : "OTP sent to your mobile number."}
                  </div>
                  <OtpInput value={otpValue} onChange={setOtpValue} />
                  {verified ? (
                    <div className="guest-success-pop flex items-center justify-center gap-2 rounded-2xl p-3 text-sm font-extrabold" style={{ background: "rgba(34,197,94,0.12)", color: GREEN, border: "1px solid rgba(34,197,94,0.2)" }}>
                      <CheckCircle size={18} />
                      Verified Successfully
                    </div>
                  ) : (
                    <AppButton onClick={continueAfterOtp}>
                      Continue
                      <ArrowRight size={17} />
                    </AppButton>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-xs font-bold" style={{ color: MUTED }}>
                <Lock size={14} style={{ color: GOLD }} />
                100% Private - AI Matching
              </div>
              {errorMsg && <div className="rounded-2xl p-3 text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", color: RED, border: "1px solid rgba(239,68,68,0.2)" }}>{errorMsg}</div>}
            </section>
          )}

          {step === "selfie" && (
            <section className="flex flex-1 flex-col gap-5 py-6">
              <div className="text-center">
                <h1 className="text-2xl font-black">Selfie Capture</h1>
                <p className="mt-2 text-sm" style={{ color: MUTED }}>Place your face inside the frame</p>
              </div>

              <div className="relative flex min-h-[320px] sm:min-h-[430px] flex-1 flex-col items-center justify-center gap-4 sm:gap-6 overflow-hidden rounded-[2rem] px-5 py-5 sm:py-7" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))", border: `1px solid ${BORDER}` }}>
                <div className="guest-camera-grid absolute inset-0" />
                {flash && <div className="absolute inset-0 z-20 bg-white" />}

                <div className="guest-face-guide relative z-10 h-[200px] w-[200px] sm:h-[280px] sm:w-[280px] overflow-hidden rounded-full">
                  {cameraOpen ? (
                    <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  ) : selfiePreview ? (
                    <img src={selfiePreview} alt="Captured selfie" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ background: "rgba(0,0,0,0.22)" }}>
                      <Camera size={54} className="sm:size-[72px]" style={{ color: "rgba(255,255,255,0.2)" }} />
                    </div>
                  )}
                  <div className="guest-face-crosshair" />
                </div>

                <div className="relative z-10 grid w-full">
                  {!cameraOpen ? (
                    <AppButton onClick={startLiveCamera}>
                      <Camera size={18} />
                      Open Camera
                    </AppButton>
                  ) : (
                    <AppButton onClick={captureLiveSelfie}>
                      <Camera size={18} />
                      Capture Selfie
                    </AppButton>
                  )}
                </div>

                {cameraOpen && (
                  <div className="relative z-10 text-center text-xs font-bold" style={{ color: MUTED }}>
                    Face ko circle ke center me rakhein
                  </div>
                )}
              </div>

              {errorMsg && <div className="rounded-2xl p-3 text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", color: RED, border: "1px solid rgba(239,68,68,0.2)" }}>{errorMsg}</div>}
            </section>
          )}

          {step === "processing" && (
            <section className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
              <div className="guest-ai-orbit relative flex h-36 w-36 items-center justify-center rounded-full" style={{ border: `1px solid ${BORDER}` }}>
                <Search size={42} style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-black">AI Finding Your Memories</h1>
                <p className="mt-2 text-sm" style={{ color: MUTED }}>Scanning your face...</p>
              </div>
              <div className="w-full rounded-3xl p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                <div className="mb-2 flex items-center justify-between text-xs font-black">
                  <span style={{ color: MUTED }}>Checking 10,000+ photos</span>
                  <span style={{ color: GOLD }}>{progress}%</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #c9973a, #ffe69a)" }} />
                  <div className="guest-scanner-line absolute inset-y-0 w-14" />
                </div>
              </div>
            </section>
          )}

          {step === "gallery" && activeTab === "photos" && (
            <section className="flex flex-col gap-4.5 py-3">
              {/* Premium Stat Header Card */}
              <div className="flex items-start justify-between gap-3 animate-fadeIn">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider uppercase" style={{ color: GOLD }}>
                    <Sparkles size={12} className="animate-pulse" />
                    AI MATCH SCAN
                  </div>
                  <h1 
                    className="mt-1 text-2.5xl font-black tracking-tight"
                    style={{ 
                      background: "linear-gradient(135deg, #ffffff 0%, #ffe69a 60%, #c9973a 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}
                  >
                    {matches.length} Memories Found
                  </h1>
                </div>
                <button 
                  onClick={shareMemories} 
                  className="guest-app-press flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200" 
                  style={{ 
                    background: "linear-gradient(135deg, rgba(201,151,58,0.14) 0%, rgba(255,255,255,0.03) 100%)", 
                    border: "1px solid rgba(201,151,58,0.22)", 
                    color: GOLD,
                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
                  }} 
                  aria-label="Share memories"
                >
                  <Share2 size={18} />
                </button>
              </div>

              {/* Premium Capsule Filter */}
              <div className="grid grid-cols-3 gap-1 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)" }}>
                {[
                  { key: "all", label: "All Photos" },
                  { key: "best", label: "Best Match" },
                  { key: "latest", label: "Latest" },
                ].map((item) => {
                  const isAct = filter === item.key;
                  return (
                    <button 
                      key={item.key} 
                      onClick={() => setFilter(item.key as typeof filter)} 
                      className="rounded-xl py-2 text-xs font-black tracking-wide transition-all duration-200 guest-app-press" 
                      style={{ 
                        background: isAct ? "linear-gradient(135deg, rgba(201,151,58,0.26) 0%, rgba(201,151,58,0.08) 100%)" : "transparent", 
                        border: isAct ? "1px solid rgba(201,151,58,0.22)" : "1px solid transparent",
                        color: isAct ? GOLD : MUTED,
                        boxShadow: isAct ? "0 4px 12px rgba(201,151,58,0.12)" : "none"
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Select All glass bar */}
              {matches.length > 0 && (
                <div className="flex justify-between items-center px-1 py-0.5 animate-fadeIn">
                  <button onClick={toggleSelectAll} className="inline-flex items-center gap-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200" style={{ color: currentEventSelectedCount === matches.length ? GOLD : TEXT }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg transition-all" style={{ background: currentEventSelectedCount === matches.length ? "linear-gradient(180deg, #ffe69a 0%, #c9973a 100%)" : "rgba(255,255,255,0.05)", color: BG, border: currentEventSelectedCount === matches.length ? "none" : "1px solid rgba(255,255,255,0.18)", boxShadow: currentEventSelectedCount === matches.length ? "0 0 8px rgba(201,151,58,0.35)" : "none" }}>
                      {currentEventSelectedCount === matches.length && <Check size={11} strokeWidth={3.5} />}
                    </span>
                    Select All
                  </button>
                  <span className="text-[0.66rem] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md" style={{ color: MUTED, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    {currentEventSelectedCount} / {matches.length} SELECTED
                  </span>
                </div>
              )}

              {/* Empty state */}
              {matches.length === 0 ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center gap-4.5 rounded-[2rem] p-6 text-center" style={{ background: "linear-gradient(180deg, #10131a 0%, #0c0e14 100%)", border: `1px solid ${BORDER}`, boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <AlertCircle size={32} style={{ color: RED }} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-white">No memories found yet</div>
                    <p className="text-xs mt-2 max-w-[260px] mx-auto" style={{ color: MUTED, lineHeight: 1.55 }}>
                      Event photos verify or index hone ke baad, ya light change hone par face scan failed ho sakta hai. Retake karke retry karein.
                    </p>
                  </div>
                  <AppButton onClick={() => setStep("selfie")} variant="gold">
                    <Camera size={15} /> Retake Selfie
                  </AppButton>
                </div>
              ) : (
                /* Premium Match Cards Grid */
                <div className="grid grid-cols-2 gap-3.5">
                  {filteredMatches.map((photo, index) => {
                    const isSelected = selectedMatchIds.has(Number(photo.id));
                    const isBest = photo.matchScore >= 85;
                    const isFav = favoritedPhotoIds.includes(photo.id);
                    return (
                      <div
                        key={photo.id}
                        onClick={() => {
                          const idx = filteredMatches.findIndex((p) => p.id === photo.id);
                          setPreviewPhotoIndex(idx !== -1 ? idx : null);
                        }}
                        className="guest-photo-reveal group relative aspect-[0.76] overflow-hidden rounded-2.5xl cursor-pointer transition-all duration-300"
                        style={{ 
                          animationDelay: `${index * 45}ms`, 
                          background: "rgba(255,255,255,0.03)", 
                          border: isSelected 
                            ? "2px solid #ffd700" 
                            : isBest 
                              ? "1px solid rgba(201,151,58,0.28)" 
                              : "1px solid rgba(255,255,255,0.08)",
                          boxShadow: isSelected 
                            ? "0 10px 25px rgba(201,151,58,0.22), 0 0 15px rgba(201,151,58,0.1)" 
                            : "0 4px 15px rgba(0,0,0,0.2)"
                        }}
                      >
                        {/* Highly Matched premium glowing ambient backdrop */}
                        {isBest && !isSelected && (
                          <div className="absolute inset-0 z-0 opacity-10 bg-radial-gradient pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(201,151,58,0.4) 0%, transparent 60%)" }} />
                        )}

                        <img src={photo.url} alt={photo.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-106" loading="lazy" />
                        
                        {/* Gradient bottom overlay for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-80 z-0 pointer-events-none" />

                        {/* Top Badges */}
                        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5 z-10">
                          {/* Match Score Badge with ambient blur */}
                          <span 
                            className="rounded-full px-2.5 py-1 text-[0.6rem] font-extrabold flex items-center gap-1 shadow-lg" 
                            style={{ 
                              background: isBest ? "linear-gradient(90deg, rgba(201,151,58,0.92) 0%, rgba(13,15,22,0.92) 100%)" : "rgba(10,12,16,0.85)", 
                              color: isBest ? "#ffe69a" : TEXT,
                              border: isBest ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                              backdropFilter: "blur(6px)"
                            }}
                          >
                            {isBest && <Sparkles size={8} className="animate-pulse" />}
                            {photo.matchScore}% Match
                          </span>

                          {/* Round Selection Checkbox */}
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleMatchSelection(Number(photo.id));
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 shadow-md active:scale-90"
                            style={{ 
                              background: isSelected ? "linear-gradient(135deg, #ffe69a 0%, #c9973a 100%)" : "rgba(0,0,0,0.58)", 
                              color: isSelected ? BG : TEXT,
                              border: isSelected ? "none" : "1px solid rgba(255,255,255,0.15)"
                            }}
                            aria-label="Select photo"
                          >
                            {isSelected ? <Check size={14} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                          </button>
                        </div>

                        {/* Bottom Actions inside Card */}
                        <button
                          onClick={async (event) => {
                            event.stopPropagation();
                            await handleToggleFavorite(photo.id);
                          }}
                          className="absolute bottom-2.5 right-2.5 flex items-center justify-center rounded-full shadow-lg transition-all duration-300 active:scale-80 hover:scale-105"
                          style={{
                            width: "32px",
                            height: "32px",
                            background: isFav ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" : "rgba(10,12,16,0.65)",
                            backdropFilter: "blur(6px)",
                            border: isFav ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.12)",
                            color: "#fff",
                            zIndex: 10
                          }}
                          aria-label="Favorite photo"
                        >
                          <Heart size={13} fill={isFav ? "#fff" : "none"} style={{ color: "#fff", filter: isFav ? "drop-shadow(0 0 5px rgba(239,68,68,0.5))" : "none" }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {step === "gallery" && activeTab === "profile" && (
            <section className="premium-page-enter flex flex-col gap-5 py-4.5 animate-fadeIn">
              {/* Profile Card */}
              <div 
                className="flex flex-col items-center text-center p-6 rounded-[2rem] relative overflow-hidden" 
                style={{ 
                  background: "linear-gradient(180deg, #10131a 0%, #0c0e14 100%)", 
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                }}
              >
                <div className="absolute top-0 right-0 w-36 h-36 rounded-full blur-[60px] opacity-10 pointer-events-none" style={{ background: GOLD }} />

                {/* Selfie Image Container */}
                <div className="relative mb-4">
                  {/* Conic Golden Gradient border avatar */}
                  <div 
                    className="relative rounded-full transition-all duration-300 shadow-[0_4px_20px_rgba(201,151,58,0.22)]"
                    style={{
                      padding: "2.5px",
                      background: "conic-gradient(from 180deg at 50% 50%, #ffd700 0deg, #dfb76c 90deg, #7d5512 180deg, #dfb76c 270deg, #ffd700 360deg)"
                    }}
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#0c0e14] bg-[#0d0f16] flex items-center justify-center">
                      {selfiePreview ? (
                        <img src={selfiePreview} alt="Guest Selfie" className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} style={{ color: MUTED }} />
                      )}
                    </div>
                  </div>
                  
                  {matches.length === 0 && (
                    <button 
                      onClick={() => {
                        setStep("selfie");
                        startLiveCamera();
                      }}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md guest-app-press"
                      style={{ background: "linear-gradient(180deg, #ffe69a 0%, #c9973a 100%)", color: BG, border: "1px solid rgba(255,255,255,0.2)" }}
                      title="Retake Selfie"
                    >
                      <Camera size={12} />
                    </button>
                  )}
                </div>

                <h2 className="text-lg font-black tracking-tight text-white">{guestName || "Guest User"}</h2>
                <p className="text-xs mt-1" style={{ color: MUTED }}>+91 {guestMobile || "9876543210"}</p>

                <div className="mt-3.5 flex flex-col items-center gap-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.62rem] font-bold uppercase tracking-wider" style={{ color: GREEN, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Verified Session
                  </div>
                  {matches.length > 0 && (
                    <div className="flex items-center gap-1 text-[0.6rem] font-black uppercase tracking-widest mt-0.5" style={{ color: GOLD }}>
                      <Lock size={10} />
                      Selfie Data Locked
                    </div>
                  )}
                </div>
              </div>

              {/* Event & Photographer Info Card */}
              <div className="flex flex-col gap-4.5 p-5 rounded-[2rem]" style={{ background: "linear-gradient(180deg, #10131a 0%, #0c0e14 100%)", border: `1px solid ${BORDER}` }}>
                <div className="text-[0.62rem] font-black uppercase tracking-widest" style={{ color: GOLD }}>Connected Event</div>
                
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <img src={brandLogo || logoImg} alt={brandName} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold truncate text-white">{eventName}</div>
                    <div className="text-[0.7rem]" style={{ color: MUTED }}>{eventDate}</div>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: MUTED }}>Photographer Brand</span>
                  <span className="font-extrabold" style={{ color: GOLD }}>{brandName}</span>
                </div>
              </div>

              {/* Statistics Card */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 rounded-[1.5rem] flex flex-col gap-1.5" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <span className="text-[0.6rem] font-black uppercase tracking-widest" style={{ color: MUTED }}>Memories</span>
                  <span className="text-xl font-black text-white">{matches.length} Photos</span>
                </div>
                <div className="p-4 rounded-[1.5rem] flex flex-col gap-1.5" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                  <span className="text-[0.6rem] font-black uppercase tracking-widest" style={{ color: MUTED }}>Status</span>
                  <span className="text-xs font-black flex items-center gap-1 mt-1" style={{ color: GREEN }}>
                    <ShieldCheck size={15} /> Secure Link
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 mt-2">
                {matches.length > 0 && (
                  <button
                    onClick={() => {
                      setStep("selfie");
                      startLiveCamera();
                    }}
                    className="w-full min-h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold active:scale-95 transition-all guest-app-press"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: TEXT,
                    }}
                  >
                    <Camera size={15} style={{ color: GOLD }} />
                    Retake Search Selfie
                  </button>
                )}

                <button
                  onClick={onBack}
                  className="w-full min-h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold active:scale-95 transition-all guest-app-press"
                  style={{
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.18)",
                    color: RED,
                  }}
                >
                  Exit Private Gallery
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Floating Bottom Tab Bar when no selections */}
      {step === "gallery" && currentEventSelectedCount === 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.9rem,env(safe-area-inset-bottom)+0.2rem)] pt-3" style={{ background: "linear-gradient(180deg, rgba(7,9,13,0), rgba(7,9,13,0.96) 28%, #07090d)" }}>
          <div className="mx-auto grid max-w-md grid-cols-3 gap-1 rounded-3xl p-1.5" style={{ background: "rgba(16,19,26,0.92)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 15px 35px rgba(0,0,0,0.5)", backdropFilter: "blur(18px)" }}>
            {[
              { key: "home", label: "Home", icon: Home, action: onBack },
              { key: "photos", label: "Photos", icon: Image, action: () => setActiveTab("photos") },
              { key: "profile", label: "Profile", icon: User, action: () => setActiveTab("profile") },
            ].map(({ key, label, icon: Icon, action }) => {
              const isAct = activeTab === key;
              return (
                <button 
                  key={key} 
                  onClick={action} 
                  className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl text-[0.66rem] font-black tracking-wide transition-all duration-200 guest-app-press" 
                  style={{ 
                    background: isAct ? "linear-gradient(135deg, rgba(201,151,58,0.2) 0%, rgba(201,151,58,0.05) 100%)" : "transparent", 
                    color: isAct ? GOLD : MUTED 
                  }}
                >
                  <Icon size={18} style={{ color: isAct ? GOLD : MUTED, transform: isAct ? "scale(1.1)" : "scale(1)", transition: "all 0.2s" }} />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Floating Bottom Action Dock when photos are selected */}
      {step === "gallery" && currentEventSelectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1.2rem,env(safe-area-inset-bottom)+0.6rem)] pt-3" style={{ background: "linear-gradient(180deg, rgba(7,9,13,0), rgba(7,9,13,0.98) 20%, #07090d)" }}>
          <div className="mx-auto max-w-md rounded-3xl p-3.5 flex items-center justify-between gap-4" style={{ background: "rgba(16,20,28,0.92)", border: "1px solid rgba(201,151,58,0.3)", boxShadow: "0 20px 50px rgba(0,0,0,0.55), 0 0 30px rgba(201,151,58,0.15)", backdropFilter: "blur(20px)" }}>
            <div className="text-left shrink-0">
              <div className="text-sm font-black text-white">{currentEventSelectedCount} Selected</div>
              <button onClick={() => setSelectedMatchIds((current) => {
                const next = new Set(current);
                matches.forEach((p) => next.delete(Number(p.id)));
                return next;
              })} className="text-[0.66rem] font-black underline transition-colors guest-app-press" style={{ color: GOLD }}>Deselect all</button>
            </div>
            <button
              onClick={downloadSelected}
              className="flex-1 min-h-12 rounded-[1.25rem] flex items-center justify-center gap-2 text-sm font-extrabold active:scale-95 transition-all guest-app-press"
              style={{
                background: "linear-gradient(135deg, #ffe69a 0%, #c9973a 100%)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: BG,
                boxShadow: "0 8px 25px rgba(201,151,58,0.3)"
              }}
            >
              <Download size={16} strokeWidth={2.5} />
              Download HD (.zip)
            </button>
          </div>
        </div>
      )}

      {/* Premium Fullscreen Photo Preview Modal */}
      {previewPhotoIndex !== null && filteredMatches[previewPhotoIndex] && (() => {
        const photo = filteredMatches[previewPhotoIndex];
        const isFav = favoritedPhotoIds.includes(photo.id);
        const isSelected = selectedMatchIds.has(Number(photo.id));

        return (
          <div 
            className="absolute inset-0 z-[60] flex flex-col justify-between bg-black/96 animate-fadeIn select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => setPreviewPhotoIndex(null)}
          >
            {/* Stunning ambient blurred background glow */}
            <div className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-3xl pointer-events-none scale-110" style={{ backgroundImage: `url(${photo.url})` }} />

            {/* Top Navigation Bar */}
            <div className="relative z-10 flex items-center justify-between px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-black/80 to-transparent" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setPreviewPhotoIndex(null)} 
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white active:scale-90 transition-all"
                aria-label="Close preview"
              >
                <ChevronLeft size={20} />
              </button>
              
              <span className="text-xs font-black tracking-widest text-white/80 uppercase">
                {previewPhotoIndex + 1} of {filteredMatches.length}
              </span>

              <button 
                onClick={() => handleToggleFavorite(photo.id)} 
                className="flex h-10 w-10 items-center justify-center rounded-xl active:scale-90 transition-all"
                style={{
                  background: isFav ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" : "rgba(255,255,255,0.1)",
                  border: isFav ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.15)",
                  color: "#fff"
                }}
                aria-label="Favorite photo"
              >
                <Heart size={16} fill={isFav ? "#fff" : "none"} style={{ color: "#fff" }} />
              </button>
            </div>

            {/* Center Slider Viewport */}
            <div className="relative flex-1 flex items-center justify-center px-4" onClick={() => setPreviewPhotoIndex(null)}>
              {/* Left arrow overlay */}
              <button 
                onClick={(e) => { e.stopPropagation(); showPrevPhoto(); }}
                className="absolute left-4 z-20 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white/70 hover:text-white hover:scale-105 active:scale-90 transition-all"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Central Image Container */}
              <div className="relative max-h-[66vh] max-w-full z-10 flex items-center justify-center animate-scaleUp" onClick={(e) => e.stopPropagation()}>
                <img 
                  src={photo.url} 
                  alt={photo.name} 
                  className="max-h-[66vh] max-w-full object-contain rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]" 
                />
              </div>

              {/* Right arrow overlay */}
              <button 
                onClick={(e) => { e.stopPropagation(); showNextPhoto(); }}
                className="absolute right-4 z-20 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white/70 hover:text-white hover:scale-105 active:scale-90 transition-all"
              >
                <ArrowRight size={20} />
              </button>
            </div>

            {/* Bottom Actions Panel */}
            <div className="relative z-10 p-5 pb-[max(1.2rem,env(safe-area-inset-bottom)+0.6rem)] bg-gradient-to-t from-black/90 via-black/75 to-transparent flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="rounded-full px-2.5 py-0.5 text-[0.62rem] font-extrabold tracking-wide uppercase" style={{ background: "rgba(34,197,94,0.15)", color: GREEN, border: "1px solid rgba(34,197,94,0.3)" }}>
                    {photo.matchScore}% Match
                  </span>
                  <div className="mt-1 text-[0.66rem] font-bold text-white/50 truncate max-w-[180px]">{photo.name}</div>
                </div>

                {/* Selection toggle directly inside slider */}
                <button
                  onClick={() => toggleMatchSelection(photo.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-black uppercase tracking-wider"
                  style={{
                    background: isSelected ? "linear-gradient(135deg, rgba(201,151,58,0.2) 0%, rgba(201,151,58,0.05) 100%)" : "rgba(255,255,255,0.04)",
                    borderColor: isSelected ? GOLD : "rgba(255,255,255,0.12)",
                    color: isSelected ? GOLD : TEXT
                  }}
                >
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-white/5" style={{ background: isSelected ? GOLD : "transparent", color: BG, border: isSelected ? "none" : "1px solid rgba(255,255,255,0.2)" }}>
                    {isSelected && <Check size={10} strokeWidth={4} />}
                  </span>
                  Selected
                </button>
              </div>

              {/* Swipe Guide Tip */}
              <div className="text-center text-[0.62rem] font-extrabold uppercase tracking-widest text-white/30 sm:hidden">
                ← Swipe to browse photos →
              </div>

              {/* Download HD Action */}
              <button
                onClick={() => downloadPhoto(photo)}
                className="w-full min-h-12 rounded-[1.25rem] flex items-center justify-center gap-2 text-sm font-extrabold active:scale-95 transition-all guest-app-press"
                style={{
                  background: "linear-gradient(135deg, #ffe69a 0%, #c9973a 100%)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: BG,
                  boxShadow: "0 8px 25px rgba(201,151,58,0.35)"
                }}
              >
                <Download size={15} strokeWidth={2.5} />
                Download HD Photo
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
