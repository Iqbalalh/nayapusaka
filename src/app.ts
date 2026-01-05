import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import employeeRouter from "./routes/employee.router";
import homeRouter from "./routes/home.router";
import partnerRouter from "./routes/partner.router";
import childrenRouter from "./routes/children.router";
import waliRouter from "./routes/wali.router";
import regionRouter from "./routes/region.router";
import dashboardRouter from "./routes/dashboard.router";
import authRouter from "./routes/auth.router";
import umkmRouter from "./routes/umkm.router";
import staffRouter from "./routes/staff.router";
import pictureRouter from "./routes/picture.router";

const app: Application = express();

// ======================
// Middlewares
// ======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger (dev)
app.use(morgan("dev"));

// ======================
// Health Check
// ======================
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "API is running 🚀",
  });
});

// ======================
// Routes
// ======================
app.use("/api/auth", authRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/homes", homeRouter);
app.use("/api/partners", partnerRouter);
app.use("/api/children", childrenRouter);
app.use("/api/wali", waliRouter);
app.use("/api/regions", regionRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/umkm", umkmRouter);
app.use("/api/staff", staffRouter);
app.use("/api/picture", pictureRouter);

// ======================
// Export App
// ======================
export default app;
