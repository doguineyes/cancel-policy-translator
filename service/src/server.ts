import express from "express";
import { normalize } from "./normalize";
import { loadRules } from "./rules";
import { runRules } from "./engine";

const app = express(); app.use(express.json());
const rules = loadRules();

app.post("/i18n/policy/translate", (req, res) => {
    const raw: string = String(req.body.text ?? "");
    const norm = normalize(raw);
    const { policy, spans } = runRules(norm, rules);
    res.json({
        original: raw,
        normalized: norm,
        structured: policy,
        meta: { rulesVersion: "v1", matches: spans.length }
    });
});

app.listen(3000, () => console.log("Policy service on :3000"));
