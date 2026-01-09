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
import familyVisitRouter from "./routes/famvisit.router";
import umkmVisitRouter from "./routes/umkmvisit.router";
import umkmMonitoringRouter from "./routes/umkmmonitoring.router";

const app: Application = express();

// ======================
// Middlewares
// ======================
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow ngrok origins and localhost
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:9000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:9000',
        // Add your ngrok URL here if needed
      ];
      
      // Allow all ngrok URLs
      if (origin.includes('ngrok-free.dev') || origin.includes('ngrok.io')) {
        return callback(null, true);
      }
      
      // Allow localhost
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      
      callback(null, true); // Allow all origins for development
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
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
app.use("/api/family-visits", familyVisitRouter);
app.use("/api/umkm-visits", umkmVisitRouter);
app.use("/api/umkm-monitoring", umkmMonitoringRouter);

// ======================
// Export App
// ======================
export default app;
