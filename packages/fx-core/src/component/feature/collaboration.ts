// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, FxError, M365TokenProvider, Result, err, ok } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { hooks } from "@feathersjs/hooks/lib";
import { AadOwner, ResourcePermission, TeamsAppAdmin } from "../../common/permissionInterface";
import { AadAppClient } from "../driver/aad/utility/aadAppClient";
import { permissionsKeys } from "../driver/aad/utility/constants";
import { addStartAndEndTelemetry } from "../driver/middleware/addStartAndEndTelemetry";
import axios from "axios";
import { HttpClientError, HttpServerError, UnhandledError } from "../../error/common";
import { TelemetryUtils } from "../driver/teamsApp/utils/telemetry";
import { AppUser } from "../driver/teamsApp/interfaces/appdefinitions/appUser";
import { AppStudioScopes, Constants } from "../driver/teamsApp/constants";
import { AppStudioClient } from "../driver/teamsApp/clients/appStudioClient";

const EventName = {
  grantPermission: "grant-permission",
  listCollaborator: "list-collaborator",
  checkPermission: "check-permission",
};
const componentNameAad = "fx-resource-aad-app-for-teams";
const componentNameTeams = "AppStudioPlugin";

@Service("aad-collaboration")
export class AadCollaboration {
  private readonly aadAppClient: AadAppClient;

  constructor(m365TokenProvider: M365TokenProvider) {
    this.aadAppClient = new AadAppClient(m365TokenProvider);
  }

  @hooks([addStartAndEndTelemetry(EventName.grantPermission, componentNameAad)])
  public async grantPermission(
    ctx: Context,
    objectId: string,
    userObjectId: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      await this.aadAppClient.addOwner(objectId, userObjectId);

      const result = [
        {
          name: permissionsKeys.name,
          type: permissionsKeys.type,
          roles: [permissionsKeys.owner],
          resourceId: objectId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx));
    }
  }

  @hooks([addStartAndEndTelemetry(EventName.listCollaborator, componentNameAad)])
  public async listCollaborator(
    ctx: Context,
    objectId: string
  ): Promise<Result<AadOwner[], FxError>> {
    try {
      const owners = await this.aadAppClient.getOwners(objectId);
      return ok(owners ?? []);
    } catch (error) {
      return err(this.handleError(error, ctx));
    }
  }

  @hooks([addStartAndEndTelemetry(EventName.checkPermission, componentNameAad)])
  public async checkPermission(
    ctx: Context,
    objectId: string,
    userObjectId: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      const owners = await this.aadAppClient.getOwners(objectId);
      const isAadOwner = owners?.find((owner: AadOwner) => owner.userObjectId === userObjectId);

      const result = [
        {
          name: permissionsKeys.name,
          type: permissionsKeys.type,
          roles: isAadOwner ? [permissionsKeys.owner] : [permissionsKeys.noPermission],
          resourceId: objectId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx));
    }
  }

  private handleError(error: any, ctx: Context): FxError {
    if (axios.isAxiosError(error)) {
      const message = JSON.stringify(error.response!.data);
      ctx.logProvider?.error(message);
      if (error.response!.status >= 400 && error.response!.status < 500) {
        return new HttpClientError(componentNameAad, message);
      } else {
        return new HttpServerError(componentNameAad, message);
      }
    }

    const message = JSON.stringify(error);
    ctx.logProvider?.error(message);
    return new UnhandledError(error as Error, componentNameAad);
  }
}

@Service("teams-collaboration")
export class TeamsCollaboration {
  private readonly tokenProvider: M365TokenProvider;

  constructor(ctx: Context, m365TokenProvider: M365TokenProvider) {
    this.tokenProvider = m365TokenProvider;
    TelemetryUtils.init(ctx);
  }

  @hooks([addStartAndEndTelemetry(EventName.grantPermission, componentNameTeams)])
  public async grantPermission(
    ctx: Context,
    teamsAppId: string,
    userInfo: AppUser
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      const appStudioTokenRes = await this.tokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      await AppStudioClient.grantPermission(teamsAppId, appStudioToken as string, userInfo);
      const result: ResourcePermission[] = [
        {
          name: Constants.PERMISSIONS.name,
          roles: [Constants.PERMISSIONS.admin],
          type: Constants.PERMISSIONS.type,
          resourceId: teamsAppId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx));
    }
  }

  @hooks([addStartAndEndTelemetry(EventName.listCollaborator, componentNameTeams)])
  public async listCollaborator(
    ctx: Context,
    teamsAppId: string
  ): Promise<Result<TeamsAppAdmin[], FxError>> {
    try {
      const appStudioTokenRes = await this.tokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      const userLists = await AppStudioClient.getUserList(teamsAppId, appStudioToken as string);
      if (!userLists) {
        return ok([]);
      }

      const teamsAppAdmin: TeamsAppAdmin[] = userLists
        .filter((userList) => {
          return userList.isAdministrator;
        })
        .map((userList) => {
          return {
            userObjectId: userList.aadId,
            displayName: userList.displayName,
            userPrincipalName: userList.userPrincipalName,
            resourceId: teamsAppId,
          };
        });

      return ok(teamsAppAdmin);
    } catch (error) {
      return err(this.handleError(error, ctx));
    }
  }

  @hooks([addStartAndEndTelemetry(EventName.checkPermission, componentNameTeams)])
  public async checkPermission(
    ctx: Context,
    teamsAppId: string,
    userInfo: AppUser
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      const appStudioTokenRes = await this.tokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      const teamsAppRoles = await AppStudioClient.checkPermission(
        teamsAppId,
        appStudioToken as string,
        userInfo.aadId
      );

      const result: ResourcePermission[] = [
        {
          name: Constants.PERMISSIONS.name,
          roles: [teamsAppRoles as string],
          type: Constants.PERMISSIONS.type,
          resourceId: teamsAppId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx));
    }
  }

  private handleError(error: any, ctx: Context): FxError {
    if (error.innerError) {
      const message = JSON.stringify(error.innerError.response.data);
      ctx.logProvider?.error(message);
      const fxError =
        error.innerError.response.status &&
        error.innerError.response.status >= 400 &&
        error.innerError.response.status < 500
          ? new HttpClientError(componentNameTeams, message)
          : new HttpServerError(componentNameTeams, message);
      return fxError;
    }

    const message = JSON.stringify(error);
    ctx.logProvider?.error(message);
    return new UnhandledError(error as Error, componentNameTeams);
  }
}
