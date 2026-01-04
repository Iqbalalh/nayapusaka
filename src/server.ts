/* eslint-disable no-console */
import dotenv from "dotenv";
import app from "./app";

dotenv.config();

const PORT: number = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
