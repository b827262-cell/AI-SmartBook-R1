import { loadStudentRuntimeConfig, type StudentRuntimeConfig } from "./config";
import type { StudentDataSource } from "./dataSource";
import { StaticDataSource } from "./staticDataSource";
import { SqliteDataSource } from "./sqliteDataSource";
import { RemoteDataSource } from "./remoteDataSource";

export * from "./config";
export * from "./dataSource";
export * from "./staticDataSource";
export * from "./sqliteDataSource";
export * from "./remoteDataSource";
export * from "./chatEngine";

/** Build the data source matching the configured runtime mode. */
export function createDataSource(
  config: StudentRuntimeConfig = loadStudentRuntimeConfig()
): StudentDataSource {
  switch (config.mode) {
    case "static":
      return new StaticDataSource();
    case "remote-api":
      return new RemoteDataSource(config.remoteApiBaseUrl ?? "");
    case "sqlite-api":
    default:
      return new SqliteDataSource(config.dbPath, config.readonlyMode);
  }
}
