import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, post, ApiError } from "../lib/api";
import {
  pending,
  sync,
  wipe,
  type Queued,
  discardQueued,
} from "../lib/offline";
import type { User } from "../lib/types";

const words = {
  en: {
    home: "Home",
    atlas: "Classroom atlas",
    bridges: "Bridge planner",
    review: "Teach-back review",
    impact: "Learning evidence",
    diagnostics: "My exercises",
    missions: "Bridge missions",
    echo: "Echo checks",
    signin: "Sign in",
    signout: "Sign out",
    online: "Online",
    offline: "Offline",
    understand: "Understand. Try. Teach. Remember.",
  },
  hi: {
    home: "मुखपृष्ठ",
    atlas: "कक्षा मानचित्र",
    bridges: "सीखने की योजना",
    review: "समझ की समीक्षा",
    impact: "सीखने के प्रमाण",
    diagnostics: "मेरे अभ्यास",
    missions: "सीखने की गतिविधियाँ",
    echo: "दोबारा जाँच",
    signin: "साइन इन",
    signout: "साइन आउट",
    online: "ऑनलाइन",
    offline: "ऑफ़लाइन",
    understand: "समझें। आज़माएँ। सिखाएँ। याद रखें।",
  },
  or: {
    home: "ମୂଳପୃଷ୍ଠା",
    atlas: "ଶ୍ରେଣୀ ମାନଚିତ୍ର",
    bridges: "ଶିକ୍ଷଣ ଯୋଜନା",
    review: "ବୁଝାମଣା ସମୀକ୍ଷା",
    impact: "ଶିକ୍ଷଣ ପ୍ରମାଣ",
    diagnostics: "ମୋର ଅଭ୍ୟାସ",
    missions: "ଶିକ୍ଷଣ କାର୍ଯ୍ୟ",
    echo: "ପୁନଃ ଯାଞ୍ଚ",
    signin: "ସାଇନ୍ ଇନ୍",
    signout: "ସାଇନ୍ ଆଉଟ୍",
    online: "ଅନଲାଇନ୍",
    offline: "ଅଫଲାଇନ୍",
    understand: "ବୁଝନ୍ତୁ। ଚେଷ୍ଟା କରନ୍ତୁ। ଶିଖାନ୍ତୁ। ମନେ ରଖନ୍ତୁ।",
  },
};
type Key = keyof typeof words.en;
type Context = {
  user: User | null;
  loading: boolean;
  demo: boolean;
  online: boolean;
  queued: Queued[];
  language: "en" | "hi" | "or";
  setLanguage: (v: "en" | "hi" | "or") => void;
  t: (k: Key) => string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  notice: string;
  notify: (v: string) => void;
  syncNow: () => Promise<void>;
  discard: (id: string) => Promise<void>;
};
const AppContext = createContext<Context>(null!);
export const useApp = () => useContext(AppContext);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [demo, setDemo] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [queued, setQueued] = useState<Queued[]>([]),
    [language, setLanguage] = useState<"en" | "hi" | "or">("en"),
    [notice, notify] = useState("");
  const client = useQueryClient();
  async function refresh() {
    try {
      const data = await api("/auth/me");
      setUser(data.user);
      setDemo(data.demo_mode);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401)
        notify("Cannot reach the server. Reconnect to sign in.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []); // session is verified with the server; never persist credentials in browser storage
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    const update = () => {
      if (user)
        pending(user.id)
          .then(setQueued)
          .catch(() =>
            notify("Device storage is unavailable. Use online submission."),
          );
      else setQueued([]);
    };
    update();
    window.addEventListener("aha-queue", update);
    return () => window.removeEventListener("aha-queue", update);
  }, [user]);
  const syncNow = useCallback(async () => {
    if (!user) return;
    try {
      if (!(await pending(user.id)).length) return;
      await sync(user.id);
      await client.invalidateQueries();
      notify(
        "Sync checked. Conflicting responses stay on this device for review.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }, [user, client]);
  useEffect(() => {
    if (online && user) void syncNow();
  }, [online, user, syncNow]);
  async function logout() {
    let serverError: unknown = null;
    try {
      await post("/auth/logout");
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) serverError = e;
    }
    let storageError: unknown = null;
    try {
      await wipe();
    } catch (e) {
      storageError = e;
    }
    client.clear();
    setUser(null);
    setQueued([]);
    if (serverError)
      throw new Error(
        "Local work was cleared where device storage was available. Server sign-out could not be confirmed. Reconnect and sign out before leaving this shared browser.",
      );
    if (storageError)
      notify(
        "Server session ended. Browser storage could not be cleared; clear this site’s data in browser settings.",
      );
  }
  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        demo,
        online,
        queued,
        language,
        setLanguage,
        t: (k) => words[language][k],
        refresh,
        logout,
        notice,
        notify,
        syncNow,
        discard: async (id) => {
          await discardQueued(id);
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
