# nayapusaka — TypeScript Conventions

> Dokumen ini memperluas [../CONVENTIONS.md](../CONVENTIONS.md). Semua aturan di root berlaku. Bagian ini hanya mendokumentasikan aturan tambahan dan penyesuaian spesifik untuk project backend Express.js ini.

---

## 1. File Naming

nayapusaka menggunakan konvensi **dot-separated** (berbeda dari kebab-case di project lain):

```
children.controller.ts
children.services.ts
children.router.ts
auth.middleware.ts
normalize.formatter.ts
```

Pertahankan konvensi ini untuk konsistensi internal. Jangan campur dengan kebab-case.

---

## 2. Module System

Project ini menggunakan `commonjs`. Semua import menggunakan style `require`-compatible:

```typescript
// BENAR: named imports ES-module style (dikompilasi ke require oleh tsc)
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

// Tidak ada top-level await kecuali di entry point (server.ts)
```

---

## 3. Controller Pattern

Setiap controller function **wajib** mengikuti struktur ini:

```typescript
import type { Request, Response, NextFunction } from "express";

export const getChildren = async (
  req: Request,          // atau AuthRequest jika route butuh auth
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Parse inputs dari req.params, req.query, req.body
    const { id } = req.params;

    // 2. Panggil service(s) — tidak ada logika bisnis di sini
    const children = await getChildrenById(Number(id));

    // 3. Kirim response
    res.json({ message: "Data berhasil diambil", data: children });
  } catch (err) {
    // 4. Selalu delegate ke error middleware
    next(err);
  }
};
```

**Aturan controller:**
- Tidak boleh ada Prisma query langsung — panggil service
- Tidak boleh ada logika bisnis — cukup parse dan delegate
- Selalu gunakan `next(err)` untuk error handling, bukan `res.status(500)`
- Return type selalu `Promise<void>`

---

## 4. Service Pattern

Service adalah tempat semua logika bisnis dan Prisma queries:

```typescript
import { prisma } from "../utils/prisma/prisma";
import type { Children, Prisma } from "@prisma/client";

export const getChildrenById = async (id: number): Promise<Children> => {
  const children = await prisma.children.findUnique({
    where: { id },
  });

  // Service melempar error, bukan return null untuk not-found
  if (!children) {
    throw new Error(`Children dengan id ${id} tidak ditemukan`);
  }

  return children;
};

// Gunakan Prisma typed args untuk fleksibilitas query
export const getChildrenList = async (
  args?: Prisma.ChildrenFindManyArgs
): Promise<Children[]> => {
  return prisma.children.findMany(args);
};
```

**Aturan service:**
- Tidak boleh ada akses ke `req` atau `res`
- Lempar `Error` (atau custom error) untuk kasus not-found/invalid — jangan return `null`
- Gunakan `Prisma.XxxFindManyArgs` untuk membuat query yang fleksibel
- Selalu explicit return type

---

## 5. Response Shape

Semua response mengikuti tiga varian ini:

```typescript
// Single item
res.json({ message: "Data berhasil diambil", data: children });

// List
res.json({ message: "Data berhasil diambil", data: childrenList });

// Paginated list
res.json({
  message: "Data berhasil diambil",
  data: childrenList,
  pagination: {
    total: 100,
    page: 1,
    limit: 10,
    totalPages: 10,
  },
});
```

Tidak ada variasi lain. Response `data` tidak pernah `undefined` — gunakan `null` jika kosong.

---

## 6. Error Middleware (Centralized)

Saat ini belum ada centralized error handler di `app.ts`. **Tambahkan** middleware ini:

```typescript
// src/middlewares/error.middleware.ts
import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Prisma: record not found
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2025"
  ) {
    res.status(404).json({ message: "Data tidak ditemukan", data: null });
    return;
  }

  // Prisma: unique constraint violation
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    res.status(409).json({ message: "Data sudah ada (duplicate)", data: null });
    return;
  }

  // Standard Error
  const message = err instanceof Error ? err.message : "Internal server error";
  const status = err instanceof Error && "status" in err
    ? (err as Error & { status: number }).status
    : 500;

  res.status(status).json({ message, data: null });
};
```

Daftarkan di `app.ts` **setelah semua routes** (Express membutuhkan 4 parameter untuk error handler):

```typescript
// app.ts
import { errorHandler } from "./middlewares/error.middleware";

app.use("/api/children", childrenRouter);
// ... route lainnya

// Error handler harus terakhir
app.use(errorHandler);
```

---

## 7. AuthRequest Type

Gunakan `AuthRequest` (bukan `Request`) untuk routes yang membutuhkan autentikasi:

```typescript
// src/types/express.d.ts (sudah ada)
import { Request } from "express";

export interface AuthRequest extends Request {
  user?: UserPayload;
}
```

```typescript
// Penggunaan di controller
import type { AuthRequest } from "../types/express";

export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.id;
  // ...
};
```

---

## 8. Prisma Conventions

```typescript
// Import Prisma client dari singleton wrapper — jangan buat instance baru
import { prisma } from "../utils/prisma/prisma";

// Import types langsung dari @prisma/client
import type { Children, Employee, Prisma } from "@prisma/client";

// Folder generated/ adalah output Prisma — jangan edit manual
// Jalankan `prisma generate` setelah mengubah schema.prisma

// Selalu gunakan prisma.$transaction untuk operasi multi-step
const [createdChildren, updatedParent] = await prisma.$transaction([
  prisma.children.create({ data: childrenData }),
  prisma.parent.update({ where: { id }, data: { childrenCount: { increment: 1 } } }),
]);
```

---

## 9. Environment Variables

```typescript
// Akses env vars melalui process.env dengan fallback
const PORT = process.env.PORT ?? "9000";
const JWT_SECRET = process.env.JWT_SECRET;

// Validasi di startup — jangan biarkan undefined lolos ke runtime
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET tidak diset di environment variables");
}
```

---

## 10. Testing (Jest)

Testing berlaku untuk `src/utils/`. Target ke depan: tambahkan test untuk services.

```typescript
// Lokasi: src/utils/__tests__/formatter/normalize.test.ts
// Lokasi target: src/services/__tests__/children.service.test.ts

// Jest config sudah ada di jest.config.js
// Jalankan: npm test
// Coverage: npm test -- --coverage
```

Ikuti pola `describe`/`it` di [root CONVENTIONS.md](../CONVENTIONS.md#15-testing-conventions).

---

## 11. Singleton Pattern untuk External Clients

```typescript
// src/utils/prisma/prisma.ts — pola yang sudah benar, pertahankan
let prismaInstance: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
};

// Sama untuk S3 client
let s3ClientInstance: S3Client | null = null;

export const s3 = (): S3Client => {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({ region: process.env.AWS_REGION });
  }
  return s3ClientInstance;
};
```
