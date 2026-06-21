
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      if (import.meta.env.PROD) {
        navigator.serviceWorker.register("/sw.js").catch((error) => {
          console.warn("Service worker registration failed:", error);
        });
        return;
      }

      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      }).catch((error) => {
        console.warn("Service worker cleanup failed:", error);
      });
    });
  }
  
