import express from "express";
import { runRules } from "./engine";

const app = express(); app.use(express.json());

app.post("/i18n/policy/translate", async (req, res) => {
    const raw: string = String(req.body.text ?? "");
    const { text: normalized, policy, spans, confidence_rules } = runRules(raw);

    // if we have an LLM fallback, trigger here when confidence is low
    // const final = confidence_rules >= 0.8 ? policy : await runLLMFallback(normalized, policy);

    res.json({
        original: raw,
        normalized,
        structured: policy,
        meta: { rulesVersion: "v2", matches: spans.length, confidence_rules }
    });
});

app.listen(3000, () => console.log("Policy service on :3000"));
