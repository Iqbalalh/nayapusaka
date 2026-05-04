const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export const toRomanNumeral = (month: number): string => ROMAN[month - 1] ?? String(month);
