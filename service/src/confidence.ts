import fs from "fs";
import path from "path";
import type { Span } from "./types";

type DecisionConfig = {
    coverageThreshold: number;
    minCriticalSignals: number;
    ignoreCharsPattern?: string;              // optional
    ignoreBoilerplateTokens?: string[];       // optional
};

function loadDecisionConfig(): DecisionConfig {
    const candidates = [
        path.join(__dirname, "..", "config", "decision.config.json"),
        path.join(process.cwd(), "service", "config", "decision.config.json"),
        path.join(process.cwd(), "config", "decision.config.json")
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
    return { coverageThreshold: 0.92, minCriticalSignals: 1 };
}

const CFG = loadDecisionConfig();

export function computeCoverageDecision(
    structured: any,
    spans: Span[],
    text: string
) {
    const denomText = normalizeForCoverage(text, CFG);
    const coverage = spanCoverage(spans, denomText.length);
    const criticalCount = countCriticalSignals(structured);

    // Decision
    const acceptRules = coverage >= CFG.coverageThreshold && criticalCount >= CFG.minCriticalSignals;

    return { coverage, criticalCount, acceptRules };
}

function normalizeForCoverage(text: string, cfg: DecisionConfig): string {
    let t = text;
    // optional: remove ignorable chars from the denominator
    if (cfg.ignoreCharsPattern) {
        const re = new RegExp(cfg.ignoreCharsPattern, "g");
        t = t.replace(re, "");
    }
    // optional: remove boilerplate tokens from the denominator (case-insensitive whole words)
    if (cfg.ignoreBoilerplateTokens && cfg.ignoreBoilerplateTokens.length) {
        for (const tok of cfg.ignoreBoilerplateTokens) {
            const re = new RegExp(`\\b${escapeRegExp(tok)}\\b`, "gi");
            t = t.replace(re, "");
        }
    }
    // collapse spaces so stray spacing doesn't skew denominator
    t = t.replace(/\s+/g, " ").trim();
    return t;
}

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// spans are measured on the normalized text BEFORE this function’s changes.
// For a pure character-coverage gate, we keep it simple:
function spanCoverage(spans: Span[], denomLen: number) {
    if (!spans.length || denomLen <= 0) return 0;
    const sorted = spans.slice().sort((a,b)=> a[0]-b[0]);
    let [s, e] = sorted[0] as Span;
    let covered = 0;
    for (let i = 1; i < sorted.length; i++) {
        const [cs, ce] = sorted[i] as Span;
        if (cs <= e) e = Math.max(e, ce);
        else { covered += (e - s); [s, e] = [cs, ce]; }
    }
    covered += (e - s);
    return covered / denomLen;
}

function countCriticalSignals(obj: any) {
    let n = 0;
    if (obj?.window?.cutoff_days != null) n++;
    if (obj?.fee?.nights != null || obj?.fee?.percent != null || obj?.fee?.amount != null || obj?.fee?.type === "full_stay") n++;
    if (obj?.deadline?.iso || obj?.deadline?.date_ddmmmyy || obj?.deadline?.local_time || obj?.deadline?.relative_days != null || obj?.deadline?.relative_hours != null) n++;
    return n;
}
