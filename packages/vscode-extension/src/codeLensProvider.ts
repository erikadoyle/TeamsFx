// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AppPackageFolderName, TemplateFolderName } from "@microsoft/teamsfx-api";
import {
  MetadataV3,
  envUtil,
  environmentManager,
  getAllowedAppMaps,
  getPermissionMap,
} from "@microsoft/teamsfx-core";
import * as fs from "fs-extra";
import * as parser from "jsonc-parser";
import isUUID from "validator/lib/isUUID";
import * as vscode from "vscode";
import { environmentVariableRegex } from "./constants";
import { commandIsRunning } from "./globalVariables";
import { getSystemInputs } from "./handlers";
import { TelemetryTriggerFrom } from "./telemetry/extTelemetryEvents";
import { localize } from "./utils/localizeUtils";

async function resolveEnvironmentVariablesCodeLens(lens: vscode.CodeLens, from: string) {
  // Get environment variables
  const inputs = getSystemInputs();

  let localEnvs, defaultEnvs;
  const localEnvsRes = await envUtil.readEnv(
    inputs.projectPath!,
    environmentManager.getLocalEnvName(),
    false
  );
  if (localEnvsRes.isErr()) {
    localEnvs = {};
  } else {
    localEnvs = localEnvsRes.value;
  }
  const defaultEnvsRes = await envUtil.readEnv(
    inputs.projectPath!,
    environmentManager.getDefaultEnvName(),
    false
  );
  if (defaultEnvsRes.isErr()) {
    defaultEnvs = {};
  } else {
    defaultEnvs = defaultEnvsRes.value;
  }

  // Get value by the key
  if (lens instanceof PlaceholderCodeLens) {
    const key = lens.placeholder.replace(/{/g, "").replace(/}/g, "").replace(/\$/g, "");
    let title = "👉";

    const localValue = localEnvs[key];
    title = `${title} ${environmentManager.getLocalEnvName()}: ${localValue}`;

    if (lens.documentName.endsWith("manifest.template.local.json")) {
      lens.command = {
        title: title,
        command: "fx-extension.openConfigState",
        arguments: [{ type: "env", from: from, env: environmentManager.getLocalEnvName() }],
      };
    } else {
      const defaultValue = defaultEnvs[key];
      title = `${title}, ${environmentManager.getDefaultEnvName()}: ${defaultValue}`;

      lens.command = {
        title: title,
        command: "fx-extension.openConfigState",
        arguments: [{ type: "env", from: from }],
      };
    }
    return lens;
  }

  return lens;
}
export class PlaceholderCodeLens extends vscode.CodeLens {
  constructor(
    public readonly placeholder: string,
    range: vscode.Range,
    public readonly documentName: string,
    command?: vscode.Command | undefined
  ) {
    super(range, command);
  }
}

/**
 * CodelensProvider
 */
export class CryptoCodeLensProvider implements vscode.CodeLensProvider {
  private userDataRegex: RegExp;
  private localDebugRegex: RegExp;
  private envSecretRegex: RegExp;

  constructor() {
    this.userDataRegex =
      /fx-resource-[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-_]+(?:Secret|Password|VariableParams)=(.*)/g;
    this.localDebugRegex =
      /(?: *|\t*)"(?:clientSecret|SimpleAuthEnvironmentVariableParams|botPassword)": "(crypto_.*)"/g;
    this.envSecretRegex = /#?(?:SECRET_)[a-zA-Z0-9\-_]+=(crypto_.*)/g;
  }

  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (!commandIsRunning && document.fileName.includes(".env.")) {
      return this.computeCodeLenses(document, this.envSecretRegex);
    } else {
      return [];
    }
  }

  private computeCodeLenses(
    document: vscode.TextDocument,
    secretRegex: RegExp
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const regex = new RegExp(secretRegex);
    let matches;
    while (!commandIsRunning && (matches = regex.exec(text)) !== null) {
      const match = matches[1];
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(match);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = new vscode.Range(
        position,
        new vscode.Position(line.lineNumber, indexOf + match.length)
      );
      const command = {
        title: "🔑Decrypt secret",
        command: "fx-extension.decryptSecret",
        arguments: [match, range],
      };
      if (range) {
        codeLenses.push(new vscode.CodeLens(range, command));
      }
    }
    return codeLenses;
  }
}

