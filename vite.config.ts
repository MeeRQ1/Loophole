import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { offlinePlugin } from "./pwa";
export default defineConfig({
  base: "/Loophole/",
  plugins: [react(), offlinePlugin()],
  test: { include: ["tests/**/*.test.ts"] },
});
