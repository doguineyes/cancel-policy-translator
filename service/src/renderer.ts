export function renderPolicy(policy: any): { en: string; cn: string } {
    const partsEn: string[] = [];
    const partsCn: string[] = [];

    // 1. cancellable?
    if (policy.policy?.cancellable === "false") {
        return {
            en: "This booking is non-refundable and cannot be cancelled.",
            cn: "此预订不可取消或退款。"
        };
    }

    // 2. free cancellation deadline
    let cutoffTextEn = "";
    let cutoffTextCn = "";

    if (policy.deadline?.iso) {
        cutoffTextEn = `until ${policy.deadline.iso}`;
        cutoffTextCn = `至 ${policy.deadline.iso}`;
    } else if (policy.deadline?.absolute_hotel_time) {
        cutoffTextEn = `until ${policy.deadline.local_time} on ${policy.deadline.date_ddmmmyy} (hotel local time)`;
        cutoffTextCn = `至 ${policy.deadline.date_ddmmmyy} ${policy.deadline.local_time}（酒店当地时间）`;
    } else if (policy.window?.cutoff_days) {
        cutoffTextEn = `until ${policy.window.cutoff_days} day(s) before arrival`;
        cutoffTextCn = `入住前 ${policy.window.cutoff_days} 天之前`;
    }

    if (cutoffTextEn) {
        partsEn.push(`Free cancellation ${cutoffTextEn}.`);
        partsCn.push(`可免费取消，${cutoffTextCn}。`);
    }

    // 3. penalties
    if (policy.fee) {
        let feeEn = "";
        let feeCn = "";
        if (policy.fee.type === "fixed_amount") {
            feeEn = `${policy.fee.amount} ${policy.fee.currency}`;
            feeCn = `${policy.fee.currency} ${policy.fee.amount}`;
            if (policy.fee.per_room === "true") {
                feeEn += " per room";
                feeCn += " 每间客房";
            }
        } else if (policy.fee.type === "nights_penalty") {
            feeEn = `${policy.fee.nights} night penalty`;
            feeCn = `扣除 ${policy.fee.nights} 晚房费`;
        } else if (policy.fee.type === "percentage") {
            feeEn = `${policy.fee.percent}% of the stay`;
            feeCn = `房费的 ${policy.fee.percent}%`;
        } else if (policy.fee.type === "full_stay") {
            feeEn = "the full stay";
            feeCn = "全额房费";
        }
        if (policy.fee.tax_scope === "excluded") {
            feeEn += " (excluding taxes/fees)";
            feeCn += "（不含税费）";
        } else if (policy.fee.tax_scope === "included") {
            feeEn += " (including taxes/fees)";
            feeCn += "（含税费）";
        }
        partsEn.push(`After the deadline, cancellation incurs a penalty of ${feeEn}.`);
        partsCn.push(`在截止时间之后取消，将收取 ${feeCn}。`);
    }

    return { en: partsEn.join(" "), cn: partsCn.join(" ") };
}
