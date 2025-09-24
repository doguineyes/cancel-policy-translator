export type Span = [number, number];

export interface Rule {
    id: string;
    priority: number;
    regex: RegExp;
    map: Record<string, string>;
}

export interface Policy {
    fee?: {
        type?: string;
        amount?: string;
        currency?: string;
        nights?: number;
        percent?: number;
        scope?: string;
    };
    deadline?: {
        type?: "absolute" | "relative";
        iso?: string;
        local_hour?: string;
        date_ddmmmyy?: string;
        date_ddmon?: string;
        relative_days?: number;
        relative_hours?: number;
        relation?: "to_arrival" | "to_booking";
    };
    window?: {
        cutoff_days?: number;
        cutoff_hours?: number;
    };
    notes?: string[];
    meta?: { source?: string; confidence?: number };
}

export interface MatchHit {
    id: string;
    start: number;
    end: number;
    groups: Record<string, string | undefined>;
}