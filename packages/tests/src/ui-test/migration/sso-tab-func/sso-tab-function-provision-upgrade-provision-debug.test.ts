/**
 * @author Frank Qian <frankqian@microsoft.com>
 */
import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Notification,
  ResourceToDeploy,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import { validateTab, initPage } from "../../../utils/playwrightOperation";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  upgradeByTreeView,
  validateUpgrade,
} from "../../../utils/vscodeOperation";
import { CLIVersionCheck } from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let mirgationDebugTestContext: MigrationTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Tab,
      "javascript"
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after(true, true, "dev");
  });

  it(
    "[auto] tab, function app with sso migrate test - js",
    {
      testPlanCaseId: 17184045,
      author: "frankqian@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);
      // verify popup
      await validateNotification(Notification.Upgrade);

      // add feature
      await mirgationDebugTestContext.addFeatureV2(ResourceToDeploy.Function);

      // v2 provision
      await mirgationDebugTestContext.provisionWithCLI("dev", false);

      // upgrade
      await upgradeByTreeView();
      //verify upgrade
      await validateUpgrade();

      // install test cil in project
      await CliHelper.installCLI(
        Env.TARGET_CLI,
        false,
        mirgationDebugTestContext.projectPath
      );
      // enable cli v3
      CliHelper.setV3Enable();

      // v3 provision
      await mirgationDebugTestContext.provisionWithCLI("dev", true);
      await CLIVersionCheck("V3", mirgationDebugTestContext.projectPath);
      // v3 deploy
      await mirgationDebugTestContext.deployWithCLI("dev");

      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId("dev");
      // UI verify
      const page = await initPage(
        mirgationDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateTab(page, Env.displayName, false);
    }
  );
});
