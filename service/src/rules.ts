import * as fs from "fs";
import yaml from "js-yaml";
import type { Rule } from "./types";

export function loadRules(path = "service/rules/patterns.yml"): Rule[] {
    const doc = yaml.load(fs.readFileSync(path, "utf8")) as any;
    return (doc.rules as Rule[]).sort((a,b)=>b.priority-a.priority);
}
