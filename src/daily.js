import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateRecommendations } from "./recommender.js";
import { notifyDailyReport } from "./notify.js";
import { recommendationPath } from "./storage.js";
import { appendLog, ensureDirs, writeJson } from "./storage.js";

export async function runDaily(options = {}) {
  await ensureDirs();
  const report = await generateRecommendations({
    useNetwork: options.useNetwork ?? true,
    date: options.date,
    config: options.config,
    feedback: options.feedback,
    secrets: options.secrets,
  });

  if (!options.dryRun) {
    await writeJson(recommendationPath(report.date), report);
    await appendLog(
      `generated ${report.count} recommendations for ${report.date}; errors=${report.errors.length}`,
    );
    if (options.notify !== false) {
      await notifyDailyReport(report);
    }
  }

  return report;
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const dryRun = process.argv.includes("--dry-run");
  const noNetwork = process.argv.includes("--no-network");
  const noNotify = process.argv.includes("--no-notify");
  runDaily({ dryRun, useNetwork: !noNetwork, notify: !noNotify })
    .then((report) => {
      console.log(
        JSON.stringify(
          {
            date: report.date,
            count: report.count,
            errors: report.errors,
            first: report.recommendations[0]?.title,
          },
          null,
          2,
        ),
      );
    })
    .catch(async (error) => {
      await appendLog(`failed ${error.stack || error.message}`);
      console.error(error);
      process.exitCode = 1;
    });
}
