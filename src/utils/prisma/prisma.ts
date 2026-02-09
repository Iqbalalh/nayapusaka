import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },  
});

// Singleton Prisma client instance
const prismaInstance = new PrismaClient({ adapter });

export const prisma = prismaInstance;
