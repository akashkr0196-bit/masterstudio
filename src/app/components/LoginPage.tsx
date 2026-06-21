import { useState } from "react";
import logoImg from "../../imports/logo.png";
import loginBg from "../../imports/login.png";
import { api } from "../api";
import {
  Eye,
  EyeOff,
  Facebook,
  Instagram,
  Lock,
  LogIn,
  Mail,
  Shield,
  Twitter,
  Youtube,
} from "lucide-react";

export function LoginPage({
  onBack,
  onLogin,
  isAdminPortal = false,
  defaultTab,
}: {
  onBack: () => void;
  onLogin: (role: "super_admin" | "photographer" | "user", email: string, sessionId?: string) => void;
  isAdminPortal?: boolean;
  defaultTab?: "customer" | "photographer" | "register" | "register_photographer";
}) {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  // Registration States
  const [isRegistering, setIsRegistering] = useState(
    defaultTab === "register" || defaultTab === "register_photographer"
  );
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Status States
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const title = isRegistering
    ? "Create Account"
    : isAdminPortal
      ? "Super Admin Portal"
      : "Photographer Login";
  const subtitle = isRegistering
    ? "Create a photographer workspace to manage events, uploads, QR links, and client selections."
    : isAdminPortal
      ? "Access MasterStudio administrative system"
      : "Login to manage events, uploads, client selections, and guest delivery.";
  const isSuperAdminMode = isAdminPortal;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      const requestedRole = isSuperAdminMode ? "super_admin" : "photographer";
      const session = await api.login(trimmedEmail, password, requestedRole);
      onLogin(session.role, session.email, session.session_id || "");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uniqueId = `U${Date.now().toString().slice(-8)}`;
      await api.createUser(uniqueId, regName.trim(), regEmail.trim().toLowerCase(), "Photographer", {
        password: regPassword,
        first_login_done: false,
      });

      const session = await api.login(regEmail.trim().toLowerCase(), regPassword, "photographer");
      onLogin(session.role, session.email, session.session_id || "");
    } catch (err: any) {
      setError(err.message || "Failed to create account. Email may already be registered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: "#030608",
        color: "#f7f7f7",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 18%, rgba(255,217,120,0.09), transparent 28%), radial-gradient(circle at 82% 42%, rgba(240,185,50,0.08), transparent 36%), linear-gradient(90deg, #030608 0%, #030608 43%, #07090b 100%)",
        }}
      />
      <div className="relative z-10 min-h-screen px-4 py-5 sm:px-8 lg:px-10 flex flex-col">
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(470px,0.85fr)_1.55fr] gap-8 xl:gap-14 items-stretch">
          <section
            className="w-full max-w-[560px] rounded-[22px] px-5 py-5 sm:px-9 sm:py-8 flex flex-col self-center mx-auto lg:mx-0 lg:self-center"
            style={{
              background: "linear-gradient(180deg, rgba(9,14,19,0.92) 0%, rgba(5,9,13,0.86) 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 28px 90px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,255,255,0.06)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <button type="button" onClick={onBack} className="self-start cursor-pointer">
                <img src={logoImg} alt="MasterStudio" className="h-[52px] sm:h-[62px] w-auto object-contain" />
              </button>
              <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(201,151,58,0.12)", border: "1px solid rgba(201,151,58,0.22)", color: "#f0b932", fontSize: "0.72rem", fontWeight: 800 }}>
                <Shield size={13} />
                Secure Access
              </div>
            </div>

            <div className="mt-6 sm:mt-8 flex flex-col gap-4">
              <div>
                <h2 className="text-[1.85rem] sm:text-[2.35rem] leading-tight font-extrabold">
                  {title}
                </h2>
                <p className="mt-2 text-[0.9rem] sm:text-[1rem]" style={{ color: "rgba(255,255,255,0.68)", lineHeight: 1.65 }}>
                  {subtitle}
                </p>
              </div>

          {/* Error Alert Box */}
          {error && (
            <div
              className="p-3.5 rounded-lg text-sm"
              style={{
                background: "rgba(239,68,68,0.12)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.2)",
                lineHeight: 1.5
              }}
            >
              {error}
            </div>
          )}

          {!isRegistering ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {isSuperAdminMode && (
                <div className="rounded-2xl px-4 py-3 text-xs leading-relaxed" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(255,255,255,0.78)" }}>
                  Super Admin access is restricted to the platform owner. Every login attempt is rate-limited and recorded in audit logs.
                </div>
              )}

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.82rem", fontWeight: 800 }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2" size={19} color="rgba(240,185,50,0.86)" />
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-[54px] pl-[50px] pr-4 rounded-2xl outline-none transition-all"
                    style={{
                      background: "rgba(2,6,9,0.72)",
                      border: "1px solid rgba(255,255,255,0.13)",
                      color: "#f7f7f7",
                      fontSize: "0.92rem",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.82rem", fontWeight: 800 }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={19} color="rgba(240,185,50,0.86)" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-[54px] pl-[50px] pr-12 rounded-2xl outline-none transition-all"
                    style={{
                      background: "rgba(2,6,9,0.72)",
                      border: "1px solid rgba(255,255,255,0.13)",
                      color: "#f7f7f7",
                      fontSize: "0.92rem",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,255,255,0.72)" }}
                  >
                    {showPass ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-5 w-5 rounded"
                    style={{ accentColor: "#c9973a" }}
                  />
                  <span style={{ color: "rgba(255,255,255,0.77)", fontSize: "0.9rem" }}>Remember Me</span>
                </label>
                <a
                  href="#"
                  style={{ color: "#f0b932", fontSize: "0.9rem", fontWeight: 600 }}
                >
                  Forgot Password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[56px] rounded-2xl transition-all duration-200 hover:opacity-95 hover:-translate-y-0.5 flex items-center justify-center gap-3 font-extrabold"
                style={{
                  background: "linear-gradient(180deg, #ffd978 0%, #e3ad3d 100%)",
                  color: "#0a0c10",
                  fontSize: "1rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 14px 34px rgba(227,173,61,0.24)",
                }}
              >
                <LogIn size={22} />
                {loading ? "Authenticating..." : isSuperAdminMode ? "Login as Super Admin" : "Login as Photographer"}
              </button>

            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              {/* Full Name */}
              <div className="flex flex-col gap-2">
                <label style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.82rem", fontWeight: 800 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Your Studio Name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl outline-none transition-all"
                  style={{
                    background: "rgba(2,6,9,0.72)",
                    border: "1px solid rgba(255,255,255,0.13)",
                    color: "#f0ede6",
                    fontSize: "0.95rem",
                  }}
                  required
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.82rem", fontWeight: 800 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. kiran@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl outline-none transition-all"
                  style={{
                    background: "rgba(2,6,9,0.72)",
                    border: "1px solid rgba(255,255,255,0.13)",
                    color: "#f0ede6",
                    fontSize: "0.95rem",
                  }}
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.82rem", fontWeight: 800 }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Create password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-5 py-3.5 pr-12 rounded-2xl outline-none transition-all"
                    style={{
                      background: "rgba(2,6,9,0.72)",
                      border: "1px solid rgba(255,255,255,0.13)",
                      color: "#f0ede6",
                      fontSize: "0.95rem",
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "#8b8fa8" }}
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[56px] rounded-2xl transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 flex items-center justify-center font-extrabold"
                style={{
                  background: "linear-gradient(180deg, #ffd978 0%, #e3ad3d 100%)",
                  color: "#0a0c10",
                  fontSize: "1.05rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 14px 34px rgba(227,173,61,0.24)",
                }}
              >
                {loading ? "Registering account..." : "Create Photographer Account"}
              </button>
            </form>
          )}

          {/* Switch Login/Register Trigger Link */}
          {!isAdminPortal && !isSuperAdminMode && (
            <p className="text-center" style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.9rem", marginTop: "0" }}>
              {isRegistering ? "Already have an account? " : "Don't have an account? "}
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError(null);
                }}
                style={{ color: "#f0b932", fontWeight: 600 }}
                className="hover:underline bg-transparent border-none outline-none cursor-pointer"
              >
                {isRegistering ? "Login Now" : "Register Now"}
              </button>
            </p>
          )}
            </div>
          </section>

          <section className="hidden lg:block relative min-h-[690px] overflow-hidden rounded-[24px]" style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 28px 90px rgba(0,0,0,0.35)" }}>
            <img
              src={loginBg}
              alt=""
              className="absolute left-[-70%] top-[-6%] h-[112%] w-[170%] max-w-none object-cover"
              style={{ objectPosition: "center top", opacity: 0.94 }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(3,6,8,0.36) 0%, rgba(3,6,8,0.10) 42%, rgba(3,6,8,0.03) 100%)",
              }}
            />
          </section>
        </main>

        <footer
          className="mt-4 min-h-[74px] px-5 sm:px-10 flex flex-col lg:flex-row items-center justify-between gap-4"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.13)",
            background: "rgba(2,5,7,0.42)",
          }}
        >
          <div className="flex items-center gap-4 text-center lg:text-left" style={{ color: "rgba(255,255,255,0.76)" }}>
            <Shield size={20} color="#f0b932" />
            <span>
              We respect your <span style={{ color: "#f0b932" }}>privacy.</span> Your data will never be shared.
            </span>
          </div>

          <div className="flex items-center gap-4">
            {[
              { label: "Instagram", icon: Instagram },
              { label: "Facebook", icon: Facebook },
              { label: "YouTube", icon: Youtube },
              { label: "Twitter", icon: Twitter },
            ].map(({ label, icon: Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.06)", color: "#fff" }}
              >
                <Icon size={18} />
              </a>
            ))}
          </div>

          <p className="text-center lg:text-right tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.9rem" }}>
            &copy; 2024 <span style={{ color: "#f0b932", fontWeight: 700 }}>Masterstudio.</span> All Rights Reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