export class AdaptiveCardCodeLensProvider implements vscode.CodeLensProvider {
  private static SEARCH_TERM = "adaptivecards.io/schemas/adaptive-card.json";

  public static async detectedAdaptiveCards(): Promise<boolean> {
    const files: vscode.Uri[] = await vscode.workspace.findFiles(`**/*.json`, "**/node_modules/**");
    for (const file of files) {
      const content = await fs.readFile(file.fsPath, "utf8");
      if (content.includes(AdaptiveCardCodeLensProvider.SEARCH_TERM)) {
        return true;
      }
    }
    return false;
  }
  provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
    if (!document.getText().includes(AdaptiveCardCodeLensProvider.SEARCH_TERM)) {
      return [];
    }
    const codeLenses: vscode.CodeLens[] = [];
    const topOfFile = new vscode.Range(0, 0, 0, 0);
    const command = {
      title: `👀${localize("teamstoolkit.commandsTreeViewProvider.previewAdaptiveCard")}`,
      command: "fx-extension.OpenAdaptiveCardExt",
      arguments: [TelemetryTriggerFrom.CodeLens],
    };
    codeLenses.push(new vscode.CodeLens(topOfFile, command));
    return codeLenses;
  }
}

export class ProjectSettingsCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    const editCmd = {
      title: "⚠️" + localize("teamstoolkit.codeLens.projectSettingsNotice"),
      command: "",
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), editCmd));
    return codeLenses;
  }
}

