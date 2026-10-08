import { isAllowedPublicOrigin } from "../publiccors";

describe("isAllowedPublicOrigin", () => {
  const env = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = env;
  });

  describe("production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it.each([
      "https://yayasanpusakakai.org",
      "https://www.yayasanpusakakai.org",
      "https://geo.yayasanpusakakai.org",
      "https://a.b.yayasanpusakakai.org",
      "https://WWW.YayasanPusakaKai.org",
    ])("mengizinkan %s", (origin) => {
      expect(isAllowedPublicOrigin(origin)).toBe(true);
    });

    it.each([
      ["http (bukan https)", "http://www.yayasanpusakakai.org"],
      ["domain lain", "https://random-site.example"],
      ["akhiran palsu", "https://yayasanpusakakai.org.evil.com"],
      ["tanpa titik pemisah", "https://evilyayasanpusakakai.org"],
      ["userinfo", "https://yayasanpusakakai.org@evil.com"],
      ["ada path", "https://www.yayasanpusakakai.org/x"],
      ["localhost di production", "http://localhost:3000"],
      ["bukan URL", "null"],
    ])("menolak %s", (_label, origin) => {
      expect(isAllowedPublicOrigin(origin)).toBe(false);
    });
  });

  it("mengizinkan localhost di luar production", () => {
    process.env.NODE_ENV = "development";
    expect(isAllowedPublicOrigin("http://localhost:5173")).toBe(true);
  });
});
