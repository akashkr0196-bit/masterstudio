import { useState, useEffect } from "react";
import logoImg from "../imports/logo.png";
import homeHeroImg from "../imports/home-hero-gemini.png";
import pageBgImg from "../imports/background.png";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { FindMyPhoto } from "./components/FindMyPhoto";
import { api } from "./api";
import { API_ORIGIN } from "./config";
import {
  Search,
  Play,
  Shield,
  Zap,
  Lock,
  Download,
  Menu,
  X,
  Home,
  ChevronRight,
  ChevronDown,
  Camera,
  User,
  Star,
  Instagram,
  Facebook,
  Youtube,
  QrCode,
  Smartphone,
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Heart,
  Check,
  Loader2,
  Archive,
  Image as ImageIcon,
} from "lucide-react";

const PHOTO_COLLAGE = [
  {
    src: "https://images.unsplash.com/photo-1714972383570-44ddc9738355?w=400&h=300&fit=crop&auto=format",
    alt: "Dancing couple at event",
  },
  {
    src: "https://images.unsplash.com/photo-1612599542558-f3022089fb38?w=400&h=300&fit=crop&auto=format",
    alt: "People at event",
  },
  {
    src: "https://images.unsplash.com/photo-1629219219925-ea8de62f2d68?w=400&h=300&fit=crop&auto=format",
    alt: "Couple at wedding",
  },
  {
    src: "https://images.unsplash.com/photo-1714972383523-7c636d2f0e9b?w=400&h=300&fit=crop&auto=format",
    alt: "Group dancing",
  },
  {
    src: "https://images.unsplash.com/photo-1523051121227-d6626e4bb9f1?w=400&h=300&fit=crop&auto=format",
    alt: "Celebration moment",
  },
  {
    src: "https://images.unsplash.com/photo-1591980339459-9c60eddf146e?w=400&h=300&fit=crop&auto=format",
    alt: "Event crowd",
  },
];

const PHOTOGRAPHER_IMG =
  "https://images.unsplash.com/photo-1549981832-2ba2ee913334?w=600&h=700&fit=crop&auto=format";

const FEATURES = [
  {
    icon: Camera,
    title: "AI Face Recognition",
    desc: "Advanced AI technology detects and matches your face from hundreds of photos.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    desc: "Find all matching photos in just a few seconds.",
  },
  {
    icon: Lock,
    title: "Private & Secure",
    desc: "We never share your data. Your privacy and security are our top priority.",
  },
  {
    icon: Download,
    title: "Download Easily",
    desc: "View, download and share your photos in high quality.",
  },
];

const STATS = [
  { value: "50K+", label: "Photos Delivered" },
  { value: "10K+", label: "Happy Guests" },
  { value: "500+", label: "Events Covered" },
  { value: "99.9%", label: "Success Rate" },
];

const PageBackdrop = ({ opacity = 0.22 }: { opacity?: number }) => (
  <>
    <img
      src={pageBgImg}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      style={{ objectPosition: "center right", opacity }}
    />
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "linear-gradient(90deg, rgba(7,9,12,0.98) 0%, rgba(7,9,12,0.9) 45%, rgba(7,9,12,0.8) 100%), linear-gradient(180deg, rgba(7,9,12,0.76) 0%, rgba(7,9,12,0.96) 100%)",
      }}
    />
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: "radial-gradient(circle at 76% 28%, rgba(245,199,95,0.13) 0%, transparent 34%)",
      }}
    />
  </>
);

const NAV_LINKS = [
  "Home",
  "How It Works",
  "Features",
  "For Photographers",
  "Contact",
];

const NAV_ROUTES: Record<string, string> = {
  Home: "/",
  "How It Works": "/how-it-works",
  Features: "/features",
  "For Photographers": "/for-photographers",
  Contact: "/contact",
};

const SESSION_KEY = "masterstudio.session";
function getAlbumPhotoUrl(photo: any, eventId: string) {
  if (photo?.preview_url) {
    return photo.preview_url.startsWith("http") ? photo.preview_url : `${API_ORIGIN}${photo.preview_url}`;
  }
  return `${API_ORIGIN}/static/uploads/photos/${photo?.name || ""}`;
}

