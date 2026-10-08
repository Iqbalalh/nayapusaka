import type { Request, Response } from "express";

const count = (n: number) => jest.fn().mockResolvedValue({ count: n });

jest.mock("../../services/children.services", () => ({
  selectChildrenCount: count(100),
  selectActiveChildrenCount: count(90),
  selectInactiveChildrenCount: count(10),
  selectAbkChildrenCount: count(5),
  selectYatimChildrenCount: count(20),
  selectPiatuChildrenCount: count(15),
  selectYatimPiatuChildrenCount: count(8),
}));
jest.mock("../../services/home.services", () => ({
  selectHomeCount: count(60),
  selectActiveFamilyCount: count(55),
  selectInactiveFamilyCount: count(5),
}));
jest.mock("../../services/umkm.services", () => ({
  selectUmkmCount: count(30),
  selectActiveUmkmCount: count(25),
  selectAssistedUmkmCount: count(12),
}));
jest.mock("../../services/childassistance.services", () => ({
  selectGlobalEducationLevelStats: jest.fn().mockResolvedValue({ SD: 40, SMP: 30 }),
}));

// Setiap test memuat modul baru supaya cache in-memory tidak bocor antar test.
// Service ikut di-load di registry yang sama agar mock-nya bisa di-assert.
const loadController = () => {
  let controller!: typeof import("../publicstats.controller");
  let children!: typeof import("../../services/children.services");
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    controller = require("../publicstats.controller");
    children = require("../../services/children.services");
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  return {
    getPublicStats: controller.getPublicStats,
    selectChildrenCount: children.selectChildrenCount as jest.Mock,
  };
};

const makeRes = () => {
  const res = { json: jest.fn(), set: jest.fn() };
  return res as unknown as Response & { json: jest.Mock; set: jest.Mock };
};

describe("getPublicStats", () => {
  it("mengembalikan agregat global tanpa field sensitif", async () => {
    const { getPublicStats } = loadController();
    const res = makeRes();
    const next = jest.fn();

    await getPublicStats({} as Request, res, next);

    expect(next).not.toHaveBeenCalled();
    const body = (res.json.mock.calls[0] as [{ data: Record<string, any> }])[0];
    expect(body.data.family).toEqual({ total: 60, active: 55, inactive: 5 });
    expect(body.data.children.total).toBe(100);
    expect(body.data.children.yatimPiatu).toBe(8);
    expect(body.data.umkm).toEqual({ total: 30, active: 25, assisted: 12 });
    expect(body.data.educationLevels).toEqual({ SD: 40, SMP: 30 });
    expect(Object.keys(body.data).sort()).toEqual(
      ["children", "educationLevels", "family", "umkm", "updatedAt"].sort()
    );
    expect(res.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=300");
  });

  it("memakai cache pada request kedua", async () => {
    const { getPublicStats, selectChildrenCount } = loadController();

    await getPublicStats({} as Request, makeRes(), jest.fn());
    await getPublicStats({} as Request, makeRes(), jest.fn());

    expect(selectChildrenCount).toHaveBeenCalledTimes(1);
  });

  it("tidak membocorkan pesan error internal", async () => {
    const { getPublicStats, selectChildrenCount } = loadController();
    selectChildrenCount.mockRejectedValueOnce(new Error("P1001 db host 10.0.0.5 down"));
    const next = jest.fn();

    await getPublicStats({} as Request, makeRes(), next);

    const err = next.mock.calls[0][0] as Error & { status: number };
    expect(err.message).toBe("Gagal mengambil data statistik");
    expect(err.status).toBe(500);
  });
});
