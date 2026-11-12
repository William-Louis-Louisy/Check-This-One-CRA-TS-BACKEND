import "reflect-metadata";
import { DataSource } from "typeorm";
import { join } from "path";
require("dotenv").config();

// The live API never runs migrations or schema sync automatically.
// Isolated CI tests may explicitly bootstrap a disposable database only.
export const dataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, "../models/*.model{.ts,.js}")],
  migrations: [join(__dirname, "../migrations/*{.ts,.js}")],
  migrationsTableName: "cto_schema_migrations",
  migrationsRun: false,
  migrationsTransactionMode: "none",
  synchronize:
    process.env.NODE_ENV === "test" &&
    process.env.DB_NAME === "cto_security_test" &&
    process.env.DB_SYNCHRONIZE === "true",
});
