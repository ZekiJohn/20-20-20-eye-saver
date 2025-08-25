import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Play, Pause, SkipForward, Bell, Volume2, VolumeX, Moon, Sun, Download, BarChart3, Coffee, Droplets, Accessibility, Fullscreen, RotateCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";

/**
 * 20‑20‑20 Eye Saver — React single‑file component
 */

const LS_SETTINGS_KEY = "twenty20.settings.v1";
const LS_LOG_KEY = "twenty20.log.v1";

const defaultSettings = {
  focusMin: 20,
  breakSec: 20,
  longBreakMin: 5,
  cyclesUntilLong: 4,
  autoStartNext: true,
  notifications: true,
  sound: true,
  voice: false,
  dimDuringBreak: true,
  hydrationNudgeMin: 60,
  postureNudgeMin: 30,
  theme: "system",
};

function loadSettings() {
  try { const raw = localStorage.getItem(LS_SETTINGS_KEY); return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings; } catch { return defaultSettings; }
}
function saveSettings(s) { try { localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s)); } catch {} }
function loadLog() { try { const raw = localStorage.getItem(LS_LOG_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function saveLog(log) { try { localStorage.setItem(LS_LOG_KEY, JSON.stringify(log)); } catch {} }

function secondsToMmSs(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function speak(text) { try { const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {} }

function ping(a = 0.15, b, c) {
  try {
    let volume, freq, duration;
    if (typeof a === "object" && a !== null) { ({ volume = 0.15, freq = 880, duration = 180 } = a); }
    else { volume = a ?? 0.15; freq = b ?? 880; duration = c ?? 180; }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.value = volume; o.connect(g).connect(ctx.destination); o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, duration);
  } catch {}
}

function ensureNotificationPermission() {
  try {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "default") { Notification.requestPermission().then(() => {}); }
    return Notification.permission === "granted";
  } catch { return false; }
}
function notify(title, body) {
  try {
    if (!("Notification" in window)) return;
    const show = () => new Notification(title, { body });
    if (Notification.permission === "granted") show();
    else if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => { if (perm === "granted") show(); });
    }
  } catch {}
}

function useTheme(setting) {
  useEffect(() => {
    const root = document.documentElement;
    const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = setting === "dark" || (setting === "system" && preferDark);
    root.classList.toggle("dark", dark);
  }, [setting]);
}

// pre-break tone helper
function computePreBreakTone(state, soundEnabled, nextSeconds) {
  if (state !== "focus" || !soundEnabled) return null;
  if (nextSeconds > 0 && nextSeconds <= 3) return 1200;
  return null;
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [log, setLog] = useState(loadLog);
  const [state, setState] = useState("idle");
  const [remaining, setRemaining] = useState(settings.focusMin * 60);
  const [cycleCount, setCycleCount] = useState(0);
  const [lastHydration, setLastHydration] = useState(Date.now());
  const [lastPosture, setLastPosture] = useState(Date.now());
  const [overlay, setOverlay] = useState(false);
  const intervalRef = useRef(null);
  const startedRef = useRef(false);

  useTheme(settings.theme);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveLog(log), [log]);

  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get("selftest") === "1") runSelfTests(); }, []);
  useEffect(() => { if (settings.notifications && "Notification" in window && Notification.permission === "default") Notification.requestPermission(); }, [settings.notifications]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); toggleStartPause(); }
      else if (e.key?.toLowerCase() === "s") skip();
      else if (e.key?.toLowerCase() === "f") toggleFullscreen();
      else if (e.key?.toLowerCase() === "r") resetAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, remaining, settings]);

  useEffect(() => {
    if (state === "idle" || state === "paused") return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (state === "break" && settings.sound && r > 0) ping(0.12);
        const f = computePreBreakTone(state, settings.sound, next);
        if (f) ping({ freq: f, volume: 0.12, duration: 120 });
        return next;
      });
      const now = Date.now();
      if (settings.hydrationNudgeMin && now - lastHydration > settings.hydrationNudgeMin * 60000) {
        if (settings.notifications) notify("Hydration check", "Take a sip of water");
        if (settings.sound) ping(0.1);
        setLastHydration(now);
      }
      if (settings.postureNudgeMin && now - lastPosture > settings.postureNudgeMin * 60000) {
        if (settings.notifications) notify("Posture check", "Relax shoulders, ears over shoulders, feet flat");
        if (settings.sound) ping(0.1);
        setLastPosture(now);
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [state, settings.hydrationNudgeMin, settings.postureNudgeMin, settings.sound, settings.notifications, lastHydration, lastPosture]);

  useEffect(() => {
    if (state === "idle" || state === "paused") return;
    if (remaining > 0) return;
    if (state === "focus") {
      const nextIsLong = (cycleCount + 1) % settings.cyclesUntilLong === 0;
      const nextState = nextIsLong ? "longbreak" : "break";
      setState(nextState);
      const nextRemain = nextIsLong ? settings.longBreakMin * 60 : settings.breakSec;
      setRemaining(nextRemain);
      setCycleCount((c) => c + 1);
      remind("Break time", nextIsLong ? `Take ${settings.longBreakMin} minutes away from screens` : `Look 20 feet away for ${settings.breakSec} seconds`);
      if (settings.dimDuringBreak) setOverlay(true);
      setLog((L) => [...L, { t: Date.now(), type: nextState }]);
    } else if (state === "break" || state === "longbreak") {
      setState(settings.autoStartNext ? "focus" : "idle");
      setRemaining(settings.focusMin * 60);
      setOverlay(false);
      if (settings.autoStartNext) remind("Focus time", `Next focus: ${settings.focusMin} minutes`, { sound: false });
    }
  }, [remaining]);

  function remind(title, body, opts = {}) {
    const { sound = true } = opts; if (sound && settings.sound) ping(); if (settings.notifications) notify(title, body); if (settings.voice) speak(`${title}. ${body}.`);
  }
  function start() { setState("focus"); setRemaining(settings.focusMin * 60); startedRef.current = true; if (settings.notifications) ensureNotificationPermission(); }

  function pause() { setState("paused"); }
  function resume() { setState("focus"); }
  function toggleStartPause() { if (state === "idle") start(); else if (state === "focus" || state === "break" || state === "longbreak") pause(); else if (state === "paused") resume(); }
  function skip() { setRemaining(0); }
  function resetAll() { setState("idle"); setRemaining(settings.focusMin * 60); setCycleCount(0); setOverlay(false); }
  function clearHistory() { setLog([]); }
  function exportCSV() {
    const rows = [["timestamp_iso", "type"], ...log.map((e) => [new Date(e.t).toISOString(), e.type])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "twenty20_log.csv"; a.click(); URL.revokeObjectURL(url);
  }
  function toggleFullscreen() { const elem = document.documentElement; if (!document.fullscreenElement) elem.requestFullscreen?.(); else document.exitFullscreen?.(); }

  const progress = useMemo(() => {
    const total = state === "focus" ? settings.focusMin * 60 : state === "break" ? settings.breakSec : state === "longbreak" ? settings.longBreakMin * 60 : settings.focusMin * 60;
    return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  }, [state, remaining, settings]);

  const chartData = useMemo(() => {
    const byDay = new Map();
    log.forEach((e) => { const d = new Date(e.t); const key = d.toLocaleDateString(); const current = byDay.get(key) || 0; if (e.type === "break" || e.type === "longbreak") byDay.set(key, current + 1); });
    const arr = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const key = d.toLocaleDateString(); arr.push({ day: key, breaks: byDay.get(key) || 0 }); }
    return arr;
  }, [log]);

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6" /><h1 className="text-xl font-semibold tracking-tight">20‑20‑20 Eye Saver</h1>
              <span className="text-xs text-slate-500 ml-2 hidden sm:inline">Healthy eyes for heavy screen days</span>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={toggleFullscreen}><Fullscreen className="w-5 h-5" /></Button></TooltipTrigger><TooltipContent>Fullscreen (F)</TooltipContent></Tooltip>
              <Select value={settings.theme} onValueChange={(v) => setSettings((s) => ({ ...s, theme: v }))}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system"><div className="flex items-center gap-2"><Sun className="w-4 h-4"/>System</div></SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-4 h-4"/>Dark</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />Timer</CardTitle>
              <CardDescription>Default: focus {settings.focusMin} min → break {settings.breakSec}s (every {settings.cyclesUntilLong} cycles: long break {settings.longBreakMin} min)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-stretch">
                <div className="flex-1">
                  <div className="text-6xl font-bold tabular-nums text-center mb-3 select-none">{secondsToMmSs(remaining)}</div>
                  <div className="text-center mb-6 text-sm text-slate-500 capitalize">{state === "idle" ? "idle" : state}</div>
                  <Progress value={progress} className="h-2" />
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button onClick={toggleStartPause} className="px-5">{state === "idle" || state === "paused" ? (<div className="flex items-center gap-2"><Play className="w-4 h-4"/>Start</div>) : (<div className="flex items-center gap-2"><Pause className="w-4 h-4"/>Pause</div>)}</Button>
                    <Button variant="secondary" onClick={skip}><div className="flex items-center gap-2"><SkipForward className="w-4 h-4"/>Skip</div></Button>
                    <Button variant="ghost" onClick={resetAll}><div className="flex items-center gap-2"><RotateCcw className="w-4 h-4"/>Reset</div></Button>
                  </div>
                  <p className="text-center text-xs text-slate-500 mt-2">Shortcuts: Space=Start/Pause, S=Skip, F=Fullscreen, R=Reset</p>
                </div>

                <div className="w-full lg:w-[360px]">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm">
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><Eye className="w-4 h-4"/>Break Coach</h3>
                    {state === "break" || state === "longbreak" ? (
                      <ul className="text-sm leading-6 list-disc ml-5">
                        <li>Look at something <b>far away</b> (~6 meters/20 feet).</li>
                        <li>"Blink 10 slow times": squeeze gently, then open.</li>
                        <li>Relax shoulders; drop your jaw; inhale through nose, slow exhale.</li>
                        <li>Optional: cover eyes with palms 10–15s (no pressure on the eyeball).</li>
                      </ul>
                    ) : (
                      <ul className="text-sm leading-6 text-slate-600 dark:text-slate-400 list-disc ml-5">
                        <li>Every 20 min, rest eyes for 20 sec at 20 feet.</li>
                        <li>Keep screens slightly below eye level; blink more when reading.</li>
                        <li>Micro‑stretch: roll shoulders; chin tuck; wrist flex/extend.</li>
                      </ul>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Switch checked={settings.dimDuringBreak} onCheckedChange={(v) => setSettings((s) => ({ ...s, dimDuringBreak: v }))} />
                      <Label>Dim screen during break</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Personalize reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Focus (min)" value={settings.focusMin} onChange={(v) => setSettings((s) => ({ ...s, focusMin: v }))} min={1} max={120} />
                <NumberField label="Break (sec)" value={settings.breakSec} onChange={(v) => setSettings((s) => ({ ...s, breakSec: v }))} min={5} max={180} />
                <NumberField label="Long break (min)" value={settings.longBreakMin} onChange={(v) => setSettings((s) => ({ ...s, longBreakMin: v }))} min={1} max={60} />
                <NumberField label="Cycles until long" value={settings.cyclesUntilLong} onChange={(v) => setSettings((s) => ({ ...s, cyclesUntilLong: v }))} min={1} max={12} />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <ToggleRow icon={<Bell className="w-4 h-4"/>} label="Desktop notifications" checked={settings.notifications} onChange={(v) => setSettings((s) => ({ ...s, notifications: v }))} />
                <ToggleRow icon={settings.sound ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>} label="Sound pings" checked={settings.sound} onChange={(v) => setSettings((s) => ({ ...s, sound: v }))} />
                <ToggleRow icon={<Accessibility className="w-4 h-4"/>} label="Voice guidance" checked={settings.voice} onChange={(v) => setSettings((s) => ({ ...s, voice: v }))} />
                <ToggleRow icon={<Sun className="w-4 h-4"/>} label="Dim screen during breaks" checked={settings.dimDuringBreak} onChange={(v) => setSettings((s) => ({ ...s, dimDuringBreak: v }))} />
                <ToggleRow icon={<Coffee className="w-4 h-4"/>} label="Auto‑start next focus" checked={settings.autoStartNext} onChange={(v) => setSettings((s) => ({ ...s, autoStartNext: v }))} />
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-3 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5"/>Your last 7 days</CardTitle>
              <CardDescription>Completed breaks per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} width={28} />
                    <RTooltip />
                    <Bar dataKey="breaks" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 mt-2">Aim for at least 12 short breaks/day on heavy screen days.</p>
            </CardContent>
          </Card>
        </main>

        {overlay && (state === "break" || state === "longbreak") && (
          <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6 select-none" onClick={() => setOverlay(false)}>
            <div className="max-w-lg w-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl text-center">
              <h2 className="text-2xl font-semibold mb-2">Break time</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-4">Look far away (~20 ft). Gently blink. Relax your jaw and shoulders.</p>
              <div className="text-5xl font-bold tabular-nums">{secondsToMmSs(remaining)}</div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Button onClick={skip} variant="secondary">Skip</Button>
                <Button onClick={() => setOverlay(false)} variant="ghost">Hide overlay</Button>
              </div>
              <p className="text-xs text-slate-500 mt-3">Click anywhere to hide. It will reappear on the next break if enabled.</p>
            </div>
          </div>
        )}

        <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-500">
          Built for healthy screen habits • 20‑20‑20: every 20 minutes, look 20 feet away for 20 seconds.
        </footer>
      </div>
    </TooltipProvider>
  )
}

