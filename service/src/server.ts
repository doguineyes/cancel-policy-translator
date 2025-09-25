import express from "express";
import { runRules } from "./engine";

const app = express(); app.use(express.json());

app.post("/i18n/policy/translate", async (req, res) => {
    const raw: string = String(req.body.text ?? "");
    const { text: normalized, policy, spans, coverage, criticalCount, acceptRules, hits } = runRules(raw);

    // if we have an LLM fallback, trigger here when confidence is low
    // const final = confidence_rules >= 0.8 ? policy : await runLLMFallback(normalized, policy);

    if (acceptRules) {
        res.json({ original: raw, normalized: normalized, structured: policy, meta: { mode: "rules", coverage } });
    } else {
        res.json({ original: raw, normalized: normalized, structured: policy, meta: { mode: "rules+llm", coverage } });
    }
});

app.listen(3000, () => console.log("Policy service on :3000"));
