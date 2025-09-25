# Hotel Cancellation Policy Translator

## Overview

Hotel cancellation policies ("CXL policies") are usually written in terse, jargon-heavy command strings such as:

```
CXL: CXL 1500 HTL TIME ON 11JAN25-CXL FEE FULL STAY-EXCL TAX-FEES 24HRS PRIOR TO ARR -100 PCT STAY
CXL: 3800.00 HKD CXL FEE PER ROOM CANCELLATION PERMITTED UP TO 2DAYS BEFORE ARRIVAL
CXL: -BEFORE 1200 DAY OF ARRIVAL 1058.00 CNY CXL FEE PER ROOM, CANCELLATION PERMITTED -BEFORE 1200 DAY OF ARRIVAL
```

These sentences are short, formulaic, and information-dense. For normal customers (and even travel agents), they are difficult to read and interpret.

The purpose of this program is to **normalize these cancellation policies into a structured JSON format**. Once structured, the information can be rendered into clear, human-readable sentences in any language (English, Chinese, etc.).

---

## Motives and Problem

- **Ambiguity**: Hotel managers often use abbreviations ("CXL", "HTL", "NT", "PCT").
- **Inconsistency**: Same rule may be written as `24HRS PRIOR` or `1 DAY PRIOR` or `BY 6PM LOCAL HOTEL TIME`.
- **Critical business meaning**: Guests need to know *is the booking cancellable? until when? and what is the penalty?*
- **Difficult to maintain by regex alone**: new formats constantly appear.
- **LLMs are good at understanding free text but slower and cost more**.

This leads to our hybrid solution.

---

## Hybrid Architecture

The system uses a **hybrid pipeline of deterministic regex rules plus an LLM fallback**.

### 1. Rule-based extraction
- **Patterns (YAML)**: curated regexes that capture common cancellation phrases:
    - Relative cutoffs: "2 DAYS PRIOR TO ARRIVAL", "24HRS PRIOR"
    - Absolute deadlines: "CXL 1800 HTL TIME ON 16NOV24", "CANCEL BY 2024-11-11T18:00:00"
    - Fees: "3800.00 HKD CXL FEE PER ROOM", "FEE 1 NIGHT", "100 PCT STAY", "FULL STAY"
    - Flags: "NON-REFUNDABLE", "CANCELLATION PERMITTED"
- **Deterministic coverage check**: the engine computes how much of the input sentence is covered by matched spans. If coverage > 90–95%, the rules are trusted.

### 2. LLM fallback
- If coverage is low (rules missed parts), the text is sent to an LLM extractor (e.g., GPT).
- LLM interprets rare/unseen formats and maps them into the same structured schema.
- The results are cached, so repeated sentences don’t need repeated AI calls.

### 3. Structured schema
Policies are normalized into a consistent schema, for example:

```json
{
  "policy": { "cancellable": true },
  "deadline": {
    "type": "relative",
    "relation": "to_arrival",
    "relative_days": 2
  },
  "fee": {
    "type": "fixed_amount",
    "amount": "3800.00",
    "currency": "HKD",
    "per_room": true
  }
}
```

This schema can then be rendered into human-readable sentences like:

- **English**: “Free cancellation until 2 days before arrival. After that, a penalty of HKD 3800 per room applies.”
- **Chinese**: “入住前 2 天可免费取消；之后取消将收取每间客房 3800 港币。”

---

## Why Hybrid?

- **Regex is fast, deterministic, and cheap**. Perfect for well-known phrases.
- **LLM is robust to novel patterns** but slower and costly.
- **Coverage gate** combines them: we use regex if we can cover ~95% of the string; otherwise fall back to LLM.
- This balances performance, accuracy, and maintainability.

---

## Project Layout

```
service/
  ├── src/
  │   ├── engine.ts        # core rule runner (regex + coverage)
  │   ├── rules.ts         # loads YAML patterns
  │   ├── normalize.ts     # normalizes text before matching
  │   ├── server.ts        # exposes API endpoints
  │   ├── types.ts         # TypeScript interfaces
  │   ├── renderer.ts      # TypeScript renderer translate our data structure to natural language template
  │   └── confidence.ts    # coverage decision logic
  ├── rules/patterns.yml   # curated regex patterns
  ├── config/decision.config.json # thresholds for coverage
```

---

## Usage

### Run in development (hot reload)
```bash
docker compose -f compose.yaml up --build
```

### Run in production (compiled TS → JS)
```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`.

### Example request
```http
POST /i18n/policy/translate
Content-Type: application/json

{
  "text": "CXL: CXL 1500 HTL TIME ON 11JAN25-CXL FEE FULL STAY-EXCL\nTAX-FEES 24HRS PRIOR TO ARR -100 PCT STAY"
}
```

### Example response
```json
{
  "original": "...",
  "normalized": "...",
  "structured": {
    "fee": {
      "tax_scope": "excluded",
      "type": "percentage",
      "percent": 100
    },
    "policy": {
      "cancellable": "true"
    },
    "window": {
      "type": "relative_to_arrival",
      "cutoff_days": 1
    },
    "deadline": {
      "type": "relative",
      "relation": "to_arrival",
      "relative_hours": 24,
      "local_time": 1500,
      "date_ddmmmyy": "11JAN25",
      "absolute_hotel_time": 1
    }
  },
  "translate": {
    "en": "Free cancellation until 1500 on 11JAN25 (hotel local time). After the deadline, cancellation incurs a penalty of 100% of the stay (excluding taxes/fees).",
    "cn": "可免费取消，至 11JAN25 1500（酒店当地时间）。 在截止时间之后取消，将收取 房费的 100%（不含税费）。"
  },
  "meta": {
    "mode": "rules",
    "coverage": 1.0232558139534884
  }
}
```

---

## Future Directions

- **Expand pattern.yml** with more curated examples from dataset clusters.
- **LLM integration**: plug in OpenAI or other provider.
- **Visualization**: highlight regex span coverage in HTML for debugging.
- **Language generation**: templates to produce bilingual cancellation sentences automatically.

---

## License

This project is experimental. Use at your own risk for production systems.
