const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 15_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node tests/fixtures/static-server.js",
    url: "http://127.0.0.1:4173/dashboard",
    reuseExistingServer: true
  }
});
