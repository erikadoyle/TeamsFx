/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
  LocalDebugTaskLabel,
  LocalDebugTaskResult,
} from "../../utils/constants";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import * as path from "path";
import fs from "fs";
import { initPage, validateStockUpdate } from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";

describe("Sample Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    sampledebugContext = new SampledebugContext(
      TemplateProject.StockUpdate,
      TemplateProjectFolder.StockUpdate
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.after();
  });

  it(
    "[auto] local debug for Sample Hello World Bot Sso",
    {
      testPlanCaseId: 17303802,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();
      // await sampledebugContext.createTemplate();

      const targetFile = path.resolve(
        sampledebugContext.projectPath,
        "env",
        ".env.local"
      );
      let data = fs.readFileSync(targetFile, "utf-8");
      data +=
        "\nTEAMSFX_API_ALPHAVANTAGE_ENDPOINT=https://www.alphavantage.co\nTEAMSFX_API_ALPHAVANTAGE_API_KEY=demo";
      fs.writeFileSync(targetFile, data);
      console.log("write .env.local finish!");

      try {
        // local debug
        await startDebugging();

        console.log("Start Local Tunnel");
        await waitForTerminal(
          LocalDebugTaskLabel.StartLocalTunnel,
          LocalDebugTaskResult.StartSuccess
        );

        console.log("wait for Azurite service Started");
        await waitForTerminal(
          LocalDebugTaskLabel.Azurite,
          LocalDebugTaskResult.AzuriteSuccess
        );

        console.log("Compile...");
        await waitForTerminal(
          LocalDebugTaskLabel.Compile,
          LocalDebugTaskResult.CompiledSuccess
        );

        console.log("wait for application Started");
        await waitForTerminal(
          LocalDebugTaskLabel.StartBotApp,
          LocalDebugTaskResult.BotAppSuccess
        );
      } catch (error) {
        await VSBrowser.instance.takeScreenshot(getScreenshotName("debug"));
        console.log("[Skip Error]: ", error);
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }

      const teamsAppId = await sampledebugContext.getTeamsAppId("local");
      console.log(teamsAppId);
      const page = await initPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      validateStockUpdate(page);
      console.log("debug finish!");
    }
  );
});
