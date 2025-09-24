import type { Span } from "./types";

const FIELD_WEIGHTS = new Map<string, number>([
    ["deadline.iso", 0.45],
    ["window.cutoff_days", 0.25],
    ["fee.amount", 0.15],
    ["fee.nights", 0.15],
    ["deadline.local_hour", 0.05],
    ["deadline.date_ddmmmyy", 0.05],
    ["fee.currency", 0.05],
    ["fee.percent", 0.10],
]);

const CRITICAL_FIELDS = new Set<string>([
    "deadline.iso",
    "window.cutoff_days",
    "fee.amount",
    "fee.nights",
    "fee.percent",
]);

export function computeConfidenceRules(structured: any, spans: Span[], text: string) {
    // 1) Field score
    let gotCritical = 0;
    let weighted = 0;
    let totalW = 0;

    for (const [field, w] of FIELD_WEIGHTS.entries()) {
        totalW += w;
        const v = deepGet(structured, field);
        let s = 0;
        if (v !== undefined && v !== null && v !== "") {
            if (field === "deadline.iso") s = 1.0;
            else if (field === "window.cutoff_days") s = 1.0;
            else if (field === "fee.nights") s = 1.0;
            else if (field === "fee.percent") s = 1.0;
            else if (field === "fee.amount") s = 0.8;
            else s = 0.5;

            if (CRITICAL_FIELDS.has(field)) gotCritical++;
        }
        weighted += s * w;
    }
    const fieldScore = totalW > 0 ? weighted / totalW : 0;

    // 2) Coverage score
    const merged = mergeSpans(spans);
    const covered = merged.reduce((acc, [a, b]) => acc + Math.max(0, b - a), 0);
    const coverage = text.length ? covered / text.length : 0;
    const coverageScore = coverage >= 0.4 ? 1.0 : coverage >= 0.2 ? 0.6 : coverage > 0 ? 0.3 : 0.0;

    // 3) Penalties
    let penalties = 0;
    const feeAmt = deepGet(structured, "fee.amount");
    if (typeof feeAmt === "string" && !/^[+-]?\d+(?:\.\d+)?$/.test(feeAmt.replace(/,/g, ""))) {
        penalties += 0.1;
    }

    // 4) Blend
    const ALPHA = 0.75;
    let confidence = clamp01(ALPHA * fieldScore + (1 - ALPHA) * coverageScore - penalties);

    // 5) Rule-of-two cap
    if (gotCritical < 2) confidence = Math.min(confidence, 0.6);

    return { confidence_rules: confidence, fieldScore, coverage, gotCritical };
}

function deepGet(obj: any, path: string) {
    return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function clamp01(x: number) {
    return Math.max(0, Math.min(1, x));
}

export function mergeSpans(spans: Span[]): Span[] {
    if (!spans.length) return [];
    const sorted = spans.slice().sort((a, b) => a[0] - b[0]);
    const out: Span[] = [];

    const first = sorted[0] as Span;   // safe after empty-check
    let [s, e] = first;

    for (let i = 1; i < sorted.length; i++) {
        const [cs, ce] = sorted[i] as Span;
        if (cs <= e) e = Math.max(e, ce);
        else {
            out.push([s, e]);
            [s, e] = [cs, ce];
        }
    }
    out.push([s, e]);
    return out;
}
