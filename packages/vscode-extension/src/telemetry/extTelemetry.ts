// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { FxError, Stage, UserError } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core";
import { globalStateGet, globalStateUpdate } from "@microsoft/teamsfx-core";
import * as extensionPackage from "../../package.json";
import { VSCodeTelemetryReporter } from "../commonlib/telemetry";
import * as globalVariables from "../globalVariables";
import { getProjectId } from "../utils/commonUtils";
import {
  TelemetryComponentType,
  TelemetryErrorType,
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "./extTelemetryEvents";

const TelemetryCacheKey = "TelemetryEvents";
// export for UT
export let lastCorrelationId: string | undefined = undefined;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ExtTelemetry {
  export let reporter: VSCodeTelemetryReporter;
  export let hasSentTelemetry = false;
  /* eslint-disable prefer-const */
  export let settingsVersion: string | undefined = undefined;

  export function setHasSentTelemetry(eventName: string) {
    if (eventName === "query-expfeature") return;
    hasSentTelemetry = true;
  }

  export function addSharedProperty(name: string, value: string): void {
    reporter.addSharedProperty(name, value);
  }

  export class Reporter extends vscode.Disposable {
    constructor(ctx: vscode.ExtensionContext) {
      super(() => reporter.dispose());

      reporter = new VSCodeTelemetryReporter(
        extensionPackage.aiKey,
        extensionPackage.version,
        extensionPackage.name
      );
    }
  }

  export function stageToEvent(stage: Stage): string | undefined {
    /* debug telemetry event is not handling here */
    switch (stage) {
      case Stage.create:
        return TelemetryEvent.CreateProject;
      case Stage.provision:
        return TelemetryEvent.Provision;
      case Stage.deploy:
        return TelemetryEvent.Deploy;
      case Stage.publish:
        return TelemetryEvent.Publish;
      case Stage.createEnv:
        return TelemetryEvent.CreateNewEnvironment;
      case Stage.grantPermission:
        return TelemetryEvent.GrantPermission;
      case Stage.publishInDeveloperPortal:
        return TelemetryEvent.PublishInDeveloperPortal;
      case Stage.addWebpart:
        return TelemetryEvent.AddWebpart;
      case Stage.validateApplication:
        return TelemetryEvent.ValidateApplication;
      case Stage.createAppPackage:
        return TelemetryEvent.Build;
      case Stage.deployTeams:
        return TelemetryEvent.UpdateTeamsApp;
      case Stage.buildAad:
        return TelemetryEvent.BuildAadManifest;
      case Stage.deployAad:
        return TelemetryEvent.DeployAadManifest;
      case Stage.copilotPluginAddAPI:
        return TelemetryEvent.CopilotPluginAddAPI;
      default:
        return undefined;
    }
  }

  export function sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    setHasSentTelemetry(eventName);
    lastCorrelationId = Correlator.getId();
    if (!properties) {
      properties = {};
    }

    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    properties[TelemetryProperty.IsExistingUser] = globalVariables.isExistingUser;

    if (globalVariables.workspaceUri) {
      properties[TelemetryProperty.IsSpfx] = globalVariables.isSPFxProject.toString();
    }

    if (settingsVersion !== undefined) {
      properties![TelemetryProperty.SettingsVersion] = settingsVersion.toString();
    }

    reporter.sendTelemetryEvent(eventName, properties, measurements);
  }

  export function sendTelemetryErrorEvent(
    eventName: string,
    error: FxError,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
  ): void {
    if (!properties) {
      properties = {};
    }

    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    properties[TelemetryProperty.IsExistingUser] = globalVariables.isExistingUser;

    properties[TelemetryProperty.Success] = TelemetrySuccess.No;
    if (error instanceof UserError) {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.UserError;
    } else {
      properties[TelemetryProperty.ErrorType] = TelemetryErrorType.SystemError;
    }

    properties[TelemetryProperty.ErrorCode] = `${error.source}.${error.name}`;
    properties[TelemetryProperty.ErrorMessage] = `${error.message}${
      error.stack ? "\nstack:\n" + error.stack : ""
    }`;

    if (globalVariables.workspaceUri) {
      properties[TelemetryProperty.IsSpfx] = globalVariables.isSPFxProject.toString();
    }

    if (settingsVersion !== undefined) {
      properties![TelemetryProperty.SettingsVersion] = settingsVersion.toString();
    }

    reporter.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
  }

  export function sendTelemetryException(
    error: Error,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    if (!properties) {
      properties = {};
    }

    if (TelemetryProperty.Component in properties === false) {
      properties[TelemetryProperty.Component] = TelemetryComponentType;
    }

    properties[TelemetryProperty.IsExistingUser] = globalVariables.isExistingUser;

    if (globalVariables.workspaceUri) {
      properties[TelemetryProperty.IsSpfx] = globalVariables.isSPFxProject.toString();
    }

    if (settingsVersion !== undefined) {
      properties![TelemetryProperty.SettingsVersion] = settingsVersion.toString();
    }

    reporter.sendTelemetryException(error, properties, measurements);
  }

  export async function cacheTelemetryEventAsync(
    eventName: string,
    properties?: { [p: string]: string }
  ) {
    const telemetryEvents = {
      eventName: eventName,
      properties: {
        [TelemetryProperty.CorrelationId]: lastCorrelationId,
        [TelemetryProperty.ProjectId]: await getProjectId(),
        [TelemetryProperty.Timestamp]: new Date().toISOString(),
        ...properties,
      },
    };
    const newValue = JSON.stringify(telemetryEvents);
    await globalStateUpdate(TelemetryCacheKey, newValue);
  }

  export async function sendCachedTelemetryEventsAsync() {
    const existingValue = await globalStateGet(TelemetryCacheKey);
    if (existingValue) {
      try {
        const telemetryEvent = JSON.parse(existingValue);
        reporter.sendTelemetryEvent(telemetryEvent.eventName, telemetryEvent.properties);
      } catch (e) {}
      await globalStateUpdate(TelemetryCacheKey, undefined);
    }
  }

  export async function dispose() {
    await reporter.dispose();
  }
}
