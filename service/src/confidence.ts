// confidence.ts
import fs from "fs";
import path from "path";
import type { Span } from "./types";

type ConfidenceConfig = {
    alpha: number;
    fieldWeights: Record<string, number>;
    criticalFields: string[];
    coverageToScore: { min: number; score: number }[];
    minCriticalSignalsForHighConfidence: number;
    lowCriticalCap: number;
    penalties: { badFeeAmount: number };
    acceptRulesThreshold: number;
};

function loadConfidenceConfig(): ConfidenceConfig {
    const candidates = [
        path.join(__dirname, "..", "config", "confidence.config.json"), // dist runtime
        path.join(process.cwd(), "service", "config", "confidence.config.json"),
        path.join(process.cwd(), "config", "confidence.config.json")
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return JSON.parse(fs.readFileSync(p, "utf-8"));
        }
    }
    // fallback defaults (similar to your current)
    return {
        alpha: 0.75,
        fieldWeights: {
            "deadline.iso": 0.45,
            "window.cutoff_days": 0.25,
            "fee.amount": 0.15,
            "fee.nights": 0.15,
            "deadline.local_hour": 0.05,
            "deadline.date_ddmmmyy": 0.05,
            "fee.currency": 0.05,
            "fee.percent": 0.10
        },
        criticalFields: ["deadline.iso","window.cutoff_days","fee.amount","fee.nights","fee.percent"],
        coverageToScore: [
            { min: 0.40, score: 1.0 },
            { min: 0.20, score: 0.6 },
            { min: 0.00, score: 0.3 }
        ],
        minCriticalSignalsForHighConfidence: 2,
        lowCriticalCap: 0.6,
        penalties: { badFeeAmount: 0.1 },
        acceptRulesThreshold: 0.8
    };
}

const CFG = loadConfidenceConfig();

export function computeConfidenceRules(structured: any, spans: Span[], text: string) {
    // 1) Field score
    let gotCritical = 0;
    let weighted = 0;
    let totalW = 0;

    for (const [field, w] of Object.entries(CFG.fieldWeights)) {
        totalW += w;
        const v = deepGet(structured, field);
        let s = 0;
        if (v !== undefined && v !== null && v !== "") {
            // strong vs normal weighting — simple rule: if it's a critical field, give 1.0 strength
            if (CFG.criticalFields.includes(field)) s = 1.0;
            else s = 0.6;
            if (CFG.criticalFields.includes(field)) gotCritical++;
        }
        weighted += s * w;
    }
    const fieldScore = totalW > 0 ? (weighted / totalW) : 0;

    // 2) Coverage score
    const coverage = spanCoverage(spans, text);
    const coverageScore = coverageToScore(coverage, CFG.coverageToScore);

    // 3) Penalties
    let penalties = 0;
    const feeAmt = deepGet(structured, "fee.amount");
    if (typeof feeAmt === "string" && !/^[+-]?\d+(?:\.\d+)?$/.test(feeAmt.replace(/,/g, ""))) {
        penalties += CFG.penalties.badFeeAmount;
    }

    // 4) Blend
    let confidence = clamp01(CFG.alpha * fieldScore + (1 - CFG.alpha) * coverageScore - penalties);

    // 5) Rule-of-two
    if (gotCritical < CFG.minCriticalSignalsForHighConfidence) {
        confidence = Math.min(confidence, CFG.lowCriticalCap);
    }

    return { confidence_rules: confidence, fieldScore, coverage, gotCritical };
}

function coverageToScore(cov: number, table: {min:number;score:number}[]) {
    const sorted = [...table].sort((a,b)=> b.min - a.min);
    for (const row of sorted) if (cov >= row.min) return row.score;
    return 0;
}

function spanCoverage(spans: Span[], text: string) {
    if (!spans.length || !text.length) return 0;
    const sorted = spans.slice().sort((a,b)=> a[0]-b[0]);
    let s = sorted[0][0], e = sorted[0][1], covered = 0;
    for (let i=1;i<sorted.length;i++){
        const [cs,ce] = sorted[i];
        if (cs <= e) e = Math.max(e, ce);
        else { covered += (e - s); [s,e] = [cs,ce]; }
    }
    covered += (e - s);
    return covered / text.length;
}

function deepGet(obj:any, path:string){
    return path.split(".").reduce((o,k)=> (o==null? undefined : o[k]), obj);
}
function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }
