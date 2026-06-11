import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/student": {
        target: process.env.STUDENT_API_TARGET || process.env.ADMIN_API_TARGET || "http://127.0.0.1:4300",
        changeOrigin: true
      }
    }
  }
});
