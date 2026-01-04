/**
 * Menormalisasi nilai input. 
 * Mengubah string kosong, string "null", atau undefined menjadi null murni.
 */
export const normalize = <T>(v: T): T | null => {
  if (v === "" || v === "null" || v === undefined || v === null) {
    return null;
  }
  return v;
};