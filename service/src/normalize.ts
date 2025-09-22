export function normalize(s: string): string {
    return s.replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim().toUpperCase();
}