export class ManifestTemplateCodeLensProvider implements vscode.CodeLensProvider {
  private schemaRegex = /\$schema/;

  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    return this.computeTemplateCodeLensesV3(document);
  }

  public async resolveCodeLens(
    lens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): Promise<vscode.CodeLens> {
    return resolveEnvironmentVariablesCodeLens(lens, "manifest");
  }

  private computeTemplateCodeLensesV3(document: vscode.TextDocument) {
    const codeLenses: vscode.CodeLens[] = [];

    // Open Schema codelens
    const text = document.getText();
    const regex = new RegExp(this.schemaRegex);
    const matches = regex.exec(text);
    if (matches != null) {
      const match = matches[0];
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(match);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = new vscode.Range(
        position,
        new vscode.Position(line.lineNumber, indexOf + match.length)
      );
      const url = line.text.substring(line.text.indexOf("https"), line.text.length - 2);
      const schemaCommand = {
        title: localize("teamstoolkit.codeLens.openSchema"),
        command: "fx-extension.openSchema",
        arguments: [{ url: url }],
      };
      codeLenses.push(new vscode.CodeLens(range, schemaCommand));
    }

    // Environment variables codelens
    const envCodelenses = this.calculateCodeLens(document, environmentVariableRegex);
    codeLenses.push(...envCodelenses);
    return codeLenses;
  }

  private calculateCodeLens(
    document: vscode.TextDocument,
    regex: RegExp,
    command?: vscode.Command
  ) {
    let matches;
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    while ((matches = regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(matches[0]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = document.getWordRangeAtPosition(position, new RegExp(regex));

      if (range) {
        if (command) {
          codeLenses.push(new vscode.CodeLens(range, command));
        } else {
          codeLenses.push(new PlaceholderCodeLens(matches[0], range, document.fileName, undefined));
        }
      }
    }
    return codeLenses;
  }
}

interface PropertyPair {
  name: parser.Node;
  value: parser.Node;
}

export class AadAppTemplateCodeLensProvider implements vscode.CodeLensProvider {
  constructor() {}
  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    // V3 supports customize aad manifest
    if (document.fileName.endsWith(MetadataV3.aadManifestFileName)) {
      return this.computeTemplateCodeLenses(document);
    } else {
      return this.computeAadManifestCodeLenses(document);
    }
  }

  private getPropertyValueOfObjectByKey(key: string, node: parser.Node): parser.Node | undefined {
    if (node.type !== "object" || !node.children) {
      return undefined;
    }
    let propertyPair: PropertyPair | undefined;
    for (const child of node.children) {
      propertyPair = this.parseProperty(child);
      if (!propertyPair) {
        continue;
      }
      if (propertyPair.name.value === key) {
        return propertyPair.value;
      }
    }
    return undefined;
  }

  private parseProperty(node: parser.Node): PropertyPair | undefined {
    if (node.type !== "property" || !node.children || node.children.length !== 2) {
      return undefined;
    }
    return { name: node.children[0], value: node.children[1] };
  }

  private computeRequiredResAccessCodeLenses(
    document: vscode.TextDocument,
    jsonNode: parser.Node
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const requiredResourceAccessNode = parser.findNodeAtLocation(jsonNode, [
      "requiredResourceAccess",
    ]);
    const map = getPermissionMap();
    requiredResourceAccessNode?.children?.forEach((requiredResource) => {
      const resIdNode = this.getPropertyValueOfObjectByKey("resourceAppId", requiredResource);
      if (resIdNode) {
        const range = new vscode.Range(
          document.positionAt(resIdNode.offset),
          document.positionAt(resIdNode.offset + resIdNode.length)
        );

        const resIdOrName = resIdNode.value;

        let title = "";
        if (isUUID(resIdNode.value)) {
          title = map[resIdOrName]?.displayName;
        } else {
          title = map[resIdOrName]?.id;
        }

        if (title) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              command: "",
              title: `👉 resourceAppId: "${title}"`,
            })
          );
        }

        const resAccessArrNode = this.getPropertyValueOfObjectByKey(
          "resourceAccess",
          requiredResource
        );

        resAccessArrNode?.children?.forEach((resAccessNode) => {
          const resAccessIdNode = this.getPropertyValueOfObjectByKey("id", resAccessNode);
          if (resAccessIdNode) {
            const type = this.getPropertyValueOfObjectByKey("type", resAccessNode);
            let title = "";
            if (isUUID(resAccessIdNode?.value)) {
              if (type?.value === "Scope") {
                title = map[resIdOrName]?.scopeIds[resAccessIdNode?.value];
              } else if (type?.value === "Role") {
                title = map[resIdOrName]?.roleIds[resAccessIdNode?.value];
              }
            } else {
              if (type?.value === "Scope") {
                title = map[resIdOrName]?.scopes[resAccessIdNode?.value];
              } else if (type?.value === "Role") {
                title = map[resIdOrName]?.roles[resAccessIdNode?.value];
              }
            }
            const range = new vscode.Range(
              document.positionAt(resAccessIdNode.offset),
              document.positionAt(resAccessIdNode.offset + resAccessIdNode.length)
            );

            if (title) {
              codeLenses.push(
                new vscode.CodeLens(range, {
                  command: "",
                  title: `👉 id: "${title}"`,
                })
              );
            }
          }
        });
      }
    });

    return codeLenses;
  }

  private computePreAuthAppCodeLenses(
    document: vscode.TextDocument,
    jsonNode: parser.Node
  ): vscode.CodeLens[] {
    const preAuthAppArrNode = parser.findNodeAtLocation(jsonNode, ["preAuthorizedApplications"]);
    const map = getAllowedAppMaps();
    const codeLenses: vscode.CodeLens[] = [];

    preAuthAppArrNode?.children?.forEach((preAuthAppNode) => {
      const appIdNode = this.getPropertyValueOfObjectByKey("appId", preAuthAppNode);
      if (appIdNode) {
        const range = new vscode.Range(
          document.positionAt(appIdNode.offset),
          document.positionAt(appIdNode.offset + appIdNode.length)
        );
        const appName = map[appIdNode.value];
        if (appName) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              command: "",
              title: `👉 resource name: "${appName}"`,
            })
          );
        }
      }
    });
    return codeLenses;
  }

  public async resolveCodeLens(
    lens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): Promise<vscode.CodeLens> {
    return resolveEnvironmentVariablesCodeLens(lens, "aad");
  }

  private calculateCodeLensByRegex(document: vscode.TextDocument, regex: RegExp) {
    let matches;
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    while ((matches = regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(matches[0]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = document.getWordRangeAtPosition(position, new RegExp(regex));

      if (range) {
        codeLenses.push(new PlaceholderCodeLens(matches[0], range, document.fileName, undefined));
      }
    }
    return codeLenses;
  }

  private computeStateAndConfigCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses = [];

    const stateAndConfigCodelenses = this.calculateCodeLensByRegex(
      document,
      environmentVariableRegex
    );
    codeLenses.push(...stateAndConfigCodelenses);

    return codeLenses;
  }

  private computePreviewCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses = [];
    const command = {
      title: "🖼️Preview",
      command: "fx-extension.openPreviewAadFile",
      arguments: [{ fsPath: document.fileName }],
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), command));
    return codeLenses;
  }

  private computeTemplateCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const text = document.getText();
    const jsonNode: parser.Node | undefined = parser.parseTree(text);
    if (jsonNode) {
      const resAccessCodeLenses = this.computeRequiredResAccessCodeLenses(document, jsonNode);
      const preAuthAppCodeLenses = this.computePreAuthAppCodeLenses(document, jsonNode);
      const previewCodeLenses = this.computePreviewCodeLenses(document);
      const stateAndConfigCodelenses = this.computeStateAndConfigCodeLenses(document);
      return [
        ...resAccessCodeLenses,
        ...preAuthAppCodeLenses,
        ...previewCodeLenses,
        ...stateAndConfigCodelenses,
      ];
    }

    return [];
  }

  private computeAadManifestCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const updateCmd = {
      title: "🔄Deploy AAD manifest",
      command: "fx-extension.updateAadAppManifest",
      arguments: [{ fsPath: document.fileName }, TelemetryTriggerFrom.CodeLens],
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), updateCmd));

    const editTemplateCmd = {
      title: "⚠️This file is auto-generated, click here to edit the manifest template file",
      command: "fx-extension.editAadManifestTemplate",
      arguments: [{ fsPath: document.fileName }, TelemetryTriggerFrom.CodeLens],
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), editTemplateCmd));
    return codeLenses;
  }
}

