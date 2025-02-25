/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import {
  Timeout,
  TreeViewCommands,
  TemplateProject,
  TemplateProjectFolder,
  TestFilePath,
} from "../../utils/constants";
import { dotenvUtil } from "../../utils/envUtil";
import { clearNotifications } from "../../utils/vscodeOperation";
import { InputBox, VSBrowser } from "vscode-extension-tester";
import { getSampleAppName } from "../../utils/nameUtil";
import {
  execCommandIfExistFromTreeView,
  openExistingProject,
  stopDebugging,
} from "../../utils/vscodeOperation";
import { assert, expect } from "chai";
import { TestContext } from "../testContext";
import * as dotenv from "dotenv";
import { CliHelper } from "../cliHelper";
import { AzSqlHelper } from "../../utils/azureCliHelper";

export class SampledebugContext extends TestContext {
  public readonly appName: string;
  public readonly sampleName: TemplateProject;
  public readonly projectPath: string;
  public originPath = "";
  public readonly testRootFolder: string;
  public env: "dev" | "local" = "dev";
  public originSample: TemplateProjectFolder;
  public rgName: string;

  constructor(
    sampleName: TemplateProject,
    originSample: TemplateProjectFolder,
    testRootFolder = "./resource"
  ) {
    super(sampleName);
    this.sampleName = sampleName;
    this.originSample = originSample;
    if (sampleName.length >= 20) {
      this.appName = getSampleAppName(
        sampleName
          .split(" ")
          .splice(0, 3)
          .join("")
          .split(",")
          .join("")
          .split(")")
          .join("")
          .split("(")
          .join("")
      );
    } else {
      this.appName = getSampleAppName(sampleName);
    }
    // fix eslint error
    if (
      originSample === TemplateProjectFolder.TodoListBackend ||
      originSample === TemplateProjectFolder.TodoListM365
    )
      this.testRootFolder = path.resolve(os.homedir(), "resourse");
    else this.testRootFolder = testRootFolder;
    this.projectPath = path.resolve(this.testRootFolder, this.appName);
    this.env = "dev";
    this.rgName = `${this.appName}-dev-rg`;
  }

  public async sampleAfter(
    rgName: string,
    hasAadPlugin = true,
    hasBotPlugin = false
  ) {
    await stopDebugging();
    await this.context!.close();
    await this.browser!.close();
    await AzSqlHelper.deleteResourceGroup(rgName);
    await this.cleanResource(hasAadPlugin, hasBotPlugin);
  }

  public async after(
    hasAadPlugin = true,
    hasBotPlugin = false,
    envName = "dev"
  ) {
    await stopDebugging();
    await this.context!.close();
    await this.browser!.close();
    if (envName != "local") {
      await AzSqlHelper.deleteResourceGroup(this.rgName);
    }
    await this.cleanResource(hasAadPlugin, hasBotPlugin);
  }

  public async openResourceFolder() {
    console.log("start to open project: ", this.sampleName);
    // two repos have different sample path
    const oldPath = path.resolve(
      this.testRootFolder == "./resource/samples"
        ? "./resource/samples"
        : "./resource",
      this.originSample
    );
    // move old sample to project path
    await fs.mkdir(this.projectPath);
    try {
      await fs.copy(oldPath, this.projectPath);
      await openExistingProject(this.projectPath);
      console.log(
        "create complate !!! ",
        this.appName,
        " path: ",
        this.projectPath
      );
    } catch (error) {
      throw new Error(`Failed to open project: ${this.sampleName}`);
    }
  }

  public async createTemplate() {
    console.log(
      "start to create project: ",
      this.appName,
      ". path: ",
      this.projectPath
    );
    const driver = VSBrowser.instance.driver;
    await clearNotifications();
    await execCommandIfExistFromTreeView(
      TreeViewCommands.CreateProjectCommand,
      Timeout.webView
    );
    const input = await InputBox.create();
    console.log("1. Start from a sample");
    await input.selectQuickPick("Start from a sample");
    await driver.sleep(Timeout.input);
    console.log("2. sample name: ", this.sampleName.split("-").join(" "));
    await input.setText(this.sampleName.split("-").join(" "));
    await input.confirm();
    await driver.sleep(Timeout.input);
    // Input folder path
    await input.setText("default folder");
    const inputbox = await InputBox.create();
    const pick = await inputbox.getQuickPicks();
    const des = (await pick[0].getDescription()) || "";
    this.originPath = path.resolve(des, this.originSample);
    console.log("3. location: ", this.originPath);
    await input.confirm();
    // windows os need to wait long time to create project
    await driver.sleep(Timeout.installWait);

    try {
      console.log(
        "4. copy from origin path",
        this.originPath,
        " to test folder ",
        this.projectPath
      );
      await fs.copy(this.originPath, this.projectPath);
      console.log("copy successfully!!!");
    } catch (error) {
      console.log(error);
      assert.throw(() => error);
    }

    await openExistingProject(this.projectPath);
    console.log(
      "create complate !!! ",
      this.appName,
      " path: ",
      this.projectPath
    );
  }

