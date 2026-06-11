export type StudentRuntimeMode = "static" | "sqlite-api" | "remote-api";
export type StudentChatMode = "keyword" | "remote";

export interface StudentRuntimeConfig {
  mode: StudentRuntimeMode;
  dbPath: string;
  apiPort: number;
  publicDir: string;
  readonlyMode: boolean;
  chatMode: StudentChatMode;
}

export function loadStudentRuntimeConfig(env: NodeJS.ProcessEnv = process.env): StudentRuntimeConfig {
  return {
    mode: (env.STU_RUNTIME_MODE as StudentRuntimeMode) || "sqlite-api",
    dbPath: env.STU_DB_PATH || "/opt/AI-Stu-R1/data/student.db",
    apiPort: Number(env.STU_API_PORT || 4310),
    publicDir: env.STU_PUBLIC_DIR || "/opt/AI-Stu-R1/dist",
    readonlyMode: env.STU_READONLY_MODE !== "false",
    chatMode: (env.STU_CHAT_MODE as StudentChatMode) || "keyword"
  };
}
