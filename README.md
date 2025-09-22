# Cancel Policy Translator (Experimental)

An experimental microservice for translating **hotel cancellation policies** into structured, human-readable data.  
Hotel managers often write cancellation rules in shorthand or industry jargon (e.g., `CXL`, `NITE`, `HTL TIME`), which are hard to parse for normal users. This project explores a **hybrid approach** combining **rule-based regex extraction** with **LLM-based interpretation**.

---

## ✨ Motivation

Cancellation policies directly affect guests’ booking decisions. But policies are often written like:

```text
CXL: CXL 1500 HTL TIME ON 11JAN25-CXL FEE FULL STAY-EXCL TAX-FEES 24HRS PRIOR TO ARR -100 PCT STAY
CXL: 3800.00 HKD CXL FEE PER ROOM CANCELLATION PERMITTED UP TO 2DAYS BEFORE ARRIVAL
CXL: CXL 1800 HTL TIME ON 16NOV24-FEE 1 NIGHT-INCL TAX-FEES MUST BE CANCELLED BY 6PM LOCAL HOTEL TIME 1 DAY PRIOR TO ARRIVAL TO AVOID PENALTY OF 1 NIGHT ROOM AND SERVICE CHARGE.
CXL: PENALTY AMOUNT 17917.24 CANCEL BY 2024-11-11T18:00:00 CXL AFTER 1800 11NOV FORFEIT FIRST NITE STAY
```