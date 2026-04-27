import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  // Get your project ref from: https://cloud.trigger.dev → Project → Settings
  project: "proj_qnvrxkjiqwouboyeozqm",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
