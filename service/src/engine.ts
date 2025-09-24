import { loadRules } from "./rules";
import { normalize } from "./normalize";
import { computeConfidenceRules } from "./confidence";
import type { MatchHit, Policy, Rule, Span } from "./types";

type Groups = Record<string, string | undefined>;

export function runRules(raw: string, externalRules?: Rule[]) {
    const text: string = normalize(raw);
    const rules: Rule[] = (externalRules ?? loadRules())
        .slice()
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));

    const hits: MatchHit[] = [];
    const policy: Policy = {};
    const spans: Span[] = [];

    for (const rule of rules) {
        // Always use a /g clone to iterate all matches, regardless of author flags
        const base = rule.regex;
        const pat = base.source;
        const flags = base.flags.includes("g") ? base.flags : base.flags + "g";
        const r = new RegExp(pat, flags);

        let m: RegExpExecArray | null;
        while ((m = r.exec(text)) !== null) {
            const start = m.index;
            const end = start + m[0].length;
            spans.push([start, end]);

            const named: Groups = ((m as any).groups ?? {}) as Groups;
            hits.push({ id: rule.id, start, end, groups: named });

            applyMap(policy, rule.map, named);
        }
    }

    const { confidence_rules } = computeConfidenceRules(policy, spans, text);
    return { text, policy, spans, confidence_rules, hits };
}

// ---------- Mapping & Merge ----------

function applyMap(policy: Policy, map: Record<string, string>, groups: Groups) {
    for (const [path, rawVal] of Object.entries(map)) {
        const resolved = resolveExpr(rawVal, groups);
        if (resolved === undefined || resolved === "") continue;

        const existing = deepGet(policy, path);
        if (existing !== undefined && existing !== null && existing !== "") continue;

        setNested(policy, path, resolved);
    }
}

function setNested(obj: any, path: string, value: any) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
        cur = cur[p];
    }
    const last = parts[parts.length - 1];

    if (typeof value === "string" && /(?:nights|percent|relative_days|relative_hours|cutoff_days|cutoff_hours)$/.test(last)) {
        const n = toNumber(value);
        cur[last] = Number.isFinite(n as number) ? n : value;
    } else {
        cur[last] = value;
    }
}

function deepGet(obj: any, path: string) {
    return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// ---------- Expression Evaluation ----------

function resolveExpr(rawVal: unknown, groups: Groups): string | number | undefined {
    if (rawVal == null) return undefined;
    if (typeof rawVal !== "string") return rawVal as any;

    const expr = rawVal.trim();
    const terms = expr.split(/\s+or\s+/i).map(t => t.trim());
    for (const term of terms) {
        const evaluated = evalTerm(term, groups);
        if (evaluated !== undefined && evaluated !== "") return evaluated;
    }
    return undefined;
}

function evalTerm(term: string, groups: Groups): string | number | undefined {
    let missing = false;
    const substituted = term.replace(/\$([a-zA-Z_]\w*)/g, (_, name: string) => {
        const v = groups[name];
        if (v == null || v === "") {
            missing = true;
            return "";
        }
        return String(v);
    });
    if (missing) return undefined;

    const s = substituted.trim();
    if (!s) return undefined;

    const ceilMatch = /^ceil\(\s*([^)]+)\s*\)$/i.exec(s);
    if (ceilMatch) {
        const inner = ceilMatch[1].trim();
        const parts = inner.split("/");
        if (parts.length === 2) {
            const a = toNumber(parts[0]);
            const b = toNumber(parts[1]);
            if (a == null || b == null || b === 0) return undefined;
            return Math.ceil(a / b);
        } else {
            const a = toNumber(inner);
            if (a == null) return undefined;
            return Math.ceil(a);
        }
    }

    const n = toNumber(s);
    if (n != null) return n;

    return s;
}

function toNumber(x: string): number | null {
    const t = String(x).trim().replace(/,/g, "");
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(t)) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}
