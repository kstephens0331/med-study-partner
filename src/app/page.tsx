"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { weakestSync as weakest, bump, preloadSkills } from "@/lib/ai/skillMap";
import { createClient } from "@/lib/supabaseClient";
import SRSDeck from "./components/SRSDeck";
import LectureViewer from "./components/LectureViewer";
import VignetteBank from "./components/VignetteBank";
import VideoReview from "./components/VideoReview";
import WelcomeModal from "./components/WelcomeModal";

type Msg = { role: "user" | "assistant"; content: string };
type InterjectStyle = "raise-hand" | "auto";
type TabType = "coach" | "srs" | "lectures" | "vignettes" | "videos";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("coach");

  // Quick mode
  const [listening, setListening] = useState(false);

  // Shared
  const [youSaid, setYouSaid] = useState<string>("");
  const [coachSaid, setCoachSaid] = useState<string>("");
  const [history, setHistory] = useState<Msg[]>([]);
  const recRef = useRef<SpeechRecognition | null>(null);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

  // Deck state
  const [deckOutline, setDeckOutline] = useState<string[]>([]);
  const [deckKeywords, setDeckKeywords] = useState<string[]>([]);
  const [deckContext, setDeckContext] = useState<string>("");
  const [topicLock, setTopicLock] = useState<boolean>(true);

  // Lecture mode state
  const [lectureMode, setLectureMode] = useState<boolean>(false);
  const [lectureOn, setLectureOn] = useState<boolean>(false);
  const [interjectStyle, setInterjectStyle] = useState<InterjectStyle>("raise-hand");
  const [aggressiveness, setAggressiveness] = useState<number>(3); // 1–5
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [lectureBuffer, setLectureBuffer] = useState<string>(""); // rolling transcript
  const questionDraftRef = useRef<string>(""); // prepared question waiting to be called on

  // Interjection loop state
  const intervalIdRef = useRef<number | null>(null);
  const tickIdRef = useRef<number | null>(null);
  const [msUntilInterject, setMsUntilInterject] = useState<number>(0);
  const [intervalMs, setIntervalMs] = useState<number>(3 * 60 * 1000); // default 3m

  // ========= Helpers =========
  const speechSupported = () =>
    typeof window !== "undefined" &&
    ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);

  const ensureRecognizer = () => {
    if (!speechSupported()) return null;
    if (recRef.current) return recRef.current;
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const rec: SpeechRecognition = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        final += e.results[i][0].transcript;
      }
      setYouSaid((prev) => (lectureOn ? prev : final.trim()));
      if (lectureOn) {
        setLectureBuffer((buf) => (buf + " " + final).slice(-100000));
      }
    };
    rec.onend = () => {
      if (!lectureOn) setListening(false);
      if (lectureOn) {
        // restart for continuous capture
        try {
          rec.start();
        } catch {}
      }
    };
    recRef.current = rec;
    return recRef.current;
  };

  // Preload skills on mount
  useEffect(() => {
    preloadSkills();
  }, []);

  // Init recognizer (on mount / when lectureOn changes)
  useEffect(() => {
    ensureRecognizer();
    return () => {
      // cleanup on unmount
      try {
        recRef.current?.stop();
      } catch {}
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (tickIdRef.current) clearInterval(tickIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureOn]);

  // Map aggressiveness → interval minutes (5/4/3/2/1)
  useEffect(() => {
    const mins = [5, 4, 3, 2, 1][aggressiveness - 1] || 3;
    setIntervalMs(mins * 60 * 1000);
  }, [aggressiveness]);

  // Reschedule interjections whenever interval changes while lecture is running
  useEffect(() => {
    if (lectureOn) {
      scheduleInterjections(intervalMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, lectureOn, interjectStyle]);

  // Hotkey: C to "Call on Coach" when hand raised
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "c" && handRaised) {
        e.preventDefault();
        callOnCoach();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handRaised]);

  // ========= Quick mode =========
  function startHold() {
    const rec = ensureRecognizer();
    if (!rec) {
      alert("SpeechRecognition not supported in this browser.");
      return;
    }
    if (lectureOn) {
      alert("Stop lecture mode before using quick mode.");
      return;
    }
    setYouSaid("");
    setCoachSaid("");
    setListening(true);
    rec.continuous = false;
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  async function stopHold() {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
    const transcript = youSaid.trim();
    if (!transcript) return;
    await askCoach(transcript);
  }

  // ========= Lecture mode =========
  function startLecture() {
    const rec = ensureRecognizer();
    if (!rec) {
      alert("SpeechRecognition not supported in this browser.");
      return;
    }
    if (listening) {
      alert("Stop quick mode recording first.");
      return;
    }
    setLectureOn(true);
    setLectureBuffer("");
    setCoachSaid("");
    setYouSaid("");
    questionDraftRef.current = "";
    setHandRaised(false);

    rec.continuous = true;
    rec.interimResults = true;
    try {
      rec.start();
    } catch {}

    scheduleInterjections(intervalMs);
  }

  function stopLecture() {
    setLectureOn(false);
    try {
      recRef.current?.stop();
    } catch {}
    clearInterjections();
    setHandRaised(false);
  }

  function clearInterjections() {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (tickIdRef.current) {
      clearInterval(tickIdRef.current);
      tickIdRef.current = null;
    }
    setMsUntilInterject(0);
  }

  function scheduleInterjections(ms: number) {
    clearInterjections();
    // countdown
    setMsUntilInterject(ms);
    tickIdRef.current = window.setInterval(() => {
      setMsUntilInterject((prev) => {
        const next = Math.max(0, prev - 200); // 5hz tick
        return next;
      });
    }, 200);

    // interject loop
    intervalIdRef.current = window.setInterval(async () => {
      setMsUntilInterject(ms); // reset timer UI

      // build a draft from the last slice
      const slice = lectureBuffer.slice(-8000);
      const draft = await buildQuestionDraft(slice);
      questionDraftRef.current = draft;

      if (interjectStyle === "auto") {
        await speakCoach(draft);
      } else {
        setHandRaised(true);
        // subtle chime; safe no-op if blocked
        try {
          new Audio(
            "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="
          ).play();
        } catch {}
      }
    }, ms);
  }

  async function callOnCoach() {
    if (!questionDraftRef.current) return;
    await speakCoach(questionDraftRef.current);
    setHandRaised(false);
    questionDraftRef.current = "";
  }

  // ========= Coach interaction =========
  async function buildQuestionDraft(contextSlice: string) {
    const priorMessages: Msg[] = history.slice(-6);
    const weakTags = weakest(2);
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: contextSlice || "Summarize last segment",
        weakTags,
        priorMessages,
        deckContext,
        deckKeywords,
        topicLock: true,
      }),
    });
    const data = await res.json();
    return data.text || "Quick probe: what’s the very next step, and why?";
  }

  async function askCoach(transcript: string) {
    const priorMessages = history.slice(-8);
    const weakTags = weakest(2);

    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        weakTags,
        priorMessages,
        deckContext,
        deckKeywords,
        topicLock,
      }),
    });
    const data = await res.json();
    const reply = data.text || "Give me a 60-sec explanation; I’ll probe next.";

    setHistory((h) => [
      ...h,
      { role: "user", content: transcript },
      { role: "assistant", content: reply },
    ]);
    setCoachSaid(reply);
    speak(reply);

    if (reply.toLowerCase().includes("teach-back")) weakTags.forEach((tag) => bump(tag, -1));
  }

  async function speakCoach(text: string) {
    setHistory((h) => [...h, { role: "assistant", content: text }]);
    setCoachSaid(text);
    speak(text);
  }

  function speak(text: string) {
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    synth.cancel();
    synth.speak(u);
  }

  // ========= Upload =========
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.ok) {
      alert(data.error || "Upload failed");
      return;
    }
    setDeckOutline(data.outline || []);
    setDeckKeywords(data.keywords || []);
    setDeckContext(data.context || "");
  }

  // ========= Auth =========
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // ========= UI =========
  const nextPct =
    intervalMs > 0 ? Math.max(0, Math.min(100, 100 - (msUntilInterject / intervalMs) * 100)) : 0;

  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Med Study Partner</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Upload your deck, lock probes to it, and teach out loud. Feynman-style.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status chip */}
            <div
              className={`rounded-full border px-3 py-1 text-xs ${
                lectureOn
                  ? "border-emerald-700 bg-emerald-900/20 text-emerald-300"
                  : listening
                  ? "border-rose-700 bg-rose-900/20 text-rose-300"
                  : "border-zinc-700 bg-zinc-900/40 text-zinc-300"
              }`}
              title={lectureOn ? "Lecture mode running" : listening ? "Quick capture" : "Idle"}
            >
              {lectureOn ? "Lecture On" : listening ? "Recording…" : "Idle"}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="mb-6 flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2">
          <button
            onClick={() => setActiveTab("coach")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "coach"
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            AI Coach
          </button>
          <button
            onClick={() => setActiveTab("srs")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "srs"
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            SRS Review
          </button>
          <button
            onClick={() => setActiveTab("lectures")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "lectures"
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            Materials
          </button>
          <button
            onClick={() => setActiveTab("vignettes")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "vignettes"
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            Vignettes
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "videos"
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            Video Review
          </button>
        </nav>

        {/* Tab Content */}
        {activeTab === "coach" && (
          <>
            {/* Topic Lock Option */}
            <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={topicLock}
                  onChange={(e) => setTopicLock(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                Lock coach to uploaded material (upload from Materials tab)
              </label>

              {deckOutline.length > 0 && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="text-xs font-medium text-zinc-300">Outline preview</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-300">
                      {deckOutline.slice(0, 10).map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="text-xs font-medium text-zinc-300">Keywords</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {deckKeywords.slice(0, 15).map((k, i) => (
                        <span key={i} className="rounded-full bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

        {/* Mode toggle */}
        <section className="mb-4 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={lectureMode}
              onChange={(e) => setLectureMode(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Lecture Mode
          </label>

          {lectureMode && (
            <>
              <div className="inline-flex items-center gap-2 text-sm">
                Interject:
                <select
                  value={interjectStyle}
                  onChange={(e) => setInterjectStyle(e.target.value as InterjectStyle)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
                >
                  <option value="raise-hand">Raise hand</option>
                  <option value="auto">Auto-interrupt</option>
                </select>
              </div>

              <div className="inline-flex items-center gap-3 text-sm">
                Aggressiveness
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={aggressiveness}
                  onChange={(e) => setAggressiveness(parseInt(e.target.value))}
                />
                <span className="text-xs text-zinc-400">{aggressiveness}/5</span>
              </div>
            </>
          )}
        </section>

        {/* Controls */}
        {!lectureMode ? (
          <section className="mb-6 flex items-center gap-3">
            <button
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
              disabled={lectureOn}
              className={`rounded-xl px-5 py-3 text-sm font-medium text-white transition ${
                lectureOn
                  ? "cursor-not-allowed bg-zinc-700"
                  : listening
                  ? "bg-rose-600 shadow-lg shadow-rose-900/30"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
              }`}
            >
              {listening ? "Listening… (release)" : "Hold to Talk"}
            </button>

            <button
              onClick={() => window.speechSynthesis?.cancel()}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800"
            >
              Stop Voice
            </button>
          </section>
        ) : (
          <section className="mb-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {!lectureOn ? (
                <button
                  onClick={startLecture}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Start Lecture
                </button>
              ) : (
                <button
                  onClick={stopLecture}
                  className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-medium text-white hover:bg-rose-500"
                >
                  Stop Lecture
                </button>
              )}

              {handRaised && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-600/20 px-3 py-1 text-amber-300">
                    ✋ Coach has a question
                  </span>
                  <button
                    onClick={callOnCoach}
                    className="rounded-lg border border-amber-700 bg-amber-800/40 px-3 py-2 text-sm text-amber-100 hover:bg-amber-700/50"
                    title="Hotkey: C"
                  >
                    Call on Coach
                  </button>
                </div>
              )}
            </div>

            {/* Progress toward next interjection */}
            {lectureOn && (
              <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2">
                <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Next interjection</span>
                  <span>{Math.ceil(msUntilInterject / 1000)}s</span>
                </div>
                <div className="h-2 w-full rounded bg-zinc-800">
                  <div
                    className="h-2 rounded bg-emerald-600 transition-[width] duration-150"
                    style={{ width: `${nextPct}%` }}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Conversation panes */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="mb-2 text-sm font-medium text-zinc-300">You said</h2>
            <p className="min-h-24 whitespace-pre-wrap text-sm text-zinc-200">
              {lectureOn ? "(capturing live…)" : youSaid || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="mb-2 text-sm font-medium text-zinc-300">Coach</h2>
            <p className="min-h-24 whitespace-pre-wrap text-sm text-zinc-200">{coachSaid || "—"}</p>
          </div>
        </section>

        {/* History */}
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="mb-2 text-sm font-medium text-zinc-300">Recent turns</div>
          <div className="max-h-64 overflow-auto text-sm">
            {history.length === 0 && (
              <div className="text-zinc-400">
                Tip: In Lecture Mode, the coach raises a hand at intervals. Press <b>C</b> or click
                <i> Call on Coach</i>.
              </div>
            )}
            {history.map((m, i) => (
              <div key={i} className="mb-2">
                <span className="mr-2 rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-300">
                  {m.role === "user" ? "You" : "Coach"}
                </span>
                <span className="text-zinc-200">{m.content}</span>
              </div>
            ))}
          </div>
        </section>
          </>
        )}

        {/* SRS Tab */}
        {activeTab === "srs" && <SRSDeck />}

        {/* Lectures Tab */}
        {activeTab === "lectures" && <LectureViewer />}

        {/* Vignettes Tab */}
        {activeTab === "vignettes" && <VignetteBank />}

        {/* Video Review Tab */}
        {activeTab === "videos" && <VideoReview />}
      </div>

      {/* Welcome Modal - Shows on first visit */}
      <WelcomeModal />
    </main>
  );
}
