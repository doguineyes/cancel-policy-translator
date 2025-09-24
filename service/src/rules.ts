import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { Rule } from "./types";

interface RawRule {
    id: string;
    priority?: number;
    regex: string;                  // from YAML
    map: Record<string, string>;
}

export function loadRules(): Rule[] {
    const ymlPath = path.join(__dirname, "..", "rules", "patterns.yml");
    const doc = yaml.load(fs.readFileSync(ymlPath, "utf-8")) as RawRule[] | undefined;
    if (!doc || !Array.isArray(doc)) return [];

    return doc.map((r): Rule => {
        // compile: default to case-insensitive; do NOT force 'g' here (engine will add it)
        const compiled = new RegExp(r.regex, "i");
        return {
            id: r.id,
            priority: r.priority ?? 100,
            regex: compiled,
            map: r.map ?? {},
        };
    });
}
