import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";

jest.mock("../../controllers/publicstats.controller", () => ({
  getPublicStats: jest.fn((_req, res: express.Response) => {
    res.json({ message: "ok", data: { family: { total: 1 } } });
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const publicStatsRouter = require("../publicstats.router").default as express.Router;

describe("GET /api/public/stats (CORS)", () => {
  let server: Server;
  let base: string;
  const env = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = "production";
    const app = express();
    app.use("/api/public", publicStatsRouter);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/stats`;
  });
  afterAll((done) => {
    process.env.NODE_ENV = env;
    server.close(done);
  });

  it("origin *.yayasanpusakakai.org: 200 + header CORS untuk origin itu", async () => {
    const origin = "https://www.yayasanpusakakai.org";
    const res = await fetch(base, { headers: { Origin: origin } });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(origin);
    expect(res.headers.get("vary")).toMatch(/Origin/i);
  });

  it("preflight dari domain yayasan diizinkan", async () => {
    const origin = "https://geo.yayasanpusakakai.org";
    const res = await fetch(base, {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "GET" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(origin);
  });

  it("origin asing: 403 tanpa header CORS", async () => {
    const res = await fetch(base, { headers: { Origin: "https://random-site.example" } });
    expect(res.status).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(await res.json()).toEqual({ message: "Origin tidak diizinkan", data: null });
  });

  it("tanpa header Origin (SSR/curl): tetap 200, tanpa header CORS", async () => {
    const res = await fetch(base);
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
