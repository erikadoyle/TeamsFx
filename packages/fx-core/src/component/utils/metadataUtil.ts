// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, TeamsAppManifest, devPreview } from "@microsoft/teamsfx-api";
import { TelemetryEvent, TelemetryProperty } from "../../common/telemetry";
import { MetadataV3 } from "../../common/versionMetadata";
import { TOOLS } from "../../core/globalVars";
import { LifecycleNames, ProjectModel } from "../configManager/interface";
import { yamlParser } from "../configManager/parser";
import { createHash } from "crypto";

class MetadataUtil {
  async parse(path: string, env: string | undefined): Promise<Result<ProjectModel, FxError>> {
    const res = await yamlParser.parse(path, true);
    const props: { [key: string]: string } = {};
    props[TelemetryProperty.YmlName] = (
      env === "local" ? MetadataV3.localConfigFile : MetadataV3.configFile
    )
      .split(".")
      .join("");
    if (res.isOk()) {
      for (const name of LifecycleNames) {
        const str = res.value[name]?.driverDefs
          .map((def) => def.uses)
          .toString()
          .split("/")
          .join("");
        props[name + ".actions"] = str ?? "";
      }
      props[TelemetryProperty.YmlSchemaVersion] = res.value.version;

      TOOLS.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.MetaData, props);
    }

    return res;
  }

  parseManifest(manifest: TeamsAppManifest | devPreview.DevPreviewSchema): void {
    const props: { [key: string]: string } = {};
    const prefix = "manifest.";
    props[prefix + "id"] = manifest.id ?? "";
    props[prefix + "version"] = manifest.version ?? "";
    props[prefix + "manifestVersion"] = manifest.manifestVersion ?? "";
    props[prefix + "bots"] = manifest.bots?.map((bot) => bot.botId).toString() ?? "";
    props[prefix + "composeExtensions"] =
      manifest.composeExtensions?.map((bot) => bot.botId).toString() ?? "";
    props[prefix + "staticTabs.contentUrl"] =
      manifest.staticTabs
        ?.map((tab) =>
          tab.contentUrl ? createHash("sha256").update(tab.contentUrl).digest("hex") : "undefined"
        )
        .toString() ?? "";
    props[prefix + "configurableTabs.configurationUrl"] =
      manifest.configurableTabs
        ?.map((tab) =>
          tab.configurationUrl
            ? createHash("sha256").update(tab.configurationUrl).digest("hex")
            : "undefined"
        )
        .toString() ?? "";
    props[prefix + "webApplicationInfo.id"] = manifest.webApplicationInfo?.id ?? "";
    props[prefix + "extensions"] =
      "extensions" in manifest && manifest["extensions"]?.length != 0 ? "true" : "false";

    TOOLS.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.MetaData, props);
  }
}

export const metadataUtil = new MetadataUtil();
