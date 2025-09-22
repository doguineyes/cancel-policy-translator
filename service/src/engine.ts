import type { Policy, Rule } from "./types";

export function runRules(text: string, rules: Rule[]): { policy: Policy; spans: [number, number][] } {
    const policy: Policy = {};
    const spans: [number, number][] = [];
    for (const r of rules) {
        const re = new RegExp(r.regex, "gi");
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
            const groups: Record<string, string | undefined> = (m.groups ?? {}) as any;
            if (!r.map || typeof r.map !== "object") {  // <--- guard
                continue;
            }
            console.log(`[match] ${r.id}`, groups); // (keep while debugging)
            materialize(policy as Record<string, any>, r.map, groups);
            spans.push([m.index, m.index + m[0].length]);
        }
    }
    return { policy, spans };
}

/** Safe nested setter; only writes if value is not undefined/empty-string */
function setNested(obj: Record<string, any>, path: string, value: any) {
    if (value === undefined || value === "") return;  // <- guard against empty writes
    const segs = path.split(".");
    let cur: Record<string, any> = obj;
    for (let i = 0; i < segs.length - 1; i++) {
        const k = segs[i] as string;
        const v = cur[k];
        if (typeof v !== "object" || v === null) cur[k] = {};
        cur = cur[k] as Record<string, any>;
    }
    const last = segs[segs.length - 1] as string;
    cur[last] = value;
}

function resolveExpr(
    rawVal: unknown,
    groups: Record<string, string | undefined>
): string | number | undefined {
    if (rawVal == null) return undefined;
    if (typeof rawVal !== "string") return rawVal as any;

    const expr = rawVal.trim();

    // Short-circuit OR logic: first branch that resolves wins
    const terms = expr.split(/\s+or\s+/i).map(t => t.trim());
    for (const term of terms) {
        const evaluated = evalTerm(term, groups);
        if (evaluated !== undefined && evaluated !== "") {
            return evaluated;
        }
    }
    return undefined;
}

function evalTerm(
    term: string,
    groups: Record<string, string | undefined>
): string | number | undefined {
    // 1) Substitute $variables. If any referenced var is missing -> skip term.
    let missing = false;
    const substituted = term.replace(/\$([a-zA-Z_]\w*)/g, (_, name: string) => {
        const v = groups[name];
        if (v == null || v === "") {
            missing = true;
            return ""; // we mark as missing; final check below will skip this term
        }
        return v;
    });
    if (missing) return undefined;

    const s = substituted.trim();

    // 2) Handle ceil(...)
    const ceilMatch = /^ceil\(\s*([^)]+)\s*\)$/i.exec(s);
    if (ceilMatch && ceilMatch[1]) {
        const inner = ceilMatch[1].trim();

        // Support "a/b" or just "a"
        const div = inner.split("/");
        let num: number | undefined;

        if (div.length === 2) {
            const a = toNumber(div[0] as string);
            const b = toNumber(div[1] as string);
            if (a == null || b == null || b === 0) return undefined;
            num = Math.ceil(a / b);
        } else {
            const a = toNumber(inner);
            if (a == null) return undefined;
            num = Math.ceil(a);
        }
        return num;
    }

    // 3) If it's purely numeric, return as number; otherwise return as string literal
    const n = toNumber(s);
    return n != null ? n : (s.length ? s : undefined);
}

function toNumber(x: string): number | null {
    const t = x.trim();
    if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

/** Map regex capture groups into the policy using the rule's "map" spec */
function materialize(policyObj: Record<string, any>, mapSpec: any, groups: Record<string, string | undefined>) {
    const walk = (node: any, base = "") => {
        if (!node || typeof node !== "object") return; // <--- avoid Object.keys(undefined)
        for (const key of Object.keys(node)) {
            const rawVal = node[key];
            const path = base ? `${base}.${key}` : key;

            if (rawVal && typeof rawVal === "object" && !Array.isArray(rawVal)) {
                walk(rawVal, path);
                continue;
            }

            const resolved = resolveExpr(rawVal, groups);
            if (resolved !== undefined && resolved !== "") {
                setNested(policyObj, path, resolved);
            }
        }
    };
    walk(mapSpec);
}