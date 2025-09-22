export type Policy = {
    fee?: { type?: 'fixed_amount'|'entire_stay_room_and_tax'|'nights_penalty'|'percentage_or_nrf',
        amount?: number, currency?: string, nights?: number, percent?: number, tax_scope?: 'INCL'|'EXCL' };
    window?: { type?: 'relative_to_arrival', cutoff_days?: number };
    deadline?: { iso?: string, local_hour?: number, local_minute?: number, date_ddmmmyy?: string };
    special_window?: { unit?: string, cutoff_days?: number };
    remainder?: string;
};

export type Rule = { id: string; priority: number; regex: string; map: any; };
