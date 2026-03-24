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
import childAssistanceRouter from "./routes/childassistance.router";
import galleryRouter from "./routes/gallery.router";
import socialAssistanceRouter from "./routes/socialassistance.router";
import userRouter from "./routes/user.router";
import letterRouter from "./routes/letter.router";

const app: Application = express();

// ======================
// Middlewares
// ======================
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow all subdomains of yayasanpusakakai.org
      if (origin.endsWith('.yayasanpusakakai.org') || origin === 'https://yayasanpusakakai.org') {
        return callback(null, true);
      }
      
      // Get allowed origins from environment variables
      const allowedOrigins = [
        process.env.FRONT_END_GEOPUSAKA,
        process.env.FRONT_END_SIPUSAKA,
      ].filter(Boolean); // Remove undefined values
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow localhost for development
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      
      // In production, only allow configured origins
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Not allowed by CORS'));
      }
      
      // Allow all origins for development
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use("/api/child-assistance", childAssistanceRouter);
app.use("/api/galleries", galleryRouter);
app.use("/api/social-assistance", socialAssistanceRouter);
app.use("/api/users", userRouter);
app.use("/api/letters", letterRouter);

// ======================
// Export App
// ======================
export default app;
