import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/**/*.test.js"],
    reporters: ["default", ["vitest-sonar-reporter", { outputFile: "sonar-report.xml" }]],
    coverage: {
      reporter: "lcov",
    },
  },
});