export class PermissionsJsonFileCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      const workspaceFolder = vscode.workspace.workspaceFolders[0];
      const workspacePath: string = workspaceFolder.uri.fsPath;

      const aadTemplateFileExist = fs.pathExistsSync(
        `${workspacePath}/${TemplateFolderName}/${AppPackageFolderName}/aad.template.json`
      );
      if (aadTemplateFileExist) {
        const editTemplateCmd = {
          title:
            "⚠️This file is deprecated and not used anymore. Please click here to use AAD manifest template file instead",
          command: "fx-extension.editAadManifestTemplate",
          arguments: [{ fsPath: document.fileName }, TelemetryTriggerFrom.CodeLens],
        };
        codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), editTemplateCmd));
        return codeLenses;
      }
    }
  }
}

export class CopilotPluginCodeLensProvider implements vscode.CodeLensProvider {
  private schemaRegex = /composeExtensions/;
  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const regex = new RegExp(this.schemaRegex);
    const matches = regex.exec(text);
    if (matches != null) {
      const match = matches[0];
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(match);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = new vscode.Range(
        position,
        new vscode.Position(line.lineNumber, indexOf + match.length)
      );
      const schemaCommand = {
        title: "➕" + localize("teamstoolkit.codeLens.copilotPluginAddAPI"),
        command: "fx-extension.copilotPluginAddAPI",
        arguments: [{ fsPath: document.fileName }],
      };
      codeLenses.push(new vscode.CodeLens(range, schemaCommand));
      return codeLenses;
    }
  }
}