  public async createTemplateCLI(V3: boolean) {
    console.log(
      "start to create project: ",
      this.appName,
      ". path: ",
      this.projectPath
    );

    await CliHelper.createTemplateProject("./resource", this.originSample, V3);

    this.originPath = path.resolve("./resource", this.originSample);

    try {
      console.log(
        "copy from origin path",
        this.originPath,
        " to test folder ",
        this.projectPath
      );
      await fs.copy(this.originPath, this.projectPath);
      console.log("copy successfully!!!");
    } catch (error) {
      console.log(error);
      assert.throw(() => error);
    }

    await openExistingProject(this.projectPath);
    console.log(
      "create complate !!! ",
      this.appName,
      " path: ",
      this.projectPath
    );
  }

  public async openExistFolder(path: string) {
    await openExistingProject(path);
  }

  public async validateLocalStateForBot(): Promise<void> {
    console.log(`validating localSettings for bot`);
    const localStateFile = path.join(".fx", "states", "state.local.json");
    const localStatePath = path.resolve(
      this.testRootFolder,
      this.appName,
      localStateFile
    );
    const localState = await fs.readJSON(localStatePath);

    const botPassword = localState["fx-resource-bot"]["botPassword"] as string;

    const localUserDataFile = path.join(".fx", "states", "local.userdata");
    const localUserDataPath = path.resolve(
      this.testRootFolder,
      this.appName,
      localUserDataFile
    );
    const localUserDataContent = await fs.readFile(localUserDataPath);
    const localUserData = dotenv.parse(localUserDataContent);
    if (
      !localUserData[
        botPassword.substring(2, botPassword.length - 2)
      ].startsWith("crypto_")
    ) {
      throw new Error(`Secret fields are not encrypted for bot project`);
    }
  }

  public async validateLocalStateForTab(): Promise<void> {
    console.log(`validating localSettings for tab`);
    const localStateFile = path.join(".fx", "states", "state.local.json");
    const localStatePath = path.resolve(
      this.testRootFolder,
      this.appName,
      localStateFile
    );
    try {
      await fs.readJSON(localStatePath);
    } catch (error) {
      console.log(error);
      assert.fail(error as string);
    }
  }

  public async provisionWithCLI(
    env: "local" | "dev",
    v3: boolean,
    environment?: NodeJS.ProcessEnv
  ): Promise<void> {
    if (v3) {
      process.env["AZURE_RESOURCE_GROUP_NAME"] = this.rgName;
      await AzSqlHelper.login();
      const azhelper = new AzSqlHelper(this.rgName, []);
      await azhelper.createResourceGroup();
    }
    await CliHelper.provisionProject(this.projectPath, env, v3, environment);
  }

  public async deployWithCLI(env: "local" | "dev"): Promise<void> {
    await CliHelper.deploy(this.projectPath, env);
  }

  public async publishWithCLI(env: "local" | "dev"): Promise<void> {
    await CliHelper.publishProject(this.projectPath, env);
  }

  public async debugWithCLI(env: "local" | "dev"): Promise<void> {
    await CliHelper.debugProject(this.projectPath, env);
  }

  public async getTeamsAppId(env: "local" | "dev" = "local"): Promise<string> {
    const userDataFile = path.join(
      TestFilePath.configurationFolder,
      `.env.${env}`
    );
    const configFilePath = path.resolve(this.projectPath, userDataFile);
    const context = dotenvUtil.deserialize(
      await fs.readFile(configFilePath, { encoding: "utf8" })
    );
    const result = context.obj.TEAMS_APP_ID as string;
    console.log(`TEAMS APP ID: ${result}`);
    expect(result).to.not.be.undefined;
    return result;
  }

  public editDotEnvFile(
    env: "local" | "dev",
    key: string,
    value: string
  ): void {
    const envPath = path.resolve(this.projectPath, "env", `.env.${env}.user`);
    try {
      const envFileContent: string = fs.readFileSync(envPath, "utf-8");
      const envVars: { [key: string]: string } = envFileContent
        .split("\n")
        .reduce((acc: { [key: string]: string }, line: string) => {
          const [key, value] = line.split("=");
          if (key && value) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        }, {});
      envVars[key] = value;
      const newEnvFileContent: string = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");
      fs.writeFileSync(envPath, newEnvFileContent);
    } catch (error) {
      console.log('Failed to edit ".env" file.');
    }
  }
}