function ClientSelectionGallery({ onBack }: { onBack: () => void }) {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event") || "";
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [verified, setVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [eventDetails, setEventDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    async function loadEventDetails() {
      try {
        const allEvents = await api.fetchPublicEvents(eventId);
        setEventDetails(allEvents.find((event) => event.id === eventId) || null);
      } catch (err) {
        setEventDetails(null);
      }
    }
    loadEventDetails();
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !verified || !verificationToken) return;
    async function loadAlbum() {
      try {
        setLoading(true);
        setError("");
        const [photoList, pickedIds] = await Promise.all([
          api.fetchClientAlbum(eventId, clientName.trim(), clientMobile.trim(), verificationToken),
          api.fetchGuestSelections(clientMobile.trim(), eventId, verificationToken).catch(() => []),
        ]);
        setPhotos(photoList);
        setSelectedIds(new Set(pickedIds));
      } catch (err: any) {
        setError(err.message || "Album load nahi ho pa raha.");
      } finally {
        setLoading(false);
      }
    }
    loadAlbum();
  }, [eventId, verified, clientMobile, verificationToken]);

  const sendClientOtp = async () => {
    if (!eventId) {
      setError("Client selection link me event ID missing hai.");
      return;
    }
    if (!clientName.trim() || !clientMobile.trim()) {
      setError("Please client name aur mobile number enter karo.");
      return;
    }
    try {
      setSendingOtp(true);
      setError("");
      const result = await api.sendOtp(eventId, clientName.trim(), clientMobile.trim());
      setOtpSent(true);
      setOtpValue("");
      setVerificationToken("");
      setDebugOtp(result.debug_otp || "");
    } catch (err: any) {
      setError(err.message || "OTP send nahi ho pa raha.");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyClientOtp = async () => {
    if (otpValue.replace(/\D/g, "").length !== 6) {
      setError("6 digit OTP enter karo.");
      return;
    }
    try {
      setVerifyingOtp(true);
      setError("");
      const result = await api.verifyOtp(eventId, clientMobile.trim(), otpValue);
      setVerificationToken(result.verification_token);
      setVerified(true);
    } catch (err: any) {
      setError(err.message || "OTP verify nahi ho pa raha.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const togglePick = async (photoId: number) => {
    try {
      setSavingId(photoId);
      setError("");
      const result = await api.toggleSelectionFavorite(eventId, photoId, clientMobile.trim(), clientName.trim(), verificationToken);
      setSelectedIds((current) => {
        const next = new Set(current);
        if (result) next.add(photoId);
        else next.delete(photoId);
        return next;
      });
    } catch (err: any) {
      setError(err.message || "Selection save nahi ho pa raha.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ background: "#0a0c10", color: "#f0ede6", fontFamily: "'Poppins', sans-serif" }}>
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3" style={{ background: "rgba(10,12,16,0.94)", borderBottom: "1px solid rgba(201,151,58,0.12)", backdropFilter: "blur(18px)" }}>
        <button onClick={onBack} className="flex items-center">
          <img src={logoImg} alt="MasterStudio" style={{ height: 30, width: "auto" }} />
        </button>
        <div className="text-right">
          <div style={{ color: "#f0ede6", fontSize: "0.78rem", fontWeight: 900 }}>Client Album Selection</div>
          {eventId && <div style={{ color: "#8b8fa8", fontSize: "0.66rem" }}>{eventId}</div>}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
        <section className="rounded-2xl p-5 sm:p-6" style={{ background: "linear-gradient(135deg, rgba(201,151,58,0.14), rgba(19,22,29,0.98) 55%)", border: "1px solid rgba(201,151,58,0.18)" }}>
          <div style={{ color: "#c9973a", fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Private Client Gallery</div>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Select photos for your album</h1>
          <p className="mt-2 max-w-2xl" style={{ color: "#8b8fa8", fontSize: "0.86rem", lineHeight: 1.6 }}>
            This page is for the registered event client to review the full gallery and mark final photos for album, print, or editing.
          </p>
        </section>

        {!verified ? (
          <section className="mx-auto w-full max-w-md rounded-2xl p-5" style={{ background: "#13161d", border: "1px solid rgba(201,151,58,0.14)" }}>
            <div className="flex items-center gap-2" style={{ color: "#f0ede6", fontWeight: 900 }}>
              <Shield size={17} style={{ color: "#c9973a" }} /> Client verification
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {eventDetails?.client_name && (
                <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)", color: "#8b8fa8", lineHeight: 1.5 }}>
                  Only the registered client for this event can open selection.
                </div>
              )}
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="w-full rounded-xl px-4 py-3 outline-none" style={{ background: "#1c2030", border: "1px solid rgba(201,151,58,0.14)", color: "#f0ede6" }} />
              <input value={clientMobile} onChange={(e) => setClientMobile(e.target.value)} placeholder="Client mobile number" className="w-full rounded-xl px-4 py-3 outline-none" style={{ background: "#1c2030", border: "1px solid rgba(201,151,58,0.14)", color: "#f0ede6" }} />
              {otpSent && (
                <input value={otpValue} onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6 digit OTP" inputMode="numeric" className="w-full rounded-xl px-4 py-3 outline-none" style={{ background: "#1c2030", border: "1px solid rgba(201,151,58,0.14)", color: "#f0ede6" }} />
              )}
              {debugOtp && (
                <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(201,151,58,0.08)", color: "#c9973a" }}>
                  Local test OTP: {debugOtp}
                </div>
              )}
              {error && <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>{error}</div>}
              <button onClick={otpSent ? verifyClientOtp : sendClientOtp} disabled={sendingOtp || verifyingOtp} className="mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-black disabled:opacity-60" style={{ background: "#c9973a", color: "#0a0c10" }}>
                {sendingOtp || verifyingOtp ? <Loader2 size={16} className="animate-spin" /> : otpSent ? <Shield size={16} /> : <Send size={16} />}
                {otpSent ? "Verify & Open Album" : "Send OTP"} <ChevronRight size={16} />
              </button>
            </div>
          </section>
        ) : loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" style={{ color: "#c9973a" }} /></div>
        ) : (
          <>
            <div className="flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: "#13161d", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <div style={{ color: "#f0ede6", fontWeight: 900 }}>{clientName}</div>
                <div style={{ color: "#8b8fa8", fontSize: "0.76rem" }}>{selectedIds.size} photo{selectedIds.size === 1 ? "" : "s"} selected</div>
              </div>
              <div className="rounded-full px-3 py-1 text-xs font-black" style={{ background: "rgba(201,151,58,0.12)", color: "#c9973a", border: "1px solid rgba(201,151,58,0.18)" }}>
                Saved automatically
              </div>
            </div>

            {error && <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>{error}</div>}

            {photos.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#13161d", border: "1px solid rgba(201,151,58,0.14)", color: "#8b8fa8" }}>
                <ImageIcon className="mx-auto mb-3" style={{ color: "#c9973a" }} />
                No photos uploaded for this event yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo) => {
                  const selected = selectedIds.has(photo.id);
                  return (
                    <button key={photo.id} onClick={() => togglePick(photo.id)} className="group relative overflow-hidden rounded-2xl text-left transition-all hover:-translate-y-0.5" style={{ border: selected ? "2px solid #c9973a" : "1px solid rgba(201,151,58,0.12)", background: "#13161d" }}>
                      <div className="aspect-square overflow-hidden">
                        <img src={getAlbumPhotoUrl(photo, eventId)} alt={photo.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                      <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: selected ? "#c9973a" : "rgba(10,12,16,0.72)", color: selected ? "#0a0c10" : "#f0ede6", border: "1px solid rgba(255,255,255,0.18)" }}>
                        {savingId === photo.id ? <Loader2 size={15} className="animate-spin" /> : selected ? <Check size={16} /> : <Heart size={15} />}
                      </span>
                      <div className="p-3">
                        <div className="truncate" style={{ color: "#f0ede6", fontSize: "0.78rem", fontWeight: 800 }}>{photo.name}</div>
                        <div style={{ color: selected ? "#c9973a" : "#8b8fa8", fontSize: "0.68rem", marginTop: 2 }}>{selected ? "Selected for album" : "Tap to select"}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<"super_admin" | "photographer" | "user">("user");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<"ai_matching" | "branding" | "selections" | "telemetry">("ai_matching");
  const [hoveredBento, setHoveredBento] = useState<string | null>(null);
  const [showcaseColor, setShowcaseColor] = useState("#c9973a");
  const [showcaseFont, setShowcaseFont] = useState("sans");
  const [showcaseSelections, setShowcaseSelections] = useState<number[]>([0, 2]);
  const [hoveredPhotoFeat, setHoveredPhotoFeat] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [photoWorkflowTab, setPhotoWorkflowTab] = useState<"flyer" | "uploader" | "proofing" | "telemetry">("flyer");
  const [simulatedUploadProgress, setSimulatedUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [zipCompiling, setZipCompiling] = useState(false);
  const [zipReady, setZipReady] = useState(false);
  const [flyerColor, setFlyerColor] = useState("#c9973a");
  const [flyerFont, setFlyerFont] = useState("sans");
  const [flyerTitle, setFlyerTitle] = useState("Priya's Wedding");
  const [activeNewPath, setActiveNewPath] = useState<"new_photographer" | "new_guest">("new_photographer");
  const [activePolicyModal, setActivePolicyModal] = useState<"privacy" | "terms" | "refund" | "cookie" | null>(null);

  const startSimulatedUpload = () => {
    setIsUploading(true);
    setSimulatedUploadProgress(0);
  };

  useEffect(() => {
    if (!isUploading) return;
    const interval = setInterval(() => {
      setSimulatedUploadProgress((prev) => {
        if (prev >= 100) {
          setIsUploading(false);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isUploading]);

  const startZipCompilation = () => {
    setZipCompiling(true);
    setZipReady(false);
  };

  useEffect(() => {
    if (!zipCompiling) return;
    const timeout = setTimeout(() => {
      setZipCompiling(false);
      setZipReady(true);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [zipCompiling]);

  const [flyerDownloading, setFlyerDownloading] = useState(false);
  const [flyerDownloadDone, setFlyerDownloadDone] = useState(false);

  const startFlyerDownload = () => {
    setFlyerDownloading(true);
    setFlyerDownloadDone(false);
    setTimeout(() => {
      setFlyerDownloading(false);
      setFlyerDownloadDone(true);
      setTimeout(() => setFlyerDownloadDone(false), 3000);
    }, 1500);
  };

  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        setIsInputFocused(true);
      }
    };
    const handleFocusOut = () => {
      setIsInputFocused(false);
    };
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const activeNav = Object.entries(NAV_ROUTES).find(([, path]) => path === currentPath)?.[0] ?? "Home";
  const isHomePage = currentPath === "/";
  const isFeaturesPage = currentPath === "/features";
  const isHowItWorksPage = currentPath === "/how-it-works";
  const isPhotographersPage = currentPath === "/for-photographers" || currentPath === "/photographers";
  const isContactPage = currentPath === "/contact";

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateNav = (link: string) => {
    navigate(NAV_ROUTES[link] ?? "/");
    setMenuOpen(false);
  };

  const openLoginPage = () => {
    setIsLoggedIn(false);
    setCurrentUserEmail("");
    setUserRole("user");
    api.setAuthToken("");
    window.sessionStorage.removeItem(SESSION_KEY);
    navigate("/login");
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const savedSession = window.sessionStorage.getItem(SESSION_KEY);
    if (!savedSession) return;

    try {
      const session = JSON.parse(savedSession) as {
        role?: "super_admin" | "photographer" | "user";
        email?: string;
      };
      if (!session.role || !session.email) return;
      if (session.role === "user") {
        window.sessionStorage.removeItem(SESSION_KEY);
        api.setAuthToken("");
        return;
      }
      setUserRole(session.role);
      setCurrentUserEmail(session.email);
      setIsLoggedIn(true);
    } catch {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const handleLoginSuccess = async (role: "super_admin" | "photographer" | "user", email: string, sessionId = "") => {
    if (role === "user") {
      window.sessionStorage.removeItem(SESSION_KEY);
      api.setAuthToken("");
      navigate("/find");
      return;
    }

    setUserRole(role);
    setCurrentUserEmail(email);
    setIsLoggedIn(true);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role, email, sessionId }));

    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get("redirect");

    if (role === "super_admin") {
      navigate("/admin");
    } else if (redirect) {
      navigate(redirect);
    } else if (window.location.pathname.startsWith("/find")) {
      // Do nothing, let state change trigger re-render on /find
    } else {
      navigate("/login");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserEmail("");
    setUserRole("user");
    api.setAuthToken("");
    window.sessionStorage.removeItem(SESSION_KEY);
    navigate("/");
  };

  useEffect(() => {
    if (!isLoggedIn || !currentUserEmail || userRole !== "photographer") return;

    const interval = setInterval(async () => {
      try {
        const savedSession = window.sessionStorage.getItem(SESSION_KEY);
        if (!savedSession) return;
        const session = JSON.parse(savedSession);
        const sessionId = session.sessionId;
        if (!sessionId) return;

        const res = await api.checkSession(currentUserEmail, sessionId);
        if (!res.valid) {
          clearInterval(interval);
          alert("Double Login Detected! You have been logged out because this account was logged in on another device.");
          handleLogout();
        }
      } catch (err) {
        console.warn("Failed to verify session status:", err);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isLoggedIn, currentUserEmail, userRole]);

  if (currentPath.startsWith("/admin")) {
    if (isLoggedIn && userRole === "super_admin") {
      return <div className="premium-page-enter"><Dashboard role="super_admin" userEmail={currentUserEmail} onLogout={handleLogout} /></div>;
    }
    return (
      <div className="premium-page-enter">
        <LoginPage
          onBack={() => navigate("/")}
          isAdminPortal={true}
          onLogin={handleLoginSuccess}
        />
      </div>
    );
  }

  if (currentPath.startsWith("/login")) {
    if (isLoggedIn) {
      return <div className="premium-page-enter"><Dashboard role={userRole} userEmail={currentUserEmail} onLogout={handleLogout} onBackHome={() => navigate("/")} /></div>;
    }
    const searchParams = new URLSearchParams(window.location.search);
    const defaultTab = searchParams.get("tab") as any;
    return (
      <div className="premium-page-enter">
        <LoginPage
          onBack={() => navigate("/")}
          onLogin={handleLoginSuccess}
          defaultTab={defaultTab}
        />
      </div>
    );
  }

  if (currentPath.startsWith("/client-selection")) {
    return <ClientSelectionGallery onBack={() => navigate("/")} />;
  }

  if (currentPath.startsWith("/find")) {
    return <FindMyPhoto onBack={() => navigate("/")} />;
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div className="premium-page-enter">
        <nav
        className="sticky top-0 z-50 flex items-center justify-center lg:justify-between px-4 py-2.5 sm:px-6 lg:px-12 lg:py-3"
        style={{
          background: "rgba(3,6,8,0.95)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button className="flex items-center" onClick={() => navigate("/")}>
          <img src={logoImg} alt="MasterStudio" className="h-[54px] sm:h-[64px] lg:h-[70px] w-auto object-contain" />
        </button>

        <ul className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <li key={link}>
              <a
                href={NAV_ROUTES[link]}
                onClick={(e) => {
                  e.preventDefault();
                  navigateNav(link);
                }}
                className="relative transition-colors duration-200 hover:text-amber-300"
                style={{
                  color: link === activeNav ? "#f5c75f" : "#f8f6f0",
                  fontSize: "1rem",
                  fontWeight: link === activeNav ? 700 : 500,
                }}
              >
                {link}
                {link === activeNav && (
                  <span className="absolute left-0 right-0 -bottom-4 h-[2px] rounded-full" style={{ background: "#f5c75f" }} />
                )}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center gap-3">
          <button
            className="login-register-btn flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200"
            style={{
              border: "1.5px solid #f5c75f",
              color: "#f5c75f",
              fontSize: "0.95rem",
              fontWeight: 700,
              background: "transparent",
            }}
            onClick={openLoginPage}
          >
            <User size={17} />
            Login / Register
          </button>
        </div>
      </nav>

      {/* Navbar */}
      <nav
        className="hidden sticky top-0 z-50 items-center justify-between px-6 py-4 lg:px-12"
        style={{
          background: "rgba(10,12,16,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,151,58,0.12)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center">
          <img src={logoImg} alt="MasterStudio" style={{ height: "60px", width: "auto" }} />
        </div>

        {/* Desktop Nav */}
        <ul className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <li key={link}>
              <a
                href={
                  link === "How It Works"
                    ? "#how-it-works"
                    : link === "For Photographers"
                    ? "#for-photographers"
                    : link === "Contact"
                    ? "#contact"
                    : "#"
                }
                onClick={(e) => {
                  if (link === "How It Works") {
                    e.preventDefault();
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                  } else if (link === "For Photographers") {
                    e.preventDefault();
                    document.getElementById("for-photographers")?.scrollIntoView({ behavior: "smooth" });
                  } else if (link === "Contact") {
                    e.preventDefault();
                    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="transition-colors duration-200 hover:text-amber-400"
                style={{
                  color: link === "Home" ? "var(--primary)" : "var(--muted-foreground)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            className="px-5 py-2 rounded-full transition-all duration-200 hover:opacity-90"
            style={{
              border: "1px solid var(--primary)",
              color: "var(--primary)",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: "transparent",
            }}
            onClick={openLoginPage}
          >
            Login / Register
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ color: "var(--foreground)" }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="lg:hidden flex flex-col gap-3 px-4 py-4 z-40"
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href={NAV_ROUTES[link]}
              onClick={(e) => {
                e.preventDefault();
                navigateNav(link);
              }}
            className="rounded-xl px-3 py-2"
            style={{ color: link === activeNav ? "var(--primary)" : "var(--muted-foreground)", fontSize: "0.95rem", background: link === activeNav ? "rgba(201,151,58,0.08)" : "transparent" }}
            >
              {link}
            </a>
          ))}
          <button
            onClick={() => { setMenuOpen(false); openLoginPage(); }}
            className="login-register-btn mt-1 px-5 py-3 rounded-2xl self-stretch transition-all duration-200"
            style={{
              border: "1px solid var(--primary)",
              color: "var(--primary)",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Login / Register
          </button>
        </div>
      )}

      <section
        className={`${isHomePage ? "" : "hidden"} relative overflow-hidden`}
        style={{
          background:
            "radial-gradient(circle at 72% 28%, rgba(201,151,58,0.18) 0%, transparent 30%), radial-gradient(circle at 18% 35%, rgba(201,151,58,0.08) 0%, transparent 32%), #030608",
          minHeight: "calc(100vh - 76px)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(3,6,8,0) 36%, rgba(3,6,8,0.96) 100%)",
          }}
        />

        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-16 pt-5 sm:pt-8 lg:pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.48fr_0.52fr] items-start gap-3 sm:gap-8">
            <div className="flex flex-col gap-4 sm:gap-6 lg:gap-7 w-full max-w-[calc(100vw-32px)] sm:max-w-[760px] text-center lg:text-left items-center lg:items-start">
              <div className="inline-flex items-center gap-2 sm:gap-3 self-center lg:self-start px-3.5 sm:px-5 py-2 sm:py-3 rounded-full" style={{ background: "rgba(201,151,58,0.09)", border: "1px solid rgba(245,199,95,0.78)", color: "#f5d789" }}>
                <Star size={14} fill="#f5c75f" />
                <span style={{ fontSize: "0.74rem", fontWeight: 800, letterSpacing: "0.04em" }}>
                  AI POWERED PHOTO FINDER
                </span>
                <ChevronDown size={13} />
              </div>

              <h1
                className="text-[2.1rem] sm:text-[2.8rem] lg:text-[3.55rem]"
                style={{
                  fontWeight: 900,
                  lineHeight: 1.08,
                  color: "#fff",
                  letterSpacing: "0",
                }}
              >
                <span className="block sm:inline">Apni Selfie</span>
                <span className="block sm:inline"> Upload Karo,</span>
                <br className="hidden sm:block" />
                <span className="block sm:inline">Apni <span style={{ color: "#f5c75f" }}>Photos</span></span>
                <span className="block sm:inline"> Turant Pao</span>
              </h1>

              <p className="text-[0.98rem] sm:text-[1.12rem] lg:text-[1.3rem] w-full max-w-[calc(100vw-40px)] sm:max-w-[640px] lg:max-w-[720px]" style={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.55 }}>
                Advanced AI Face Recognition technology se hum aapki photos scan karke sirf aapki photos dikhate hain.
              </p>

              <div className="grid w-full max-w-[calc(100vw-40px)] sm:max-w-none sm:flex sm:flex-wrap gap-3 sm:gap-6 mt-1 sm:mt-2">
                <button
                  onClick={() => {
                    navigate("/find");
                  }}
                  className="flex items-center justify-center gap-3 sm:gap-4 px-5 sm:px-8 py-4 sm:py-5 rounded-xl transition-all duration-200 hover:opacity-95 hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(180deg, #ffe69a 0%, #d9a231 100%)",
                    color: "#07090d",
                    fontWeight: 900,
                    fontSize: "1rem",
                    boxShadow: "0 16px 40px rgba(217,162,49,0.18)",
                  }}
                >
                  <Camera size={24} />
                  Find My Photos
                  <ChevronRight size={23} />
                </button>
                <button
                  onClick={() => {
                    navigate("/how-it-works");
                  }}
                  className="flex items-center justify-center gap-3 sm:gap-4 px-5 sm:px-8 py-4 sm:py-5 rounded-xl transition-all duration-200 hover:bg-white/[0.05]"
                  style={{
                    background: "rgba(3,6,8,0.48)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "1rem",
                    border: "1.5px solid rgba(245,199,95,0.62)",
                  }}
                >
                  <Play size={23} fill="none" />
                  How It Works
                </button>
              </div>

              <div className="grid justify-center lg:justify-start gap-3 sm:flex sm:flex-wrap sm:gap-7 mt-1 sm:mt-2 w-full max-w-[calc(100vw-40px)] sm:max-w-none">
                <div className="flex items-center gap-3">
                  <Shield size={19} style={{ color: "#f5c75f" }} />
                  <span style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.92rem" }}>100% Private & Secure</span>
                </div>
                <span className="hidden sm:inline" style={{ color: "rgba(255,255,255,0.35)" }}>•</span>
                <div className="flex items-center gap-3">
                  <Lock size={18} style={{ color: "#f5c75f" }} />
                  <span style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.92rem" }}>Your Privacy is Our Priority</span>
                </div>
              </div>
            </div>

            <div className="relative min-h-[260px] sm:min-h-[420px] lg:min-h-[610px] flex items-center justify-center overflow-hidden">
              <img
                src={homeHeroImg}
                alt="MasterStudio AI face recognition preview"
                className="absolute top-0 sm:top-[-20px] right-[-54px] sm:right-[-120px] h-[320px] sm:h-[520px] lg:h-[700px] w-[520px] sm:w-[820px] lg:w-[1080px] max-w-none object-cover"
                style={{ objectPosition: "center center", filter: "drop-shadow(0 30px 80px rgba(201,151,58,0.18))" }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(3,6,8,0) 0%, rgba(3,6,8,0) 58%, #030608 86%), linear-gradient(90deg, #030608 0%, rgba(3,6,8,0.15) 18%, rgba(3,6,8,0) 52%, #030608 100%)",
                }}
              />
              <div
                className="absolute bottom-6 lg:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-3 lg:py-4 rounded-xl"
                style={{ background: "rgba(12,14,18,0.78)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(14px)" }}
              >
                <Search size={26} style={{ color: "#f5c75f" }} />
                <div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: "1rem" }}>AI Face Recognition</div>
                  <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.84rem" }}>Fast • Accurate • Secure</div>
                </div>
              </div>
            </div>
          </div>

          <div id="home-features" className="mt-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc }, idx) => {
                const badge = ["AI-POWERED", "REAL-TIME", "RESTRICTED", "HD QUALITY"][idx];
                const toneColor = ["#f5c75f", "#3b82f6", "#ef4444", "#22c55e"][idx];
                return (
                  <div
                    key={title}
                    className="premium-card rounded-[24px] p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: "rgba(12,16,23,0.76)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                      backdropFilter: "blur(16px)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${toneColor}33`;
                      e.currentTarget.style.boxShadow = `0 12px 36px ${toneColor}08`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 animate-pulse"
                          style={{
                            background: `linear-gradient(135deg, ${toneColor}22 0%, ${toneColor}04 100%)`,
                            border: `1px solid ${toneColor}33`,
                            color: toneColor,
                            animationDuration: "3s"
                          }}
                        >
                          <Icon size={22} />
                        </div>
                        <span
                          className="rounded-full px-2 py-0.5 text-[0.58rem] font-black tracking-widest uppercase border"
                          style={{
                            background: `rgba(255,255,255,0.03)`,
                            borderColor: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.45)",
                          }}
                        >
                          {badge}
                        </span>
                      </div>
                      <h3 className="text-white font-extrabold text-base mb-2">{title}</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.64)" }}>
                        {desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div id="pricing" className="mt-4 mb-12 w-full">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STATS.map(({ value, label }, idx) => {
                const Icon = [Camera, Star, QrCode, Shield][idx];
                const toneColor = "#f5c75f";
                return (
                  <div
                    key={label}
                    className="premium-card rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 hover:scale-[1.015]"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(245,199,95,0.2)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(245,199,95,0.06)",
                        border: "1px solid rgba(245,199,95,0.12)",
                        color: toneColor,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ color: toneColor, fontWeight: 900, fontSize: "1.65rem", lineHeight: 1.1 }}>{value}</div>
                      <div className="text-[0.66rem] uppercase tracking-widest text-[#f5c75f]/50 mt-1 font-extrabold">{label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


        </div>
      </section>

      {/* Hero Section */}
      <section
        className="hidden relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 70% 40%, rgba(201,151,58,0.08) 0%, transparent 60%), var(--background)",
          minHeight: "calc(100vh - 70px)",
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 65% 35%, rgba(201,151,58,0.07) 0%, transparent 55%)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center gap-10 py-16 lg:py-24">
          {/* Left Content */}
          <div className="flex-1 flex flex-col gap-6 max-w-xl">
            {/* AI Badge */}
            <div className="inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full" style={{ background: "rgba(201,151,58,0.15)", border: "1px solid rgba(201,151,58,0.3)" }}>
              <Star size={13} style={{ color: "var(--primary)" }} fill="var(--primary)" />
              <span style={{ color: "var(--primary)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em" }}>
                AI POWERED PHOTO FINDER
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                lineHeight: 1.15,
                color: "var(--foreground)",
              }}
            >
              Apni Selfie Upload Karo,{" "}
              <span style={{ color: "var(--primary)" }}>Apni Photos</span>{" "}
              Turant Pao
            </h1>

            <p style={{ color: "var(--muted-foreground)", fontSize: "1rem", lineHeight: 1.7 }}>
              Advanced AI Face Recognition technology se hum aapki photos scan karke sirf aapki photos dikhate hain.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mt-2">
              <button
                onClick={() => {
                  navigate("/find");
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
                style={{
                  background: "var(--primary)",
                  color: "#0a0c10",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                <Search size={16} />
                Find My Photos
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => {
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 hover:opacity-90"
                style={{
                  background: "var(--secondary)",
                  color: "var(--foreground)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  border: "1px solid var(--border)",
                }}
              >
                <Play size={15} fill="currentColor" />
                How It Works
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-5 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(201,151,58,0.2)" }}>
                  <Shield size={13} style={{ color: "var(--primary)" }} />
                </div>
                <span style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>100% Private & Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(201,151,58,0.2)" }}>
                  <Shield size={13} style={{ color: "var(--primary)" }} />
                </div>
                <span style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Your Privacy is Our Priority</span>
              </div>
            </div>

            {/* AI Face Recognition tag */}
            <div
              className="inline-flex items-center gap-3 self-start px-4 py-2 rounded-xl mt-2"
              style={{ background: "rgba(201,151,58,0.1)", border: "1px solid rgba(201,151,58,0.2)" }}
            >
              <Camera size={16} style={{ color: "var(--primary)" }} />
              <div>
                <div style={{ color: "var(--foreground)", fontSize: "0.8rem", fontWeight: 600 }}>AI Face Recognition</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Fast • Accurate • Secure</div>
              </div>
            </div>
          </div>

          {/* Right: Photographer + Photo Collage */}
          <div className="flex-1 relative flex items-center justify-center w-full max-w-xl">
            {/* Photographer Image */}
            <div
              className="relative z-10 rounded-2xl overflow-hidden"
              style={{
                width: "clamp(240px, 40vw, 360px)",
                height: "clamp(300px, 50vw, 440px)",
                boxShadow: "0 0 60px rgba(201,151,58,0.15)",
              }}
            >
              <img
                src={PHOTOGRAPHER_IMG}
                alt="Photographer with camera"
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, transparent 50%, rgba(10,12,16,0.7) 100%)",
                }}
              />
            </div>

            {/* Photo Collage Grid */}
            <div className="absolute inset-0 z-0 grid grid-cols-3 gap-2 opacity-60 pointer-events-none" style={{ padding: "0 0 0 60%" }}>
              {PHOTO_COLLAGE.slice(0, 6).map((photo, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden"
                  style={{ height: "80px", background: "var(--card)" }}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Decorative ring */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: "500px",
                height: "500px",
                border: "1px solid rgba(201,151,58,0.1)",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </div>

        {/* Features strip */}
        <div
          className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pb-16"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col gap-3 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(201,151,58,0.15)" }}
                >
                  <Icon size={20} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--foreground)", marginBottom: "0.25rem" }}>
                    {title}
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.6 }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isFeaturesPage && (
        <section id="features" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-12 border-t relative overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(10,12,16,0.98) 0%, rgba(7,9,12,0.98) 100%)", borderColor: "var(--border)" }}>
          <PageBackdrop opacity={0.16} />
          {/* Decorative Glow */}
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 60%)" }} />

          <div className="max-w-7xl mx-auto relative z-10 w-full">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="rounded-full px-3 py-1 text-[0.68rem] font-extrabold tracking-widest uppercase border"
                style={{ background: "rgba(245,199,95,0.06)", color: "var(--primary)", borderColor: "rgba(245,199,95,0.22)" }}>
                Core Platform Capabilities
              </span>
              <h2 className="mt-4 text-3xl sm:text-5xl font-black text-foreground tracking-tight leading-tight">
                AI-Powered Event <span className="bg-gradient-to-r from-[#f7d77b] via-[#e2b047] to-[#c9973a] bg-clip-text text-transparent">Photography Ecosystem</span>
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
                Next-generation tools built for professional studios. Automate guest delivery, secure client selections, and monitor processing in real-time.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
              {[
                {
                  id: "ai",
                  icon: Camera,
                  title: "AI Face Recognition Engine",
                  desc: "Advanced cloud-based GPU face matching indexing. Instant uploads and matches. Previews load fast, AI indexes in the background.",
                  colSpan: "md:col-span-2",
                  badge: "PRO CAPABILITY",
                  color: "#c9973a"
                },
                {
                  id: "selfie",
                  icon: User,
                  title: "Selfie Search Portal",
                  desc: "Private guest entry. Scan, upload a selfie, and view matched memories instantly.",
                  colSpan: "md:col-span-1",
                  badge: "SECURE",
                  color: "#22c55e"
                },
                {
                  id: "vault",
                  icon: Lock,
                  title: "High-Res Raw Vault",
                  desc: "Previews serve instantly. Raw files remain locked until selection ZIPs are generated.",
                  colSpan: "md:col-span-1",
                  badge: "SAFE",
                  color: "#ef4444"
                },
                {
                  id: "selection",
                  icon: Star,
                  title: "Client Selection Center",
                  desc: "Proofing dashboard where clients view the full preview album and select final photos.",
                  colSpan: "md:col-span-1",
                  badge: "EASY FLOW",
                  color: "#3b82f6"
                },
                {
                  id: "isolation",
                  icon: Shield,
                  title: "Strict Tenant Isolation",
                  desc: "Enterprise isolation. JWT encrypted tokens, owner validation, private asset protection.",
                  colSpan: "md:col-span-1",
                  badge: "ENTERPRISE",
                  color: "#a855f7"
                },
                {
                  id: "branding",
                  icon: QrCode,
                  title: "Dynamic Branded QRs",
                  desc: "Generate branded QR codes instantly. Customize color themes (Gold, Blue, Green) and typography to match the event branding.",
                  colSpan: "md:col-span-2",
                  badge: "CUSTOMIZABLE",
                  color: "#c9973a"
                }
              ].map(({ id, icon: Icon, title, desc, colSpan, badge, color }) => {
                const isHovered = hoveredBento === id;
                return (
                  <div
                    key={id}
                    className={`p-6 sm:p-7 rounded-[24px] flex flex-col justify-between transition-all duration-300 min-w-0 ${colSpan} ${isHovered ? 'scale-[1.015]' : 'hover:scale-[1.005]'}`}
                    onMouseEnter={() => setHoveredBento(id)}
                    onMouseLeave={() => setHoveredBento(null)}
                    style={{
                      background: isHovered ? "rgba(255,255,255,0.04)" : "rgba(8,10,14,0.68)",
                      border: isHovered ? `1px solid ${color}44` : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: isHovered ? `0 12px 40px ${color}08` : "none",
                      backdropFilter: "blur(12px)"
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300"
                          style={{ 
                            background: isHovered ? `${color}22` : "rgba(255,255,255,0.05)", 
                            border: isHovered ? `1px solid ${color}44` : "1px solid rgba(255,255,255,0.08)",
                            color: isHovered ? color : "var(--foreground)"
                          }}
                        >
                          <Icon size={18} className="transition-all duration-300" style={{ transform: isHovered ? "scale(1.1) rotate(5deg)" : "none" }} />
                        </div>
                        <span className="rounded-full px-2 py-0.5 text-[0.58rem] font-black tracking-wider uppercase border"
                          style={{ 
                            background: isHovered ? `${color}12` : "rgba(255,255,255,0.03)", 
                            color: isHovered ? color : "var(--muted-foreground)",
                            borderColor: isHovered ? `${color}33` : "rgba(255,255,255,0.08)"
                          }}
                        >
                          {badge}
                        </span>
                      </div>
                      <h3 className="text-foreground font-extrabold text-base sm:text-lg mb-1.5">{title}</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive capabilities experience widget */}
            <div className="mt-16 sm:mt-20 lg:mt-24 rounded-[32px] p-4 sm:p-6 lg:p-8 w-full" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex flex-col gap-2 mb-8">
                <span style={{ color: "var(--primary)", fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  Interactive Preview
                </span>
                <h3 className="text-foreground text-xl sm:text-3xl font-black">Capabilities Showcase</h3>
                <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl leading-relaxed">
                  Interact with our live simulated client interfaces to see how each workflow manages event photos.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left Tabs */}
                <div className="lg:col-span-5 flex flex-col gap-3 justify-center min-w-0">
                  {[
                    {
                      id: "ai_matching",
                      icon: Camera,
                      title: "AI Face Matching Search",
                      desc: "Guests upload a quick selfie. Our GPU face matcher detects embeddings and serves only matched files."
                    },
                    {
                      id: "branding",
                      icon: QrCode,
                      title: "Personalized Gallery Themes",
                      desc: "Choose brand colors, font combinations, and logos to customize guest welcome pages."
                    },
                    {
                      id: "selections",
                      icon: Star,
                      title: "Secure Selections Workflow",
                      desc: "Clients scroll, approve favorites, track count limits, and submit directly back to the photographer."
                    },
                    {
                      id: "telemetry",
                      icon: Zap,
                      title: "Server & Processing Telemetry",
                      desc: "Monitor raw uploads processing, active GPU indexing queue, and account storage quota limits."
                    }
                  ].map((tab) => {
                    const isTabActive = activeShowcaseTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveShowcaseTab(tab.id as any)}
                        className="w-full text-left rounded-2xl p-4 transition-all duration-300 border flex gap-4 min-w-0 items-start"
                        style={{
                          background: isTabActive ? "rgba(245,199,95,0.06)" : "rgba(255,255,255,0.02)",
                          borderColor: isTabActive ? "rgba(245,199,95,0.3)" : "rgba(255,255,255,0.06)"
                        }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: isTabActive ? "rgba(245,199,95,0.18)" : "rgba(255,255,255,0.04)",
                            color: isTabActive ? "var(--primary)" : "var(--muted-foreground)"
                          }}
                        >
                          <tab.icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground text-sm font-extrabold" style={{ color: isTabActive ? "var(--primary)" : "var(--foreground)" }}>{tab.title}</div>
                          <div className="text-muted-foreground text-xs mt-1 leading-normal">{tab.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Viewer Screen */}
                <div className="lg:col-span-7 flex justify-center items-center min-w-0 w-full">
                  <div className="w-full max-w-[420px] rounded-3xl p-5 border border-white/[0.08] relative overflow-hidden flex flex-col min-h-[380px] justify-between shadow-2xl"
                    style={{ background: "#080a0e", backgroundImage: "radial-gradient(circle at top right, rgba(255,255,255,0.02), transparent)" }}>
                    
                    {/* Viewport Header */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06] text-[10px] text-muted-foreground font-mono">
                      <span>view_port.exe</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                        Interactive Preview
                      </span>
                    </div>

                    {/* Interactive Content */}
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      {activeShowcaseTab === "ai_matching" && (
                        <div className="flex flex-col gap-4 items-center text-center">
                          {/* Face Finder Frame */}
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-dashed border-amber-500/80 p-1 flex items-center justify-center animate-spin"
                              style={{ animationDuration: "8s" }}>
                              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&auto=format" alt="Selfie preview" className="w-full h-full rounded-full object-cover" />
                            </div>
                            <div className="absolute inset-0 border border-amber-400 rounded-full animate-ping opacity-30" />
                          </div>

                          <div>
                            <div className="text-foreground text-sm font-extrabold">Extracting face embeddings...</div>
                            <div className="text-xs text-muted-foreground mt-1 font-mono">Status: Match search complete</div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 w-full mt-2">
                            {PHOTO_COLLAGE.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="relative rounded-xl overflow-hidden border border-emerald-500/40 shadow-[0_0_12px_rgba(34,197,94,0.1)]">
                                <img src={item.src} alt="Match" className="h-16 w-full object-cover" />
                                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-black text-slate-900">✓</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeShowcaseTab === "branding" && (
                        <div className="flex flex-col gap-4">
                          {/* Accent Color Controls */}
                          <div className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.05] p-3 rounded-2xl">
                            <div>
                              <div className="text-foreground text-xs font-bold">Accent Color</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">Click to preview theme</div>
                            </div>
                            <div className="flex gap-2">
                              {[
                                { color: "#c9973a", name: "Gold" },
                                { color: "#3b82f6", name: "Blue" },
                                { color: "#22c55e", name: "Green" }
                              ].map((item) => (
                                <button
                                  key={item.color}
                                  onClick={() => setShowcaseColor(item.color)}
                                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${showcaseColor === item.color ? 'scale-110 border-white' : 'border-transparent'}`}
                                  style={{ background: item.color }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Font Selector */}
                          <div className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.05] p-3 rounded-2xl">
                            <div>
                              <div className="text-foreground text-xs font-bold">Font Theme</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">Change typography</div>
                            </div>
                            <div className="flex gap-1.5">
                              {[
                                { id: "serif", label: "Serif" },
                                { id: "sans", label: "Sans" },
                                { id: "mono", label: "Mono" }
                              ].map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => setShowcaseFont(item.id)}
                                  className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold border uppercase transition-all"
                                  style={{
                                    background: showcaseFont === item.id ? "rgba(255,255,255,0.08)" : "transparent",
                                    borderColor: showcaseFont === item.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"
                                  }}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Interactive Preview Box */}
                          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.08] text-center transition-all duration-300">
                            <div className={`transition-all duration-300 text-sm font-extrabold text-foreground ${showcaseFont === 'serif' ? 'font-serif' : showcaseFont === 'mono' ? 'font-mono' : 'font-sans'}`}>
                              Client Event Gallery
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Scan QR to find matches</div>
                            <button
                              className="mt-3 px-5 py-2.5 rounded-xl text-xs font-black w-full flex items-center justify-center gap-1.5 transition-all duration-300"
                              style={{ background: showcaseColor, color: "#080a0e" }}
                            >
                              <Smartphone size={12} /> Find My Photo
                            </button>
                          </div>
                        </div>
                      )}

                      {activeShowcaseTab === "selections" && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground font-bold">Select Favorites</span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              Selections: <span className="text-[#86efac] font-black">{showcaseSelections.length}</span> / 4 photos
                            </span>
                          </div>

                          <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${(showcaseSelections.length / 4) * 100}%` }} />
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {PHOTO_COLLAGE.slice(3, 7).map((item, idx) => {
                              const isChecked = showcaseSelections.includes(idx);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (isChecked) {
                                      setShowcaseSelections(showcaseSelections.filter(x => x !== idx));
                                    } else {
                                      setShowcaseSelections([...showcaseSelections, idx]);
                                    }
                                  }}
                                  className="relative h-20 rounded-xl overflow-hidden cursor-pointer group border transition-all duration-300"
                                  style={{ borderColor: isChecked ? "var(--primary)" : "rgba(255,255,255,0.06)" }}
                                >
                                  <img src={item.src} alt="Selection Mock" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-black/30" />
                                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300"
                                    style={{
                                      background: isChecked ? "var(--primary)" : "rgba(8,10,14,0.6)",
                                      borderColor: isChecked ? "var(--primary)" : "rgba(255,255,255,0.4)",
                                      color: isChecked ? "#080a0e" : "transparent"
                                    }}
                                  >
                                    <Check size={11} className="stroke-[3]" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            disabled={showcaseSelections.length === 0}
                            className="mt-2 w-full py-2 rounded-xl text-xs font-black transition-all bg-emerald-500 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <Download size={13} /> Submit Selections to Studio
                          </button>
                        </div>
                      )}

                      {activeShowcaseTab === "telemetry" && (
                        <div className="flex flex-col gap-3 font-mono text-[10px] text-muted-foreground bg-[#0a0c10] border border-white/[0.04] p-4 rounded-2xl">
                          <div className="flex justify-between items-center pb-2 border-b border-white/[0.05]">
                            <span>ENV: production.cloud</span>
                            <span className="text-emerald-400 font-extrabold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              GPU Workers Active
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <span>Index Queue</span>
                            <span className="text-[var(--primary)]">1 active worker</span>
                          </div>

                          <div className="flex flex-col gap-1 mt-1 bg-white/[0.02] p-2 rounded-lg text-[9px] leading-relaxed">
                            <div className="flex items-center gap-1.5">
                              <span className="text-green-400">[info]</span>
                              <span>Indexed wedding_raw_823.cr2</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-400 animate-pulse">[proc]</span>
                              <span>Embedding extraction (94%)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">[wait]</span>
                              <span>Queueing wedding_raw_825.cr2</span>
                            </div>
                          </div>

                          <div className="mt-2 flex justify-between items-center text-[9px]">
                            <span>Server CPU</span>
                            <span>24.8%</span>
                          </div>
                          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: "24.8%" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section id="how-it-works" className={`${isHowItWorksPage ? "" : "hidden"} py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-12 border-t relative overflow-hidden`} style={{ background: "linear-gradient(180deg, rgba(10,12,16,0.98) 0%, rgba(7,9,12,0.98) 100%)", borderColor: "var(--border)" }}>
        <PageBackdrop opacity={0.12} />
        <div className="absolute top-20 right-[-120px] w-[420px] h-[420px] rounded-full blur-[150px] pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }} />

        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-[358px] sm:max-w-none mx-auto">
            <div className="lg:col-span-5 min-w-0 w-full">
              <span style={{ color: "var(--primary)", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                How MasterStudio Works
              </span>
              <h2 className="mt-3 text-[2rem] sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                <span className="block sm:inline">Upload once, </span>
                <span className="block sm:inline">deliver photos </span>
                <span className="block bg-gradient-to-r from-[#f7d77b] via-[#e2b047] to-[#c9973a] bg-clip-text text-transparent">without confusion</span>
              </h2>
              <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed max-w-[340px] sm:max-w-xl">
                A clean workflow for photographers, clients, and guests: original files stay safe, previews load fast, AI indexes in the background, and every selection is tracked by photo ID.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 max-w-xl">
                {[
                  { label: "Photographer", value: "Original upload + dashboard control" },
                  { label: "Guest", value: "Selfie search + matched previews" },
                  { label: "Client", value: "Full album preview + selections" },
                  { label: "System", value: "AI queue + storage quota" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ color: "var(--primary)", fontSize: "0.68rem", fontWeight: 900, textTransform: "uppercase" }}>{item.label}</div>
                    <div className="mt-1 text-[0.72rem] sm:text-xs text-muted-foreground leading-snug">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 min-w-0 w-full">
                {[
                  {
                    num: "01",
                    icon: Camera,
                    title: "Photographer uploads originals",
                    desc: "RAW/JPG master files are saved safely while lightweight previews are generated for fast viewing."
                  },
                  {
                    num: "02",
                    icon: Zap,
                    title: "AI indexing runs in queue",
                    desc: "Face embeddings are created in the background, so large uploads do not freeze the workflow."
                  },
                  {
                    num: "03",
                    icon: QrCode,
                    title: "Guests or clients open the gallery",
                    desc: "Guests use selfie search. Clients view the full preview album and select final photos."
                  },
                  {
                    num: "04",
                    icon: Download,
                    title: "Final delivery uses originals",
                    desc: "Selections store only photo IDs; photographer downloads selected original files as a ZIP."
                  }
                ].map(({ num, icon: Icon, title, desc }) => {
                  const isActive = activeStep === num;
                  return (
                    <div key={num} className={`flex gap-3 sm:gap-4 rounded-2xl p-4 min-w-0 transition-all duration-300 cursor-pointer ${isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                      onMouseEnter={() => setActiveStep(num)}
                      onMouseLeave={() => setActiveStep(null)}
                      style={{ 
                        background: isActive ? "rgba(245,199,95,0.06)" : "rgba(255,255,255,0.035)", 
                        border: isActive ? "1px solid rgba(245,199,95,0.3)" : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: isActive ? "0 8px 30px rgba(245,199,95,0.08)" : "none"
                      }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                        style={{ 
                          background: isActive ? "rgba(245,199,95,0.22)" : "rgba(201,151,58,0.13)", 
                          border: isActive ? "1px solid rgba(245,199,95,0.4)" : "1px solid rgba(201,151,58,0.24)" 
                        }}>
                        <Icon size={18} className="transition-all duration-300" style={{ color: "var(--primary)", transform: isActive ? "scale(1.1) rotate(5deg)" : "none" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ color: "var(--primary)", fontSize: "0.72rem", fontWeight: 900 }}>{num}</span>
                          <h3 className="text-foreground font-bold text-sm sm:text-base">{title}</h3>
                        </div>
                        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-7 min-w-0 w-full">
              <div className="relative rounded-[28px] p-3 sm:p-5 overflow-hidden"
                style={{ background: "linear-gradient(145deg, rgba(245,199,95,0.18), rgba(255,255,255,0.04))", border: "1px solid rgba(245,199,95,0.18)", boxShadow: "0 24px 80px rgba(0,0,0,0.32)" }}>
                <div className="rounded-[22px] overflow-hidden relative min-h-[780px] md:min-h-[560px]"
                  style={{ background: "#090b10", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <img src={homeHeroImg} alt="AI photo finder preview" className="absolute inset-0 w-full h-full object-cover opacity-45" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(9,11,16,0.96) 0%, rgba(9,11,16,0.78) 48%, rgba(9,11,16,0.38) 100%)" }} />

                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-4 p-3 md:p-6 h-full min-w-0">
                    <div className={`mx-auto w-full max-w-[310px] rounded-[40px] p-4 flex flex-col justify-between min-h-[520px] relative border-[6px] bg-[#080a0e] shadow-2xl overflow-hidden transition-all duration-350 ${activeStep === "03" ? "scale-[1.03]" : ""}`}
                      style={{ 
                        background: "radial-gradient(circle at top, rgba(245,199,95,0.06) 0%, #080a0e 100%)", 
                        boxShadow: activeStep === "03" ? "0 20px 60px rgba(245,199,95,0.25)" : "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
                        borderColor: activeStep === "03" ? "var(--primary)" : "#1e293b"
                      }}>
                      
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-3.5 bg-slate-800 rounded-b-xl z-20" />

                      {/* Status Bar */}
                      <div className="flex justify-between items-center px-2 pt-1 pb-3 text-[9px] text-muted-foreground font-bold z-10 mt-0.5">
                        <span>9:41</span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-[1px] items-end">
                            <div className="w-[1.5px] h-[3px] bg-muted-foreground rounded-sm" />
                            <div className="w-[1.5px] h-[5px] bg-muted-foreground rounded-sm" />
                            <div className="w-[1.5px] h-[7px] bg-muted-foreground rounded-sm" />
                            <div className="w-[1.5px] h-[9px] bg-muted-foreground rounded-sm" />
                          </div>
                          <div className="w-4 h-2 border border-muted-foreground rounded-[2px] p-[0.5px] flex items-center">
                            <div className="h-full w-[80%] bg-muted-foreground rounded-[0.5px]" />
                          </div>
                        </div>
                      </div>

                      {/* App Screen Content */}
                      <div className="flex-1 flex flex-col justify-between mt-1">
                        <div>
                          {/* Header */}
                          <div className="px-1 flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(245,199,95,0.14)", color: "var(--primary)" }}>
                                <QrCode size={14} />
                              </div>
                              <div>
                                <div className="text-foreground text-[0.8rem] font-extrabold tracking-tight">Event Access</div>
                                <div className="text-[0.62rem] text-muted-foreground leading-none">Guest and client entry</div>
                              </div>
                            </div>
                            <Shield size={14} style={{ color: "var(--primary)" }} />
                          </div>

                          {/* Ticket QR Card */}
                          <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg flex flex-col items-center justify-center border border-slate-100/50">
                            <div className="w-28 h-28 grid grid-cols-7 gap-1 p-1 bg-white">
                              {(() => {
                                const blackCells = [
                                  0, 1, 2, 7, 9, 14, 15, 16,
                                  4, 5, 6, 11, 13, 18, 19, 20,
                                  28, 29, 30, 35, 37, 42, 43, 44,
                                  10, 17, 22, 23, 25, 26, 31, 33, 34, 38, 40, 46, 48
                                ];
                                return Array.from({ length: 49 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="rounded-[1px]"
                                    style={{
                                      background: blackCells.includes(i) ? "#090b10" : "transparent"
                                    }}
                                  />
                                ));
                              })()}
                            </div>
                            <div className="mt-3 text-center border-t border-dashed border-slate-200 pt-3 w-full">
                              <div className="text-[0.72rem] font-bold text-slate-800">Scan to Find Photos</div>
                              <div className="text-[0.6rem] text-slate-400 mt-0.5">Upload selfie for AI matches</div>
                            </div>
                          </div>

                          {/* Info Block */}
                          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                              <div className="text-foreground text-[0.72rem] font-bold">Client Event Gallery</div>
                            </div>
                            <div className="text-muted-foreground text-[0.62rem] mt-1 leading-normal">
                              QR opens selfie search for guests or photo selections for clients
                            </div>
                          </div>
                        </div>

                        {/* Open Gallery Button */}
                        <button className="mt-4 w-full rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs font-black transition-all duration-200 hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, #f7d77b, #c9973a)", color: "#080a0d" }}>
                          <Smartphone size={14} /> Open Gallery
                        </button>
                      </div>

                      {/* Home Indicator */}
                      <div className="mt-2.5 flex justify-center">
                        <div className="w-20 h-1 bg-white/20 rounded-full" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className={`rounded-3xl p-4 transition-all duration-350 ${activeStep === "01" || activeStep === "02" ? "scale-[1.03]" : ""}`}
                        style={{ 
                          background: activeStep === "01" || activeStep === "02" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)", 
                          border: activeStep === "01" || activeStep === "02" ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.10)", 
                          backdropFilter: "blur(16px)",
                          boxShadow: activeStep === "01" || activeStep === "02" ? "0 10px 30px rgba(245,199,95,0.15)" : "none"
                        }}>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-foreground font-extrabold">Upload & AI Queue</div>
                            <div className="text-muted-foreground text-xs mt-1">Preview ready, indexing in progress</div>
                          </div>
                          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(245,199,95,0.12)", border: "1px solid rgba(245,199,95,0.22)" }}>
                            <Search size={20} style={{ color: "var(--primary)" }} />
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                          <div className="h-full w-[76%]" style={{ background: "linear-gradient(90deg, #c9973a, #f7d77b)" }} />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          {[
                            { label: "Original", value: "Safe" },
                            { label: "Preview", value: "Fast" },
                            { label: "AI", value: "76%" },
                          ].map((item) => (
                            <div key={item.label} className="rounded-2xl px-2 py-2" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
                              <div className="text-[0.62rem] text-muted-foreground">{item.label}</div>
                              <div className="mt-0.5 text-[0.72rem] font-black" style={{ color: "var(--primary)" }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {PHOTO_COLLAGE.slice(0, 3).map((photo) => (
                            <img key={photo.src} src={photo.src} alt={photo.alt} className="h-20 sm:h-24 w-full object-cover rounded-2xl" />
                          ))}
                        </div>
                      </div>

                      <div className={`rounded-3xl p-4 transition-all duration-350 ${activeStep === "04" ? "scale-[1.03]" : ""}`}
                        style={{ 
                          background: "rgba(8,10,14,0.78)", 
                          border: activeStep === "04" ? "1px solid var(--primary)" : "1px solid rgba(245,199,95,0.18)", 
                          backdropFilter: "blur(16px)",
                          boxShadow: activeStep === "04" ? "0 10px 30px rgba(245,199,95,0.25)" : "none"
                        }}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden" style={{ border: "2px solid var(--primary)" }}>
                            <img src={PHOTOGRAPHER_IMG} alt="Selfie verification preview" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="text-foreground font-extrabold">Selection Ready</div>
                            <div className="text-muted-foreground text-xs">12 previews matched, originals untouched</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {PHOTO_COLLAGE.slice(3, 7).map((photo) => (
                            <img key={photo.src} src={photo.src} alt={photo.alt} className="h-24 sm:h-28 w-full object-cover rounded-2xl" />
                          ))}
                        </div>
                        <div className="mt-4 rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.22)" }}>
                          <span className="text-sm font-bold" style={{ color: "#86efac" }}>Original ZIP can be generated</span>
                          <Download size={17} style={{ color: "#86efac" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-3 w-full max-w-[358px] sm:max-w-none mx-auto">
              {[
                { icon: Lock, title: "Originals stay private", desc: "Master files are used only for final download and ZIP delivery." },
                { icon: ImageIcon, title: "Previews load fast", desc: "Guests and clients browse optimized preview images, not heavy originals." },
                { icon: Check, title: "Selections save IDs", desc: "Client choices store photo IDs, so no duplicate copies are created." },
                { icon: Archive, title: "Quota is enforced", desc: "Photographer storage limit blocks uploads before the account crosses quota." },
              ].map(({ icon: Icon, title, desc }) => {
                const isFeatHovered = hoveredFeature === title;
                return (
                  <div key={title} className={`rounded-2xl p-4 transition-all duration-300 ${isFeatHovered ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                    onMouseEnter={() => setHoveredFeature(title)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    style={{ 
                      background: isFeatHovered ? "rgba(245,199,95,0.05)" : "rgba(255,255,255,0.035)", 
                      border: isFeatHovered ? "1px solid rgba(245,199,95,0.25)" : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: isFeatHovered ? "0 8px 25px rgba(245,199,95,0.06)" : "none"
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all duration-300"
                      style={{ 
                        background: isFeatHovered ? "rgba(245,199,95,0.22)" : "rgba(245,199,95,0.11)", 
                        border: isFeatHovered ? "1px solid rgba(245,199,95,0.4)" : "1px solid rgba(245,199,95,0.20)", 
                        color: "var(--primary)" 
                      }}>
                      <Icon size={16} className="transition-all duration-300" style={{ transform: isFeatHovered ? "scale(1.1)" : "none" }} />
                    </div>
                    <div className="text-foreground text-sm font-extrabold">{title}</div>
                    <div className="mt-1 text-muted-foreground text-xs leading-relaxed">{desc}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-[28px] p-4 sm:p-5 w-full max-w-[358px] sm:max-w-none mx-auto" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                <div>
                  <div style={{ color: "var(--primary)", fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Role-wise workflow</div>
                  <div className="mt-1 text-foreground text-xl sm:text-2xl font-black">Everyone gets a focused path</div>
                </div>
                <div className="text-muted-foreground text-xs sm:text-sm max-w-md">
                  The same event can serve the studio, the client, and every guest without mixing their responsibilities.
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {[
                  {
                    icon: Camera,
                    title: "Photographer",
                    tone: "#c9973a",
                    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=500&auto=format&fit=crop&q=80",
                    steps: ["Create event", "Upload originals", "Monitor AI queue", "Download selected ZIP"],
                  },
                  {
                    icon: User,
                    title: "Client",
                    tone: "#3b82f6",
                    image: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500&auto=format&fit=crop&q=80",
                    steps: ["Verify name/mobile", "Browse full preview album", "Select favorites", "Submit final list"],
                  },
                  {
                    icon: Smartphone,
                    title: "Guest",
                    tone: "#22c55e",
                    image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop&q=80",
                    steps: ["Scan QR", "Enter details", "Capture selfie", "View matched photos"],
                  },
                ].map(({ icon: Icon, title, tone, image, steps }) => {
                  const isRoleHovered = hoveredRole === title;
                  return (
                    <div key={title} className={`rounded-2xl p-4 flex flex-col gap-4 transition-all duration-300 ${isRoleHovered ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                      onMouseEnter={() => setHoveredRole(title)}
                      onMouseLeave={() => setHoveredRole(null)}
                      style={{ 
                        background: isRoleHovered ? "rgba(255,255,255,0.04)" : "rgba(8,10,14,0.68)", 
                        border: isRoleHovered ? `1px solid ${tone}` : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: isRoleHovered ? `0 10px 30px ${tone}12` : "none"
                      }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tone}22`, border: `1px solid ${tone}44`, color: tone }}>
                          <Icon size={18} />
                        </div>
                        <div className="text-foreground font-extrabold">{title}</div>
                      </div>
                      {/* Visual preview illustration */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                        <img src={image} alt={`${title} preview illustration`} className="w-full h-full object-cover transition-transform duration-350 hover:scale-105" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {steps.map((step, idx) => (
                          <div key={step} className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[0.66rem] font-black transition-all duration-300"
                              style={{ 
                                background: isRoleHovered ? tone : "rgba(255,255,255,0.055)", 
                                border: isRoleHovered ? `1px solid ${tone}` : "1px solid rgba(255,255,255,0.08)", 
                                color: isRoleHovered ? "#080a0e" : tone 
                              }}>
                              {idx + 1}
                            </span>
                            <span className="text-muted-foreground text-xs sm:text-sm">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>
      </section>

      {isPhotographersPage && (
        <section
          id="for-photographers"
          className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-12 border-t relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(10,12,16,0.95) 0%, rgba(15,17,23,0.98) 100%)",
            borderColor: "var(--border)",
          }}
        >
          <PageBackdrop opacity={0.24} />
          <div className="absolute top-1/4 right-10 w-[450px] h-[450px] rounded-full blur-[160px] pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 60%)" }} />

          <div className="max-w-7xl mx-auto relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-center w-full max-w-[358px] sm:max-w-none mx-auto">
              <div className="lg:col-span-5 min-w-0">
                <span style={{ color: "var(--primary)", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  MasterStudio for Pros
                </span>
                <h2 className="mt-3 text-[2.05rem] sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                  Build <span className="bg-gradient-to-r from-[#f7d77b] via-[#e2b047] to-[#c9973a] bg-clip-text text-transparent">branded event galleries</span> in minutes
                </h2>
                <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xl">
                  Create events, upload photos, generate branded QR links, and let guests find their memories with a secure selfie flow.
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {[
                    { value: "QR", label: "Guest entry" },
                    { value: "AI", label: "Face search" },
                    { value: "24/7", label: "Gallery access" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ color: "var(--primary)", fontWeight: 900, fontSize: "1rem" }}>{item.value}</div>
                      <div className="mt-1 text-[0.68rem] text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid sm:flex gap-3 mt-5">
                  <button
                    onClick={() => navigate("/login?tab=register_photographer")}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
                    style={{ background: "linear-gradient(135deg, #f7d77b, #c9973a)", color: "#0a0c10", fontWeight: 950, fontSize: "0.95rem" }}
                  >
                    Join as Photographer
                    <ChevronRight size={17} />
                  </button>
                  <button
                    onClick={() => navigate("/login?tab=photographer")}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all duration-200 hover:opacity-90"
                    style={{ background: "rgba(255,255,255,0.04)", color: "var(--foreground)", fontWeight: 800, fontSize: "0.95rem", border: "1px solid rgba(245,199,95,0.34)" }}
                  >
                    Photographer Login
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-2.5">
                  {[
                    { id: "qr", tab: "flyer", icon: QrCode, title: "1. Brand QR Flyer Designer", desc: "Select color theme, edit event text, and preview the live print-ready guest scan flyer." },
                    { id: "uploader", tab: "uploader", icon: Camera, title: "2. AI Auto-Index Uploader", desc: "Simulate photo uploads to experience real-time AI face mapping and optimization." },
                    { id: "proofing", tab: "proofing", icon: Check, title: "3. Selection Proofing Center", desc: "Review client favorites, select photo IDs, and compile final download ZIPs instantly." },
                    { id: "telemetry", tab: "telemetry", icon: Archive, title: "4. Studio Performance Radar", desc: "Monitor live downloads telemetry, search stats, and request storage upgrades." },
                  ].map(({ id, tab, icon: Icon, title, desc }) => {
                    const isFeatActive = photoWorkflowTab === tab;
                    return (
                      <div 
                        key={title} 
                        className={`flex gap-3 rounded-2xl p-3.5 transition-all duration-300 cursor-pointer ${isFeatActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                        onClick={() => setPhotoWorkflowTab(tab as any)}
                        onMouseEnter={() => {
                          setHoveredPhotoFeat(id);
                          setPhotoWorkflowTab(tab as any);
                        }}
                        onMouseLeave={() => setHoveredPhotoFeat(null)}
                        style={{ 
                          background: isFeatActive ? "rgba(245,199,95,0.06)" : "rgba(255,255,255,0.035)", 
                          border: isFeatActive ? "1px solid rgba(245,199,95,0.3)" : "1px solid rgba(255,255,255,0.08)",
                          boxShadow: isFeatActive ? "0 8px 25px rgba(245,199,95,0.06)" : "none"
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300" 
                          style={{ 
                            background: isFeatActive ? "rgba(245,199,95,0.22)" : "rgba(201,151,58,0.13)", 
                            border: isFeatActive ? "1px solid rgba(245,199,95,0.4)" : "1px solid rgba(201,151,58,0.24)",
                            color: "var(--primary)" 
                          }}
                        >
                          <Icon size={18} className="transition-all duration-300" style={{ transform: isFeatActive ? "scale(1.1) rotate(5deg)" : "none" }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-foreground font-bold text-sm sm:text-base">{title}</h3>
                          <p className="mt-1 text-muted-foreground text-xs sm:text-sm leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-7 min-w-0 animate-fade-in duration-300">
                <div className="rounded-[28px] p-2.5 sm:p-4 overflow-hidden" style={{ background: "linear-gradient(145deg, rgba(245,199,95,0.18), rgba(255,255,255,0.04))", border: "1px solid rgba(245,199,95,0.18)", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
                  <div className="rounded-[22px] p-4 sm:p-5 flex flex-col min-h-[460px]" style={{ background: "rgba(8,10,14,0.92)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
                    
                    {/* Simulator Header Tabs */}
                    <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                        <span className="text-[11px] font-mono text-muted-foreground ml-1.5 uppercase tracking-wider">Studio Workspace v1.2</span>
                      </div>
                      
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Interactive
                      </span>
                    </div>

                    {/* Navigation Tab Bar */}
                    <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.03] border border-white/[0.05] rounded-xl mb-4 text-[10px] font-bold">
                      {[
                        { tab: "flyer", label: "🎨 Flyer", icon: QrCode },
                        { tab: "uploader", label: "⚡ Upload", icon: Camera },
                        { tab: "proofing", label: "✨ Proofing", icon: Check },
                        { tab: "telemetry", label: "📊 Analytics", icon: Archive },
                      ].map((t) => {
                        const isActive = photoWorkflowTab === t.tab;
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.tab}
                            onClick={() => setPhotoWorkflowTab(t.tab as any)}
                            className="flex items-center justify-center gap-1 py-2 rounded-lg transition-all"
                            style={{
                              background: isActive ? "rgba(245,199,95,0.12)" : "transparent",
                              color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                              boxShadow: isActive ? "0 4px 12px rgba(245,199,95,0.06) inset" : "none",
                            }}
                          >
                            <Icon size={12} />
                            <span className="hidden sm:inline">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab Viewport */}
                    <div className="flex-1 flex flex-col justify-between">
                      {photoWorkflowTab === "flyer" && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                          {/* Customizer Panel */}
                          <div className="md:col-span-5 flex flex-col gap-3.5 bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl justify-between">
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Accent Color</label>
                              <div className="flex gap-2 mt-1.5">
                                {[
                                  { color: "#c9973a", name: "Gold" },
                                  { color: "#22c55e", name: "Emerald" },
                                  { color: "#a855f7", name: "Purple" },
                                  { color: "#3b82f6", name: "Blue" },
                                ].map((c) => (
                                  <button
                                    key={c.color}
                                    onClick={() => setFlyerColor(c.color)}
                                    className="w-5 h-5 rounded-full border transition-transform duration-200"
                                    style={{
                                      backgroundColor: c.color,
                                      borderColor: flyerColor === c.color ? "#ffffff" : "transparent",
                                      transform: flyerColor === c.color ? "scale(1.15)" : "scale(1)",
                                      boxShadow: flyerColor === c.color ? `0 0 10px ${c.color}` : "none",
                                    }}
                                    title={c.name}
                                  />
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Typography</label>
                              <div className="grid grid-cols-3 gap-1.5 mt-1.5 text-[9px] font-extrabold uppercase">
                                {[
                                  { font: "sans", label: "Sans" },
                                  { font: "serif", label: "Serif" },
                                  { font: "mono", label: "Mono" },
                                ].map((f) => (
                                  <button
                                    key={f.font}
                                    onClick={() => setFlyerFont(f.font)}
                                    className="py-1.5 px-2 rounded-lg border text-center transition-all"
                                    style={{
                                      borderColor: flyerFont === f.font ? "var(--primary)" : "rgba(255,255,255,0.06)",
                                      background: flyerFont === f.font ? "rgba(245,199,95,0.05)" : "transparent",
                                      color: flyerFont === f.font ? "var(--primary)" : "var(--muted-foreground)",
                                    }}
                                  >
                                    {f.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Event Title</label>
                              <input
                                type="text"
                                value={flyerTitle}
                                onChange={(e) => setFlyerTitle(e.target.value)}
                                className="w-full mt-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-all font-medium"
                                maxLength={28}
                              />
                            </div>
                          </div>

                          {/* Flyer Live Preview Screen */}
                          <div className="md:col-span-7 flex flex-col justify-between items-center bg-[#07090c] rounded-2xl p-4 border border-white/[0.04] relative">
                            {/* Inner Flyer Sheet */}
                            <div className="w-full max-w-[210px] aspect-[1/1.3] bg-zinc-950 rounded-xl p-4 flex flex-col items-center justify-between border-2 text-center shadow-2xl relative overflow-hidden transition-all duration-300"
                              style={{ borderColor: flyerColor }}
                            >
                              <div className="absolute top-[-50px] left-[-50px] w-28 h-28 rounded-full blur-[40px] opacity-15 pointer-events-none" style={{ backgroundColor: flyerColor }} />
                              <div className="absolute bottom-[-50px] right-[-50px] w-28 h-28 rounded-full blur-[40px] opacity-15 pointer-events-none" style={{ backgroundColor: flyerColor }} />

                              <div className="w-full flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                <Camera size={8} style={{ color: flyerColor }} />
                                <span>Official Gallery QR</span>
                              </div>

                              <div className="my-2">
                                <h4 className="text-sm font-black truncate leading-tight transition-all duration-300"
                                  style={{
                                    fontFamily: flyerFont === "serif" ? "Georgia, serif" : flyerFont === "mono" ? "Courier, monospace" : "inherit",
                                    color: flyerColor
                                  }}
                                >
                                  {flyerTitle || "Event Name"}
                                </h4>
                                <div className="text-[7px] text-muted-foreground uppercase tracking-widest mt-0.5">Scan to find your photos</div>
                              </div>

                              {/* QR Box */}
                              <div className="p-2 bg-white rounded-lg relative flex items-center justify-center">
                                <div className="w-16 h-16 grid grid-cols-7 gap-0.5 p-0.5 bg-white">
                                  {(() => {
                                    const blackCells = [
                                      0, 1, 2, 4, 5, 6, 7, 9, 11, 13, 14, 15, 16, 18, 19, 20,
                                      28, 29, 30, 35, 37, 42, 43, 44, 4, 10, 17, 22, 23, 25, 26, 31,
                                      33, 34, 38, 40, 46, 48
                                    ];
                                    return Array.from({ length: 49 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className="rounded-[0.5px]"
                                        style={{
                                          background: blackCells.includes(i) ? "#07090d" : "transparent"
                                        }}
                                      />
                                    ));
                                  })()}
                                </div>
                              </div>

                              <div className="text-[7px] text-muted-foreground/80 leading-normal max-w-[140px] italic">
                                Selfie verification matching live
                              </div>

                              <div className="text-[6px] font-black tracking-widest uppercase text-muted-foreground/60">
                                Powered by MasterStudio.in
                              </div>
                            </div>

                            {/* Download Action Trigger */}
                            <button
                              onClick={startFlyerDownload}
                              disabled={flyerDownloading}
                              className="mt-3.5 w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all text-[#080a0e]"
                              style={{
                                background: flyerDownloadDone
                                  ? "linear-gradient(135deg, #10b981, #059669)"
                                  : "linear-gradient(135deg, #ffe69a 0%, #c9973a 100%)",
                                opacity: flyerDownloading ? 0.75 : 1,
                              }}
                            >
                              {flyerDownloading ? (
                                <>
                                  <Loader2 size={13} className="animate-spin" />
                                  Compiling Vector PDF...
                                </>
                              ) : flyerDownloadDone ? (
                                <>
                                  <Check size={13} className="stroke-[3]" />
                                  Saved to Downloads!
                                </>
                              ) : (
                                <>
                                  <Download size={13} />
                                  Download Print Flyer PDF
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {photoWorkflowTab === "uploader" && (
                        <div className="flex-1 flex flex-col justify-between bg-[#07090c] rounded-2xl p-4 border border-white/[0.04] min-h-[350px]">
                          {!isUploading && simulatedUploadProgress === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/[0.08] text-muted-foreground mb-3 animate-bounce">
                                <Camera size={22} />
                              </div>
                              <div className="text-xs font-extrabold text-foreground">Upload Event Gallery</div>
                              <div className="text-[10px] text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
                                Simulate drag-and-dropping raw shoots to experience our auto-indexing AI pipeline.
                              </div>
                              
                              <button
                                onClick={startSimulatedUpload}
                                className="mt-5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 text-[#080a0e] flex items-center gap-1.5 shadow-lg"
                                style={{ background: "linear-gradient(135deg, #ffe69a 0%, #c9973a 100%)" }}
                              >
                                <Play size={11} fill="currentColor" /> Simulate Upload (24 Files)
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <div className="text-xs font-extrabold text-foreground">AI Indexing Pipeline</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">Uploading raw shoots to studio vault</div>
                                  </div>
                                  <span className="text-xs font-mono font-black" style={{ color: "var(--primary)" }}>{simulatedUploadProgress}%</span>
                                </div>

                                <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden mb-3">
                                  <div className="h-full bg-gradient-to-r from-[#c9973a] to-[#f7d77b] rounded-full transition-all duration-100" style={{ width: `${simulatedUploadProgress}%` }} />
                                </div>
                              </div>

                              {/* Simulated Logs Terminal */}
                              <div className="flex-1 font-mono text-[9px] bg-[#030508] border border-white/[0.04] p-3 rounded-xl flex flex-col gap-1 text-muted-foreground leading-relaxed overflow-hidden max-h-[160px] min-h-[140px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-emerald-400 font-extrabold">[CONN]</span>
                                  <span>Secure photographer session verified.</span>
                                </div>
                                {simulatedUploadProgress >= 5 && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-emerald-400 font-extrabold">[UPL]</span>
                                    <span>Uploading original raw shoot files (1.2 GB)...</span>
                                  </div>
                                )}
                                {simulatedUploadProgress >= 20 && (
                                  <div className="flex items-center gap-1.5 text-slate-400">
                                    <span>→ Uploaded: DSC_0910.CR3 to DSC_0922.CR3 (12 files)</span>
                                  </div>
                                )}
                                {simulatedUploadProgress >= 45 && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-blue-400 font-extrabold">[OPT]</span>
                                    <span>Generating low-latency WebP previews (800px)...</span>
                                  </div>
                                )}
                                {simulatedUploadProgress >= 70 && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-amber-400 font-extrabold">[AI]</span>
                                    <span>Extracting facial embeds with DeepFace.NET...</span>
                                  </div>
                                )}
                                {simulatedUploadProgress >= 88 && (
                                  <div className="flex items-center gap-1.5 text-slate-400">
                                    <span>→ Generated 412 face keypoints for photo catalog</span>
                                  </div>
                                )}
                                {simulatedUploadProgress === 100 && (
                                  <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold animate-pulse">
                                    <span>[OK]</span>
                                    <span>Indexing complete! QR link is fully functional.</span>
                                  </div>
                                )}
                              </div>

                              {/* Action Footer */}
                              <div className="mt-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                  <Loader2 size={11} className={`text-muted-foreground ${simulatedUploadProgress < 100 ? "animate-spin" : "hidden"}`} />
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {simulatedUploadProgress < 100 ? "Processing raw queues..." : "24 photos indexed."}
                                  </span>
                                </div>

                                {simulatedUploadProgress === 100 ? (
                                  <button
                                    onClick={() => {
                                      setSimulatedUploadProgress(0);
                                      setIsUploading(false);
                                    }}
                                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-white/[0.06] hover:bg-white/[0.1] text-foreground transition-all"
                                  >
                                    Reset Simulator
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setIsUploading(false);
                                      setSimulatedUploadProgress(0);
                                    }}
                                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {photoWorkflowTab === "proofing" && (
                        <div className="flex-1 flex flex-col justify-between bg-[#07090c] rounded-2xl p-4 border border-white/[0.04] min-h-[350px]">
                          <div>
                            <div className="flex items-center justify-between mb-3 text-xs">
                              <div>
                                <span className="text-foreground font-extrabold">Client Selection Proofing</span>
                                <div className="text-[9px] text-muted-foreground mt-0.5">Reviews submitted by the client team</div>
                              </div>
                              <span className="font-mono text-[10px] text-emerald-400 font-black">16 selected / 4 comments</span>
                            </div>

                            {/* Selections grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                              {[
                                { src: PHOTO_COLLAGE[0].src, note: "Client: Love this candid shot!", name: "Wedding_042.RAW" },
                                { src: PHOTO_COLLAGE[2].src, note: "Client: Color correct please", name: "Wedding_108.RAW" },
                              ].map((item, idx) => (
                                <div key={idx} className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-zinc-950 p-2 flex gap-2.5 items-center">
                                  <img src={item.src} alt="Proof" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[9px] font-bold text-foreground truncate">{item.name}</div>
                                    <div className="text-[8px] text-[#f5c75f] font-medium truncate mt-0.5 italic">"{item.note}"</div>
                                  </div>
                                  <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900 shadow">
                                    <Check size={8} className="stroke-[3]" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            {zipCompiling ? (
                              <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl text-center mb-3">
                                <Loader2 size={18} className="animate-spin text-[var(--primary)] mx-auto mb-2" />
                                <div className="text-[10px] font-bold text-foreground">Assembling Delivery ZIP...</div>
                                <div className="text-[8px] text-muted-foreground mt-0.5 animate-pulse">Watermarking RAW frames & compressing original files</div>
                              </div>
                            ) : zipReady ? (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-center mb-3 flex items-center justify-between gap-3">
                                <div className="text-left">
                                  <div className="text-[10px] font-bold text-emerald-400">High-Res Package Generated</div>
                                  <div className="text-[8px] text-muted-foreground mt-0.5">16 RAW photos • 142.4 MB ZIP archive</div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setZipReady(false);
                                      setZipCompiling(false);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-white/[0.05] hover:bg-white/[0.1] text-foreground"
                                  >
                                    Reset
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      alert("Mock high-res ZIP package download initiated successfully!");
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase bg-emerald-500 text-slate-950 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Download size={9} className="stroke-[3]" /> Download
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={startZipCompilation}
                                className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-[#080a0e] flex items-center justify-center gap-1.5 transition-all mb-3 cursor-pointer"
                                style={{ background: "linear-gradient(135deg, #ffe69a 0%, #c9973a 100%)" }}
                              >
                                <Archive size={13} /> Compile High-Res Delivery ZIP
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {photoWorkflowTab === "telemetry" && (
                        <div className="flex-1 flex flex-col justify-between bg-[#07090c] rounded-2xl p-4 border border-white/[0.04] min-h-[350px]">
                          {/* Metrics stats row */}
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            {[
                              { label: "Match Speed", val: "0.85s", color: "text-emerald-400" },
                              { label: "Guest Scans", val: "412", color: "text-[var(--primary)]" },
                              { label: "Downloads", val: "1.4K", color: "text-blue-400" },
                            ].map((stat) => (
                              <div key={stat.label} className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl text-center">
                                <div className="text-[8px] text-muted-foreground uppercase tracking-wider truncate">{stat.label}</div>
                                <div className={`text-xs sm:text-sm font-black mt-1 ${stat.color}`}>{stat.val}</div>
                              </div>
                            ))}
                          </div>

                          {/* SVG Traffic Histogram */}
                          <div className="flex-1 flex flex-col justify-between bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl my-3">
                            <div className="flex items-center justify-between text-[9px] mb-2">
                              <span className="text-muted-foreground uppercase font-extrabold tracking-wider">Weekly Downloads Traffic</span>
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Monitoring active
                              </span>
                            </div>

                            {/* Visual SVG chart */}
                            <div className="relative h-20 w-full flex items-end justify-between px-1">
                              {[
                                { day: "Mon", height: "35%" },
                                { day: "Tue", height: "45%" },
                                { day: "Wed", height: "30%" },
                                { day: "Thu", height: "65%" },
                                { day: "Fri", height: "85%" },
                                { day: "Sat", height: "95%" },
                                { day: "Sun", height: "75%" },
                              ].map((bar, idx) => (
                                <div key={idx} className="flex flex-col items-center flex-1 gap-1.5 group">
                                  <div className="w-3.5 sm:w-5 bg-gradient-to-t from-[#c9973a] to-[#ffe69a] rounded-t-sm transition-all duration-700 ease-out relative group-hover:opacity-90"
                                    style={{ height: bar.height }}
                                  >
                                    <div className="absolute top-[-18px] left-1/2 -translate-x-1/2 bg-zinc-950 border border-white/[0.1] rounded px-1 text-[7px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-bold font-mono">
                                      {bar.height}
                                    </div>
                                  </div>
                                  <span className="text-[8px] text-muted-foreground font-mono">{bar.day}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Storage Quota bar */}
                          <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[9px] font-bold text-foreground mb-1">
                                <span className="flex items-center gap-1"><Archive size={9} className="text-[var(--primary)]" /> Storage Limit</span>
                                <span>19.2 GB / 50 GB Used</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#c9973a] to-[#ffe69a] rounded-full" style={{ width: "38.4%" }} />
                              </div>
                            </div>
                            <a
                              href="#photographer-pricing-table"
                              onClick={(e) => {
                                e.preventDefault();
                                const target = document.getElementById("photographer-pricing-table");
                                if (target) target.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="shrink-0 text-[9px] font-black uppercase text-[var(--primary)] hover:underline flex items-center gap-0.5"
                            >
                              Upgrade
                              <ChevronRight size={8} />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <div id="photographer-pricing-table" className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-[358px] sm:max-w-none mx-auto">
              {[
                { name: "Launch Offer", quota: "50 GB", price: "Free", note: "Early access photographers", active: true },
                { name: "Studio Premium", quota: "150 GB", price: "Upgrade", note: "For growing event studios", active: false },
                { name: "Studio Elite", quota: "500 GB", price: "Upgrade", note: "For high-volume teams", active: false },
              ].map((plan) => {
                const isPlanHovered = hoveredPlan === plan.name;
                return (
                  <div 
                    key={plan.name} 
                    className={`rounded-2xl p-5 transition-all duration-300 ${isPlanHovered ? 'scale-[1.03]' : 'hover:scale-[1.01]'}`}
                    onMouseEnter={() => setHoveredPlan(plan.name)}
                    onMouseLeave={() => setHoveredPlan(null)}
                    style={{ 
                      background: isPlanHovered ? "rgba(245,199,95,0.06)" : plan.active ? "rgba(245,199,95,0.09)" : "rgba(255,255,255,0.035)", 
                      border: isPlanHovered ? "1px solid var(--primary)" : plan.active ? "1px solid rgba(245,199,95,0.25)" : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: isPlanHovered ? "0 10px 30px rgba(245,199,95,0.12)" : "none"
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-foreground font-extrabold text-sm">{plan.name}</div>
                      {plan.active && <span className="rounded-full px-2.5 py-0.5 text-[0.58rem] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>}
                    </div>
                    <div className="mt-4 flex items-end gap-2">
                      <div style={{ color: "var(--primary)", fontSize: "1.75rem", fontWeight: 950, lineHeight: 1 }}>{plan.quota}</div>
                      <div className="text-muted-foreground text-xs mb-0.5 font-bold uppercase tracking-wider">storage</div>
                    </div>
                    <div className="mt-2 text-muted-foreground text-xs leading-relaxed min-h-[32px]">{plan.note}</div>
                    <button className="mt-4 w-full py-2.5 rounded-xl text-xs font-black transition-all duration-300 border uppercase tracking-wider"
                      style={{ 
                        background: isPlanHovered || plan.active ? "linear-gradient(135deg, #f7d77b, #c9973a)" : "rgba(255,255,255,0.03)", 
                        color: isPlanHovered || plan.active ? "#0a0c10" : "var(--muted-foreground)", 
                        borderColor: isPlanHovered || plan.active ? "var(--primary)" : "rgba(255,255,255,0.08)"
                      }}
                    >
                      {plan.price}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* For Photographers Section */}
      <section
        id="for-photographers-old"
        className="hidden"
        style={{
          background: "linear-gradient(180deg, rgba(10,12,16,0.95) 0%, rgba(15,17,23,0.98) 100%)",
          borderColor: "var(--border)",
        }}
      >
        <PageBackdrop opacity={0.24} />
        {/* Glow */}
        <div
          className="absolute top-1/4 right-10 w-[450px] h-[450px] rounded-full blur-[160px] pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 60%)" }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span
              style={{
                color: "var(--primary)",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              MasterStudio for Pros
            </span>
            <h2 className="mt-2 text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
              Designed for Professional Photographers
            </h2>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              Create client events, upload high-res shoots, and let our secure AI deliver photos to guests instantly. Scale your booking business and delight clients.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Photographer Features */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">Grow Your Business with AI</h3>
              
              {[
                {
                  title: "Real-Time Event Management",
                  desc: "Instantly register events. Generate dynamic QR codes and link custom client galleries on the fly.",
                },
                {
                  title: "High-Performance Upload & AI Indexing",
                  desc: "Drag-and-drop hundreds of raw/JPG images. Our cloud GPU cluster processes and face-indexes them in seconds.",
                },
                {
                  title: "Automated Secure Guest Search",
                  desc: "Guests upload a quick selfie to view only their pictures. Safe, private, and extremely delightful.",
                },
                {
                  title: "Business Analytics & Insights",
                  desc: "Track guest downloads, most popular photo items, active sharing, and event performance stats in real-time.",
                },
              ].map((feat, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl transition-all hover:bg-white/[0.02]" style={{ border: "1px solid rgba(255,255,255,0.03)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(201,151,58,0.15)" }}>
                    <span style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: 700 }}>{i + 1}</span>
                  </div>
                  <div>
                    <h4 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 600, marginBottom: "2px" }}>{feat.title}</h4>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.5 }}>{feat.desc}</p>
                  </div>
                </div>
              ))}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-4 mt-4">
                <button
                  onClick={() => navigate("/login?tab=register_photographer")}
                  className="flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
                  style={{
                    background: "var(--primary)",
                    color: "#0a0c10",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  Join as Photographer
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => navigate("/login?tab=photographer")}
                  className="flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 hover:opacity-90"
                  style={{
                    background: "var(--secondary)",
                    color: "var(--foreground)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  Photographer Login
                </button>
              </div>
            </div>

            {/* Right Column: Photographer Dashboard Preview */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl p-6" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
                {/* Dashboard Header */}
                <div className="flex items-center justify-between pb-4 mb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-[10px] text-muted-foreground font-mono ml-2">photographer_dashboard.exe</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold tracking-wider uppercase">Active Session</span>
                </div>

                {/* Dashboard Stats Preview */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "Total Events", val: "0", sub: "Create events", color: "#3b82f6" },
                    { label: "Photos Uploaded", val: "0", sub: "Awaiting upload", color: "#c9973a" },
                    { label: "Guest Downloads", val: "0", sub: "No downloads yet", color: "#22c55e" },
                  ].map((stat, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#13161d]" style={{ border: "1px solid rgba(201,151,58,0.1)" }}>
                      <span className="text-[9px] text-muted-foreground block mb-1">{stat.label}</span>
                      <span className="text-lg font-bold text-foreground block leading-tight">{stat.val}</span>
                      <span className="text-[8px] text-emerald-400 font-medium mt-1 inline-block">● {stat.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Event Queue List */}
                <div className="rounded-xl bg-[#13161d] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="px-4 py-2.5 bg-white/[0.01] flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-[10px] text-muted-foreground font-semibold">Active Client Events</span>
                    <span className="text-[9px] text-[var(--primary)] font-semibold cursor-pointer hover:underline">Manage All</span>
                  </div>
                  <div className="divide-y divide-white/[0.03] text-[11px]">
                    {[
                      { name: "No events created yet", date: "Create your first real event", status: "Pending", photos: "0", guests: "0" }
                    ].map((row, i) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.01]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{row.name}</span>
                          <span className="text-[9px] text-muted-foreground">{row.date}</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="block text-foreground font-medium">{row.photos} photos</span>
                            <span className="block text-[8px] text-muted-foreground">{row.guests} guests</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${row.status === "Active" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indexing status bar */}
                <div className="mt-4 p-3 rounded-xl bg-white/[0.01]" style={{ border: "1px solid rgba(255,255,255,0.03)" }}>
                  <div className="flex justify-between items-center text-[10px] mb-1.5">
                    <span className="text-muted-foreground">AI Face Indexing Progress</span>
                    <span className="text-[var(--primary)] font-semibold font-mono">0%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" style={{ width: "0%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        className={isFeaturesPage ? "" : "hidden"}
        style={{
          background: "linear-gradient(135deg, rgba(201,151,58,0.08) 0%, transparent 60%), var(--card)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-14 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 text-center">
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                  color: "var(--primary)",
                  lineHeight: 1,
                }}
              >
                {value}
              </span>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", fontWeight: 500 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className={`${isContactPage ? "" : "hidden"} py-10 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-12 border-t relative overflow-hidden`} style={{ background: "rgba(15,17,23,0.95)", borderColor: "var(--border)" }}>
        <PageBackdrop opacity={0.2} />
        {/* Decorative background glow */}
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none opacity-15"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }} />

        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="text-center w-full max-w-[358px] sm:max-w-[40rem] mx-auto mb-8 sm:mb-12">
            <span style={{ color: "var(--primary)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Studio Support
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
              Let&apos;s build your event photo experience
            </h2>
            <p className="mt-3 sm:mt-4 text-muted-foreground text-[0.88rem] sm:text-base leading-relaxed px-1">
              Talk to us about branded galleries, QR guest flows, photographer onboarding, or a custom MasterStudio setup.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 w-full max-w-[358px] sm:max-w-none mx-auto">
            {/* Left Column: Info */}
            <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-5">
              <div className="rounded-[26px] p-5 sm:p-6" style={{ background: "rgba(8,10,14,0.76)", border: "1px solid rgba(245,199,95,0.16)", backdropFilter: "blur(18px)", boxShadow: "0 20px 70px rgba(0,0,0,0.24)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto sm:mx-0" style={{ background: "rgba(245,199,95,0.12)", border: "1px solid rgba(245,199,95,0.24)", color: "var(--primary)" }}>
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground text-center sm:text-left">Contact Information</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-center sm:text-left px-1 sm:px-0">
                  We are available for integrations, custom features, and enterprise installations. Reach out to us directly through any of these channels.
                </p>

                <div className="flex flex-col gap-3 mt-5">
                  {[
                    { icon: Mail, label: "Email Support", val: "akashkr0196@gmail.com", color: "var(--primary)" },
                    { icon: Phone, label: "Call Us", val: "+91 82980 33887 / +91 82710 46511", color: "#3b82f6" },
                    { icon: MapPin, label: "Headquarters", val: "Silli, Ranchi, Jharkhand - 835102", color: "#22c55e" }
                  ].map(({ icon: Icon, label, val, color }, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl p-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <Icon size={16} style={{ color }} />
                      </div>
                      <div className="min-w-0">
                        <div style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", fontWeight: 500 }}>{label}</div>
                        <div className="break-words" style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 600, marginTop: "2px" }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social links block */}
              <div className="rounded-[24px] p-5 text-center sm:text-left" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", fontWeight: 700, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Follow Us</div>
                <div className="flex justify-center sm:justify-start gap-3 mb-4">
                  {[
                    { label: "Instagram", icon: Instagram },
                    { label: "Facebook", icon: Facebook },
                    { label: "YouTube", icon: Youtube }
                  ].map(({ label, icon: Icon }) => (
                    <a key={label} href="#" className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--primary)" }}>
                      <Icon size={15} />
                    </a>
                  ))}
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                  <div style={{ color: "#86efac", fontSize: "0.84rem", fontWeight: 800 }}>Average reply within 24 hours</div>
                  <div className="mt-1 text-xs text-muted-foreground">For urgent event setup, call us directly.</div>
                </div>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="lg:col-span-3 min-w-0">
              <div className="rounded-[30px] p-4 sm:p-6 min-w-0 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(19,22,29,0.94), rgba(10,12,16,0.94))", border: "1px solid rgba(245,199,95,0.16)", boxShadow: "0 24px 80px rgba(0,0,0,0.32)", backdropFilter: "blur(18px)" }}>
                <div className="flex items-center justify-between gap-3 mb-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <div className="text-foreground text-lg sm:text-xl font-extrabold">Send a Message</div>
                    <div className="text-muted-foreground text-xs sm:text-sm mt-1">Tell us what you want to launch.</div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl hidden sm:flex items-center justify-center" style={{ background: "rgba(245,199,95,0.12)", color: "var(--primary)", border: "1px solid rgba(245,199,95,0.22)" }}>
                    <Send size={19} />
                  </div>
                </div>
                
                {contactSent ? (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center gap-4 animate-fadeIn">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)" }}>Message Sent Successfully!</h3>
                      <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginTop: "6px" }}>
                        Thank you for reaching out. We will get back to you within 24 hours.
                      </p>
                    </div>
                    <button onClick={() => setContactSent(false)} className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(201,151,58,0.15)", color: "var(--primary)", border: "1px solid var(--primary)" }}>
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await api.submitContact(contactName, contactEmail, contactMsg);
                      setContactSent(true);
                      setContactName("");
                      setContactEmail("");
                      setContactMsg("");
                    } catch (err: any) {
                      alert("Failed to send message: " + err.message);
                    }
                  }} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <label style={{ fontSize: "0.78rem", color: "var(--foreground)", fontWeight: 700 }}>Your Name</label>
                        <input type="text" placeholder="John Doe" value={contactName} onChange={(e) => setContactName(e.target.value)}
                          className="w-full px-4 py-3 sm:py-2.5 rounded-xl outline-none"
                          style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(201,151,58,0.18)", color: "var(--foreground)", fontSize: "0.9rem" }} required />
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <label style={{ fontSize: "0.78rem", color: "var(--foreground)", fontWeight: 700 }}>Email Address</label>
                        <input type="email" placeholder="john@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full px-4 py-3 sm:py-2.5 rounded-xl outline-none"
                          style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(201,151,58,0.18)", color: "var(--foreground)", fontSize: "0.9rem" }} required />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label style={{ fontSize: "0.78rem", color: "var(--foreground)", fontWeight: 700 }}>Message</label>
                      <textarea rows={5} placeholder="Tell us how we can help you..." value={contactMsg} onChange={(e) => setContactMsg(e.target.value)}
                        className="w-full px-4 py-3 sm:py-2.5 rounded-xl outline-none resize-none"
                        style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(201,151,58,0.18)", color: "var(--foreground)", fontSize: "0.9rem" }} required />
                    </div>
                    <button type="submit" className="w-full py-3.5 rounded-2xl transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #c9973a, #e8b84b)", color: "#0a0c10", fontWeight: 800, fontSize: "0.92rem" }}>
                      <Send size={14} /> Send Message
                    </button>
                    <div className="text-center text-[0.72rem] text-muted-foreground">No spam. Only MasterStudio support will contact you.</div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 lg:px-12 border-t pb-[110px] lg:pb-0" style={{ background: "linear-gradient(180deg, rgba(8,11,14,0.98) 0%, #050708 100%)", borderColor: "rgba(245,199,95,0.12)" }}>
        <div className="max-w-7xl mx-auto py-9 sm:py-12 lg:py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.9fr_0.9fr] gap-8 sm:gap-10 lg:gap-14">
          {/* Column 1: Brand & Logo */}
          <div className="flex flex-col gap-4 items-center text-center sm:items-start sm:text-left">
            <button className="self-center sm:self-start" onClick={() => navigate("/")}>
              <img src={logoImg} alt="MasterStudio" className="h-[50px] sm:h-[56px] w-auto object-contain" />
            </button>
            <p className="max-w-[330px] sm:max-w-[390px]" style={{ color: "rgba(255,255,255,0.68)", fontSize: "0.86rem", lineHeight: 1.65 }}>
              AI-powered face matching platform for event photography. Guests scan, upload a selfie, and find their memories instantly.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2.5">
              {[
                { icon: Shield, label: "Private" },
                { icon: Zap, label: "Fast AI" },
                { icon: Download, label: "Easy Downloads" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)", fontSize: "0.76rem", fontWeight: 600 }}
                >
                  <Icon size={14} style={{ color: "var(--primary)" }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          
          {/* Column 2: Company */}
          <div className="text-center sm:text-left">
            <h4 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
              Pages
            </h4>
            <ul className="flex flex-col items-center sm:items-start gap-2.5 sm:gap-3">
              {NAV_LINKS.map(item => (
                <li key={item}>
                  <a
                    href={NAV_ROUTES[item]}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateNav(item);
                    }}
                    className="transition-all duration-200 inline-block hover:translate-x-1"
                    style={{
                      color: activeNav === item ? "var(--primary)" : "rgba(255,255,255,0.66)",
                      fontSize: "0.86rem",
                      fontWeight: activeNav === item ? 700 : 500,
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 3: Support */}
          <div className="text-center sm:text-left">
            <h4 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
              Contact
            </h4>
            <div className="flex flex-col gap-3">
              {[
                { icon: Mail, label: "akashkr0196@gmail.com" },
                { icon: Phone, label: "+91 82980 33887 / +91 82710 46511" },
                { icon: MapPin, label: "Silli, Ranchi, Jharkhand - 835102" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center justify-center sm:justify-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(245,199,95,0.08)", border: "1px solid rgba(245,199,95,0.14)" }}>
                    <Icon size={15} style={{ color: "var(--primary)" }} />
                  </div>
                  <span className="min-w-0 break-words" style={{ color: "rgba(255,255,255,0.68)", fontSize: "0.84rem", fontWeight: 500 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Column 4: Social Media */}
          <div className="text-center sm:text-left">
            <h4 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
              Social
            </h4>
            <div className="flex justify-center sm:justify-start gap-3 mb-5">
              {[
                { label: "Instagram", icon: Instagram },
                { label: "Facebook", icon: Facebook },
                { label: "YouTube", icon: Youtube }
              ].map(({ label, icon: Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--primary)" }}
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
            <button
              onClick={() => navigate("/admin")}
              className="w-full sm:w-auto rounded-2xl sm:rounded-full px-5 py-3 transition-all duration-200 hover:opacity-90"
              style={{ border: "1px solid rgba(245,199,95,0.5)", color: "var(--primary)", fontWeight: 700, fontSize: "0.86rem" }}
            >
              Super Admin Portal
            </button>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pb-7 pt-5 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="hidden">
            &copy; 2026 MasterStudio. All rights reserved. |{" "}
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigate("/admin");
              }}
              className="hover:text-[var(--primary)] transition-all duration-300 font-semibold"
            >
              Super Admin Portal
            </a>
          </p>
          <p style={{ color: "rgba(255,255,255,0.54)", fontSize: "0.8rem" }}>
            &copy; 2026 MasterStudio. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-5" style={{ color: "rgba(255,255,255,0.54)", fontSize: "0.8rem" }}>
            <button onClick={() => setActivePolicyModal("privacy")} className="hover:text-[var(--primary)] transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit text-xs">Privacy Policy</button>
            <button onClick={() => setActivePolicyModal("terms")} className="hover:text-[var(--primary)] transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit text-xs">Terms &amp; Conditions</button>
            <button onClick={() => setActivePolicyModal("refund")} className="hover:text-[var(--primary)] transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit text-xs">Refund &amp; Cancellation</button>
            <button onClick={() => setActivePolicyModal("cookie")} className="hover:text-[var(--primary)] transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit text-xs">Cookie Policy</button>
          </div>
        </div>
      </footer>
      </div>

      {/* ── MOBILE Bottom Tab Bar ── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 lg:hidden transition-all duration-300 transform ${isInputFocused ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
        style={{
          background: "linear-gradient(180deg, rgba(3,6,8,0) 0%, rgba(3,6,8,0.97) 20%, #030608 100%)",
          paddingBottom: "env(safe-area-inset-bottom, 10px)",
        }}
      >
        <div
          className="mx-3 mb-2 rounded-2xl flex items-center justify-around"
          style={{
            background: "rgba(13,16,22,0.96)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 -4px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {[
            { label: "Home", path: "/", icon: Home },
            { label: "How It Works", path: "/how-it-works", icon: Play },
            { label: "Find Photos", path: "/find", icon: Camera, isPrimary: true },
            { label: "Photographers", path: "/for-photographers", icon: Star },
            { label: "Login", path: "/login", icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path === "/" && currentPath === "");

            if (item.isPrimary) {
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-between py-1.5 relative z-10 transition-all duration-200"
                  style={{ width: "64px", height: "56px" }}
                >
                  <div
                    className="w-13 h-13 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 absolute -top-4 shadow-xl"
                    style={{
                      background: "linear-gradient(180deg, #ffe69a 0%, #c9973a 100%)",
                      border: "2px solid rgba(255,255,255,0.18)",
                      boxShadow: "0 8px 25px rgba(201,151,58,0.48), 0 0 15px rgba(201,151,58,0.22)",
                    }}
                  >
                    <Icon size={22} style={{ color: "#07090d" }} />
                  </div>
                  {/* Empty spacer to reserve height for floating icon */}
                  <div className="h-6 w-full shrink-0" />
                  <span
                    className="text-[0.58rem] font-extrabold whitespace-nowrap"
                    style={{ color: "#f5c75f" }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 relative transition-all duration-150"
                style={{ minHeight: "56px", flex: 1 }}
              >
                {isActive && (
                  <span
                    className="absolute top-1 left-1/2"
                    style={{
                      width: "3px",
                      height: "3px",
                      borderRadius: "50%",
                      background: "#f5c75f",
                      transform: "translateX(-50%)",
                      boxShadow: "0 0 6px rgba(245,199,95,0.9)",
                    }}
                  />
                )}
                <Icon
                  size={19}
                  style={{
                    color: isActive ? "#f5c75f" : "rgba(255,255,255,0.46)",
                    transform: isActive ? "scale(1.12)" : "scale(1)",
                    transition: "transform 150ms ease, color 150ms ease",
                    filter: isActive ? "drop-shadow(0 0 5px rgba(245,199,95,0.5))" : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.58rem",
                    fontWeight: isActive ? 800 : 500,
                    color: isActive ? "#f5c75f" : "rgba(255,255,255,0.46)",
                    transition: "color 150ms ease",
                  }}
                >
                  {item.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── POLICY MODAL OVERLAY ── */}
      {activePolicyModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setActivePolicyModal(null)}
        >
          <div 
            className="bg-[#0b0e14] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 199, 95, 0.05)"
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-[#f5c75f]" />
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {activePolicyModal === "privacy" && "Privacy Policy"}
                  {activePolicyModal === "terms" && "Terms & Conditions"}
                  {activePolicyModal === "refund" && "Refund & Cancellation Policy"}
                  {activePolicyModal === "cookie" && "Cookie Policy"}
                </h3>
              </div>
              <button 
                onClick={() => setActivePolicyModal(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer border-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-gray-300 scrollbar-thin">
              {activePolicyModal === "privacy" && (
                <>
                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      1. Guest Selfie Usage
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      When you upload a selfie to find your photos, our system processes it temporarily to generate unique facial embedding coordinates. This selfie is used strictly to match and filter your pictures from the event gallery. We do not use it for user identity mapping, advertising, or selling data.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      2. How Face Recognition Works
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      Our AI face matching engine analyzes key facial landmarks from the uploaded selfie to build a digital map vector. It then mathematically compares this vector with all faces detected in the photographer's uploaded album. Photos containing matches are displayed to you. This is a search-matching lookup, not a biometric profiling system.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      3. Data Retention Period
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      Photos and face vectors are stored securely on our cloud storage. The default retention period is 90 days from the event upload date, after which the database entries and original files are auto-purged, unless the photographer opts for extended archival hosting (up to 1 year maximum).
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      4. Data Delete Policy
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      You have full control over your data. Guests can request immediate deletion of their selfies and matching datasets at any time. Photographers can delete entire galleries directly from their dashboard, which permanently wipes all associated images and search indexes from our servers with zero latency.
                    </p>
                  </div>
                </>
              )}

              {activePolicyModal === "terms" && (
                <>
                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      1. Platform Use Rules
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      Users must use MasterStudio only for legal event photo management. Uploading offensive, inappropriate, abusive, or copyrighted content without consent is strictly prohibited. Violation will result in immediate ban and removal of resources.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      2. Photographer & Guest Responsibilities
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      • <em>Photographers</em> are responsible for getting the client's consent to share photos online and ensuring privacy.
                      <br />• <em>Guests</em> are responsible for uploading only their own selfie for face recognition matching and respecting the host's gallery privacy.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      3. Copyright Ownership of Photos
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      All photos uploaded remain the intellectual property and copyright of the original photographer. Guests are granted a non-exclusive license to download and view photos for personal, non-commercial use only.
                    </p>
                  </div>
                </>
              )}

              {activePolicyModal === "refund" && (
                <>
                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      1. Future Paid Plans Roadmap
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      MasterStudio is currently operating on free/promo tiers. If advanced premium tiers, storage plans, or high-volume face search tokens are introduced in the future, photographers will be notified. Pricing, billing cycle, and refund policies for those plans will be published dynamically during sign-up.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      2. Booking & Service Cancellation Rules
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      MasterStudio is a software platform and is not involved in financial bookings or offline event contracts between photographer partners and clients. Any deposit refund or session cancellation must be mutually resolved directly between you and the photographer as per your direct contract.
                    </p>
                  </div>
                </>
              )}

              {activePolicyModal === "cookie" && (
                <>
                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      1. Website Cookies Usage
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      Yes, MasterStudio uses essential cookies and local storage tokens. They are strictly necessary to authenticate your credentials, secure API requests, keep your admin panel active, and temporarily save your navigation path. We do not sell cookie profiles.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-base font-semibold text-[#f5c75f] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f5c75f]"></span>
                      2. Analytics Tracking Information
                    </h4>
                    <p className="pl-3.5 text-gray-300">
                      We track anonymous application metrics like load latency, success rate of face matching, and device screen dimensions to optimize the user interface. No third-party ad tracking, social network pixel trackers, or cross-site fingerprinting scripts are running on this platform.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.01] flex justify-end">
              <button 
                onClick={() => setActivePolicyModal(null)}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-[#07090d] bg-gradient-to-r from-[#ffe69a] to-[#c9973a] hover:from-[#fff0c2] hover:to-[#dbab4c] active:scale-95 transition-all shadow-md cursor-pointer border-0"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
