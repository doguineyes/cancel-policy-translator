const fs = require("fs");
const examples = require("../data/Out_70.json");

(async () => {
    const results = [];

    for (const example of examples) {
        console.log(example?.cancellationText);

        const res = await fetch("http://localhost:3000/i18n/policy/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: example?.cancellationText }),
        });

        const data = await res.json();
        results.push({
            input: example?.cancellationText,
            output: data,
        });
    }

    // Write to file
    fs.writeFileSync(
        "../data/translated_policies.json",
        JSON.stringify(results, null, 2), // pretty-print with 2 spaces
        "utf-8"
    );

    console.log("✅ All results saved to translated_policies.json");
})();