// helpers
function NumberField({ label, value, onChange, min = 0, max = 999, step = 1, help }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(clampInt(e.target.value, min, max))} />
      </div>
      {help && <p className="text-[10px] text-slate-500">{help}</p>}
    </div>
  );
}
function ToggleRow({ icon, label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-2 pr-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center">{icon}</div>
        <span className="text-sm">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function clampInt(val, min, max) { let n = parseInt(val, 10); if (isNaN(n)) n = min; return Math.min(max, Math.max(min, n)); }

// self-tests
function runSelfTests() {
  const tests = []; const assert = (name, cond) => tests.push({ name, ok: !!cond });
  assert("secondsToMmSs formats <10s", secondsToMmSs(5) === "00:05");
  assert("secondsToMmSs formats minutes", secondsToMmSs(1200) === "20:00");
  assert("clampInt clamps low", clampInt("-5", 0, 10) === 0);
  assert("clampInt clamps high", clampInt("99", 0, 10) === 10);
  assert("clampInt parses", clampInt("7", 0, 10) === 7);
  const f3 = computePreBreakTone("focus", true, 3); const f2 = computePreBreakTone("focus", true, 2); const f1 = computePreBreakTone("focus", true, 1);
  assert("tone at t=3 is 1200", f3 === 1200); assert("tone at t=2 is 1200", f2 === 1200); assert("tone at t=1 is 1200", f1 === 1200);
  assert("tone at t=4 is null", computePreBreakTone("focus", true, 4) === null);
  assert("tone at t=0 is null", computePreBreakTone("focus", true, 0) === null);
  const passed = tests.filter(t => t.ok).length; const failed = tests.length - passed;
  console.groupCollapsed(`SelfTests: ${passed}/${tests.length} passed, ${failed} failed`);
  tests.forEach(t => console[t.ok ? 'log' : 'error'](`${t.ok ? '✓' : '✗'} ${t.name}`)); console.groupEnd();
}
