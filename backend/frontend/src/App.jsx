import { useMemo, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

const API = import.meta.env.VITE_API_BASE;

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"];

function cn(...arr) {
  return arr.filter(Boolean).join(" ");
}

function Badge({ value }) {
  const map = {
    Urgent: "bg-red-500/15 text-red-200 border-red-500/30",
    Important: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    FYI: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border",
        map[value] || map.FYI
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
      {value || "FYI"}
    </span>
  );
}

function Card({ children, className }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-[0_10px_35px_rgba(0,0,0,0.25)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("single"); // "single" | "batch"

  const [emailText, setEmailText] = useState("");
  const [singleResult, setSingleResult] = useState(null);

  const [files, setFiles] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [totals, setTotals] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function summarizeSingle() {
    setError("");
    setLoading(true);
    setSingleResult(null);

    try {
      const res = await axios.post(`${API}/api/summarize-text`, { emailText });
      setSingleResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  async function summarizeBatch() {
    setError("");
    setLoading(true);
    setBatchResults([]);
    setTotals(null);

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    try {
      const res = await axios.post(`${API}/api/summarize-batch`, form);
      setBatchResults(res.data.results);
      setTotals(res.data.totals);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  const barData = useMemo(() => {
    return batchResults.map((r) => ({
      name: r.filename,
      before: r.beforeWords,
      after: r.afterWords,
      actions: r.action_items?.length || 0
    }));
  }, [batchResults]);

  const pieData = useMemo(() => {
    if (!totals) return [];
    return Object.entries(totals.categories || {}).map(([k, v]) => ({
      name: k,
      value: v
    }));
  }, [totals]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              🔐 Privacy-First • 🧠 Local LLM (Ollama) • ⚡ Real-time summaries
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
              Smart Email Summarizer
              <span className="text-white/60"> (Local AI)</span>
            </h1>
            <p className="mt-2 max-w-2xl text-white/65">
              Summarize emails, classify urgency, extract action items, and visualize insights — all processed securely on your device.

            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
            <button
              onClick={() => setTab("single")}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                tab === "single"
                  ? "bg-white text-black"
                  : "text-white/70 hover:bg-white/10"
              )}
            >
              📩 Single Email
            </button>
            <button
              onClick={() => setTab("batch")}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition",
                tab === "batch"
                  ? "bg-white text-black"
                  : "text-white/70 hover:bg-white/10"
              )}
            >
              📂 Batch Upload
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            ❌ {error}
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <div className="text-sm font-semibold">Working on it…</div>
              </div>
              <div className="mt-2 text-xs text-white/60">
                Generating summary + urgency + action items.
              </div>
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="mt-8 grid gap-6">
          {/* SINGLE TAB */}
          {tab === "single" && (
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Paste an Email</h2>
                  <span className="text-xs text-white/50">Tip: include the full email thread</span>
                </div>

                <textarea
                  rows={10}
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  placeholder="Paste a long email here..."
                  className="mt-4 w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30"
                />

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={summarizeSingle}
                    disabled={loading || !emailText.trim()}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold transition",
                      !emailText.trim() || loading
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : "bg-white text-black hover:bg-white/90"
                    )}
                  >
                    Summarize
                  </button>

                  <button
                    onClick={() => {
                      setEmailText("");
                      setSingleResult(null);
                      setError("");
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/10"
                  >
                    Clear
                  </button>
                </div>
              </Card>

              <Card className="lg:col-span-2">
                <h3 className="text-lg font-bold">Result</h3>
                <p className="mt-1 text-sm text-white/60">
                  Your output will appear here after summarization.
                </p>

                {!singleResult ? (
                  <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
                    No result yet. Paste an email and click <b>Summarize</b>.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge value={singleResult.category} />
                      <div className="text-xs text-white/60">
                        Words:{" "}
                        <b className="text-white">
                          {singleResult.beforeWords} → {singleResult.afterWords}
                        </b>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-sm font-bold">Summary</div>
                      <p className="mt-2 text-sm leading-relaxed text-white/75">
                        {singleResult.summary}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-sm font-bold">Action Items</div>
                      {singleResult.action_items?.length ? (
                        <ul className="mt-2 space-y-2 text-sm text-white/80">
                          {singleResult.action_items.map((a, i) => (
                            <li key={i} className="flex gap-2">
                              <span>✅</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-2 text-sm text-white/60">
                          No action items detected.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* BATCH TAB */}
          {tab === "batch" && (
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-2">
                <h2 className="text-lg font-bold">Batch Upload (.txt)</h2>
                <p className="mt-1 text-sm text-white/60">
                  Upload multiple email text files and get summaries + charts.
                </p>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <input
                    type="file"
                    multiple
                    accept=".txt"
                    onChange={(e) => setFiles([...e.target.files])}
                    className="block w-full text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:bg-white/90"
                  />

                  <div className="mt-3 text-xs text-white/60">
                    Selected: <b className="text-white">{files.length}</b> file(s)
                  </div>

                  <button
                    onClick={summarizeBatch}
                    disabled={loading || !files.length}
                    className={cn(
                      "mt-4 w-full rounded-xl px-4 py-2 text-sm font-semibold transition",
                      !files.length || loading
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : "bg-white text-black hover:bg-white/90"
                    )}
                  >
                    Process Batch
                  </button>
                </div>

                {totals && (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <Stat label="Urgent" value={totals.categories?.Urgent || 0} />
                    <Stat label="Important" value={totals.categories?.Important || 0} />
                    <Stat label="FYI" value={totals.categories?.FYI || 0} />
                  </div>
                )}
              </Card>

              <Card className="lg:col-span-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Dashboard</h3>
                  <span className="text-xs text-white/55">
                    Before vs After + Category split
                  </span>
                </div>

                {!totals ? (
                  <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
                    Upload .txt files and click <b>Process Batch</b> to view charts.
                  </div>
                ) : (
                  <div className="mt-6 space-y-8">
                    {/* Bar chart */}
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 text-sm font-semibold text-white/80">
                        Word Reduction per Email
                      </div>
                      <div style={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{
                                background: "rgba(0,0,0,0.8)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 12
                              }}
                            />
                            <Legend />
                            <Bar dataKey="before" />
                            <Bar dataKey="after" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Pie chart */}
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 text-sm font-semibold text-white/80">
                        Urgency Distribution
                      </div>

                      <div style={{ width: "100%", height: 260 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              outerRadius={90}
                              label
                            >
                              {pieData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "rgba(0,0,0,0.8)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 12
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Results list */}
              {batchResults.length > 0 && (
                <Card className="lg:col-span-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Batch Results</h3>
                    <span className="text-xs text-white/55">
                      {batchResults.length} email(s)
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {batchResults.map((r, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate text-sm font-semibold text-white/85">
                            {r.filename}
                          </div>
                          <Badge value={r.category} />
                        </div>

                        <div className="mt-2 text-xs text-white/60">
                          Words: <b className="text-white">{r.beforeWords} → {r.afterWords}</b>{" "}
                          • Actions: <b className="text-white">{r.action_items?.length || 0}</b>
                        </div>

                        <div className="mt-3 text-sm text-white/75">
                          {r.summary}
                        </div>

                        {r.action_items?.length ? (
                          <ul className="mt-3 space-y-1 text-sm text-white/75">
                            {r.action_items.slice(0, 4).map((a, i) => (
                              <li key={i} className="flex gap-2">
                                <span>✅</span>
                                <span className="line-clamp-2">{a}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="mt-3 text-sm text-white/55">
                            No action items.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

         


          {/* Footer */}
          <div className="pt-2 text-center text-xs text-white/45">
            Built with React + Node.js + Ollama (Local LLM) • Privacy-first • No cloud required
          </div>
        </div>
      </div>
    </div>
  );
}
