// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { expect } from "chai";
import * as sinon from "sinon";
import { stubInterface } from "ts-sinon";
import {
  commands,
  Disposable,
  ExtensionContext,
  QuickInputButton,
  QuickPick,
  Terminal,
  TextDocument,
  window,
  workspace,
} from "vscode";

import {
  err,
  FxError,
  InputResult,
  ok,
  Result,
  SelectFileConfig,
  SelectFileResult,
  SelectFolderConfig,
  SingleFileOrInputConfig,
  SingleSelectConfig,
  UserError,
} from "@microsoft/teamsfx-api";
import { UserCancelError } from "@microsoft/teamsfx-core";
import { FxQuickPickItem, VsCodeUI } from "../../../src/qm/vsc_ui";
import { ExtTelemetry } from "../../../src/telemetry/extTelemetry";
import { sleep } from "../../../src/utils/commonUtils";
import { VsCodeLogProvider } from "../../../src/commonlib/log";

describe("UI Unit Tests", async () => {
  before(() => {
    // Mock user input.
  });

  describe("Manually", () => {
    it("Show Progress 2", async function (this: Mocha.Context) {
      this.timeout(0);
      const VS_CODE_UI = new VsCodeUI(<ExtensionContext>{});
      const handler = VS_CODE_UI.createProgressBar("Test Progress Bar", 3);

      await handler.start("Prepare");
      await sleep(2 * 1000);

      await handler.next("First step");
      await sleep(2 * 1000);

      await handler.next("Second step");
      await sleep(2 * 1000);

      await handler.next("Third step");
      await sleep(2 * 1000);

      await handler.end(true);
    });
  });

  describe("Select Folder", () => {
    it("has returns default folder", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SelectFolderConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        default: "default folder",
      };

      const mockQuickPick = stubInterface<QuickPick<FxQuickPickItem>>();
      const mockDisposable = stubInterface<Disposable>();
      let acceptListener: (e: void) => any;
      mockQuickPick.onDidAccept.callsFake((listener: (e: void) => unknown) => {
        acceptListener = listener;
        return mockDisposable;
      });
      mockQuickPick.onDidHide.callsFake((listener: (e: void) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerButton.callsFake((listener: (e: QuickInputButton) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.show.callsFake(() => {
        mockQuickPick.selectedItems = [{ id: "default" } as FxQuickPickItem];
        acceptListener();
      });
      sinon.stub(window, "createQuickPick").callsFake(() => {
        return mockQuickPick;
      });
      const telemetryStub = sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFolder(config);

      expect(result.isOk()).is.true;
      if (result.isOk()) {
        expect(result.value.result).to.equal("default folder");
      }
      expect(
        telemetryStub.calledOnceWith("select-folder", {
          "selected-option": "default",
        })
      ).is.true;
      sinon.restore();
    });

    it("has returns user cancel", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SelectFolderConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        default: "default folder",
      };

      const mockQuickPick = stubInterface<QuickPick<FxQuickPickItem>>();
      const mockDisposable = stubInterface<Disposable>();
      let acceptListener: (e: void) => any;
      mockQuickPick.onDidAccept.callsFake((listener: (e: void) => unknown) => {
        acceptListener = listener;
        return mockDisposable;
      });
      mockQuickPick.onDidHide.callsFake((listener: (e: void) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerButton.callsFake((listener: (e: QuickInputButton) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.show.callsFake(() => {
        mockQuickPick.selectedItems = [{ id: "browse" } as FxQuickPickItem];
        acceptListener();
      });
      sinon.stub(window, "createQuickPick").callsFake(() => {
        return mockQuickPick;
      });
      sinon.stub(window, "showOpenDialog").resolves(undefined);
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFolder(config);

      expect(result.isErr()).is.true;
      if (result.isErr()) {
        expect(result.error instanceof UserCancelError).is.true;
      }
      sinon.restore();
    });
  });

  describe("Select File", () => {
    it("has returns default file", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SelectFileConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        default: "default file",
      };

      const mockQuickPick = stubInterface<QuickPick<FxQuickPickItem>>();
      const mockDisposable = stubInterface<Disposable>();
      let acceptListener: (e: void) => any;
      mockQuickPick.onDidAccept.callsFake((listener: (e: void) => unknown) => {
        acceptListener = listener;
        return mockDisposable;
      });
      mockQuickPick.onDidHide.callsFake((listener: (e: void) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerButton.callsFake((listener: (e: QuickInputButton) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.show.callsFake(() => {
        mockQuickPick.selectedItems = [{ id: "default" } as FxQuickPickItem];
        acceptListener();
      });
      sinon.stub(window, "createQuickPick").callsFake(() => {
        return mockQuickPick;
      });
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFile(config);

      expect(result.isOk()).is.true;
      if (result.isOk()) {
        expect(result.value.result).to.equal("default file");
      }
      sinon.restore();
    });

    it("has returns user cancel", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SelectFileConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        default: "default folder",
      };

      const mockQuickPick = stubInterface<QuickPick<FxQuickPickItem>>();
      const mockDisposable = stubInterface<Disposable>();
      let acceptListener: (e: void) => any;
      mockQuickPick.onDidAccept.callsFake((listener: (e: void) => unknown) => {
        acceptListener = listener;
        return mockDisposable;
      });
      mockQuickPick.onDidHide.callsFake((listener: (e: void) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerButton.callsFake((listener: (e: QuickInputButton) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.show.callsFake(() => {
        mockQuickPick.selectedItems = [{ id: "browse" } as FxQuickPickItem];
        acceptListener();
      });
      sinon.stub(window, "createQuickPick").callsFake(() => {
        return mockQuickPick;
      });
      sinon.stub(window, "showOpenDialog").resolves(undefined);
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFile(config);

      expect(result.isErr()).is.true;
      if (result.isErr()) {
        expect(result.error instanceof UserCancelError).is.true;
      }
      sinon.restore();
    });

    it("has returns item in possible files", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SelectFileConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        default: "default folder",
        possibleFiles: [
          {
            id: "1",
            label: "1",
          },
          {
            id: "2",
            label: "2",
          },
        ],
      };

      const mockQuickPick = stubInterface<QuickPick<FxQuickPickItem>>();
      const mockDisposable = stubInterface<Disposable>();
      let acceptListener: (e: void) => any;
      mockQuickPick.onDidAccept.callsFake((listener: (e: void) => unknown) => {
        acceptListener = listener;
        return mockDisposable;
      });
      mockQuickPick.onDidHide.callsFake((listener: (e: void) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerButton.callsFake((listener: (e: QuickInputButton) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.show.callsFake(() => {
        mockQuickPick.selectedItems = [{ id: "1" } as FxQuickPickItem];
        acceptListener();
      });
      sinon.stub(window, "createQuickPick").callsFake(() => {
        return mockQuickPick;
      });
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFile(config);

      expect(result.isOk()).is.true;
      if (result.isOk()) {
        expect(result.value.result).to.equal("1");
      }
      sinon.restore();
    });

    it("has returns invalid input item id", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SelectFileConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        default: "default",
        possibleFiles: [
          {
            id: "default",
            label: "default",
          },
        ],
      };

      const result = await ui.selectFile(config);

      expect(result.isErr()).is.true;
      if (result.isErr()) {
        expect(result.error.name).to.equal("InvalidInput");
      }
      sinon.restore();
    });

    it("selects a file which pass validation", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SelectFileConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        default: "default file",
        validation: (input: string) => {
          if (input === "default file") {
            return undefined;
          }
          return "validation failed";
        },
      };

      const mockQuickPick = stubInterface<QuickPick<FxQuickPickItem>>();
      const mockDisposable = stubInterface<Disposable>();
      let acceptListener: (e: void) => any;
      mockQuickPick.onDidAccept.callsFake((listener: (e: void) => unknown) => {
        acceptListener = listener;
        return mockDisposable;
      });
      mockQuickPick.onDidHide.callsFake((listener: (e: void) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerButton.callsFake((listener: (e: QuickInputButton) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.show.callsFake(() => {
        mockQuickPick.selectedItems = [{ id: "default" } as FxQuickPickItem];
        acceptListener();
      });
      sinon.stub(window, "createQuickPick").callsFake(() => {
        return mockQuickPick;
      });

      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const res = await ui.selectFile(config);
      expect(res.isOk()).is.true;

      sinon.restore();
    });

    it("selects a file with error thrown when validating result", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SelectFileConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        default: "default file",
        validation: (input: string) => {
          throw new UserError("source", "name", "", "");
        },
      };

      const mockQuickPick = stubInterface<QuickPick<FxQuickPickItem>>();
      const mockDisposable = stubInterface<Disposable>();
      let acceptListener: (e: void) => any;
      mockQuickPick.onDidAccept.callsFake((listener: (e: void) => unknown) => {
        acceptListener = listener;
        return mockDisposable;
      });
      mockQuickPick.onDidHide.callsFake((listener: (e: void) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerButton.callsFake((listener: (e: QuickInputButton) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.show.callsFake(() => {
        mockQuickPick.selectedItems = [{ id: "default" } as FxQuickPickItem];
        acceptListener();
      });
      sinon.stub(window, "createQuickPick").callsFake(() => {
        return mockQuickPick;
      });

      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const res = await ui.selectFile(config);
      expect(res.isErr()).is.true;

      sinon.restore();
    });
  });

  describe("Open File", () => {
    it("open the preview of Markdown file", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      sinon.stub(workspace, "openTextDocument").resolves({} as TextDocument);
      let executedCommand = "";
      sinon.stub(commands, "executeCommand").callsFake((command: string, ...args: any[]) => {
        executedCommand = command;
        return Promise.resolve();
      });
      const showTextStub = sinon.stub(window, "showTextDocument");

      const result = await ui.openFile("test.md");

      expect(result.isOk()).is.true;
      expect(showTextStub.calledOnce).to.be.false;
      expect(executedCommand).to.equal("markdown.showPreview");
      sinon.restore();
    });
  });

  describe("runCommand", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("runs command successfully", async function (this: Mocha.Context) {
      const timer = sandbox.useFakeTimers();
      const ui = new VsCodeUI(<ExtensionContext>{});
      const mockTerminal = stubInterface<Terminal>();
      const vscodeLogProviderInstance = VsCodeLogProvider.getInstance();
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(vscodeLogProviderInstance, "outputChannel").value({
        name: "name",
        append: (value: string) => {},
        appendLine: (value: string) => {},
        replace: (value: string) => {},
        clear: () => {},
        show: (...params: any[]) => {},
        hide: () => {},
        dispose: () => {},
      });
      sandbox.stub(window, "createTerminal").returns(mockTerminal);

      const runCmd = ui.runCommand({ cmd: "test" });
      await timer.tickAsync(1000);
      const result = await runCmd;

      expect(mockTerminal.show.calledOnce).to.be.true;
      expect(mockTerminal.sendText.calledOnceWithExactly("test")).to.be.true;
      expect(result.isOk()).is.true;
      timer.restore();
    });

    it("runs command timeout", async function (this: Mocha.Context) {
      const timer = sandbox.useFakeTimers();
      const ui = new VsCodeUI(<ExtensionContext>{});
      const mockTerminal = {
        show: sinon.stub(),
        sendText: sinon.stub(),
        processId: new Promise((resolve: (value: string) => void, reject) => {
          const wait = setTimeout(() => {
            clearTimeout(wait);
            resolve("1");
          }, 1000);
        }),
      } as unknown as Terminal;
      const vscodeLogProviderInstance = VsCodeLogProvider.getInstance();
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(vscodeLogProviderInstance, "outputChannel").value({
        name: "name",
        append: (value: string) => {},
        appendLine: (value: string) => {},
        replace: (value: string) => {},
        clear: () => {},
        show: (...params: any[]) => {},
        hide: () => {},
        dispose: () => {},
      });
      sandbox.stub(window, "createTerminal").returns(mockTerminal);

      const runCmd = ui.runCommand({ cmd: "test", timeout: 200 });
      await timer.tickAsync(2000);
      const result = await runCmd;

      expect(result.isErr()).is.true;
      timer.restore();
    });
  });
  describe("single select", () => {
    it("select success with validation", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      let hasRun = false;
      const config: SingleSelectConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        options: [{ id: "1", label: "label1" }],
        validation: (input: string) => {
          if (input === "1") {
            hasRun = true;
            return undefined;
          }
        },
      };

      const mockQuickPick = stubInterface<QuickPick<FxQuickPickItem>>();
      const mockDisposable = stubInterface<Disposable>();
      let acceptListener: (e: void) => any;
      mockQuickPick.onDidAccept.callsFake((listener: (e: void) => unknown) => {
        acceptListener = listener;
        return mockDisposable;
      });
      mockQuickPick.onDidHide.callsFake((listener: (e: void) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerButton.callsFake((listener: (e: QuickInputButton) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerItemButton.callsFake((listener: (e: any) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.show.callsFake(() => {
        mockQuickPick.selectedItems = [{ id: "1" } as FxQuickPickItem];
        acceptListener();
      });
      sinon.stub(window, "createQuickPick").callsFake(() => {
        return mockQuickPick;
      });
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectOption(config);

      expect(result.isOk()).is.true;
      if (result.isOk()) {
        expect(result.value.result).to.equal("1");
      }
      sinon.restore();
    });

    it("select fail with validation", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const hasRun = false;
      const config: SingleSelectConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        options: [{ id: "1", label: "label1" }],
        validation: (input: string) => {
          throw new UserError("name", "source", "msg", "msg");
        },
      };

      const mockQuickPick = stubInterface<QuickPick<FxQuickPickItem>>();
      const mockDisposable = stubInterface<Disposable>();
      let acceptListener: (e: void) => any;
      mockQuickPick.onDidAccept.callsFake((listener: (e: void) => unknown) => {
        acceptListener = listener;
        return mockDisposable;
      });
      mockQuickPick.onDidHide.callsFake((listener: (e: void) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerButton.callsFake((listener: (e: QuickInputButton) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.onDidTriggerItemButton.callsFake((listener: (e: any) => unknown) => {
        return mockDisposable;
      });
      mockQuickPick.show.callsFake(() => {
        mockQuickPick.selectedItems = [{ id: "1" } as FxQuickPickItem];
        acceptListener();
      });
      sinon.stub(window, "createQuickPick").callsFake(() => {
        return mockQuickPick;
      });
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectOption(config);

      expect(result.isErr()).is.true;

      sinon.restore();
    });
  });

  describe("Select local file or input", () => {
    it("selects local file successfully", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SingleFileOrInputConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        inputOptionItem: {
          id: "input",
          label: "input",
        },
        inputBoxConfig: {
          prompt: "prompt",
          title: "title",
          name: "input name",
        },
      };

      sinon
        .stub(VsCodeUI.prototype, "selectFile")
        .resolves(ok({ type: "success", result: "file" }));
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFileOrInput(config);

      expect(result.isOk()).is.true;
      if (result.isOk()) {
        expect(result.value.result).to.equal("file");
      }
      sinon.restore();
    });

    it("selects local file error", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SingleFileOrInputConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        inputOptionItem: {
          id: "input",
          label: "input",
        },
        inputBoxConfig: {
          prompt: "prompt",
          title: "title",
          name: "input name",
        },
      };

      sinon
        .stub(VsCodeUI.prototype, "selectFile")
        .resolves(err(new UserError("source", "name", "msg", "msg")));
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFileOrInput(config);

      expect(result.isErr()).is.true;
      if (result.isErr()) {
        expect(result.error.name).to.equal("name");
      }
      sinon.restore();
    });

    it("inputs a value sucessfully", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SingleFileOrInputConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        inputOptionItem: {
          id: "input",
          label: "input",
        },
        inputBoxConfig: {
          prompt: "prompt",
          title: "title",
          name: "input name",
        },
      };

      sinon
        .stub(VsCodeUI.prototype, "selectFile")
        .resolves(ok({ type: "success", result: "input" }));
      sinon
        .stub(VsCodeUI.prototype, "inputText")
        .resolves(ok({ type: "success", result: "testUrl" }));
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFileOrInput(config);

      expect(result.isOk()).is.true;
      if (result.isOk()) {
        expect(result.value.result).to.equal("testUrl");
      }
      sinon.restore();
    });

    it("inputs a value error", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SingleFileOrInputConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        inputOptionItem: {
          id: "input",
          label: "input",
        },
        inputBoxConfig: {
          prompt: "prompt",
          title: "title",
          name: "input name",
        },
      };

      sinon
        .stub(VsCodeUI.prototype, "selectFile")
        .resolves(ok({ type: "success", result: "input" }));
      sinon
        .stub(VsCodeUI.prototype, "inputText")
        .resolves(err(new UserError("source", "name", "msg", "msg")));
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFileOrInput(config);

      expect(result.isErr()).is.true;
      if (result.isErr()) {
        expect(result.error.name).to.equal("name");
      }
      sinon.restore();
    });

    it("inputs a value back and then sucessfully", async function (this: Mocha.Context) {
      const ui = new VsCodeUI(<ExtensionContext>{});
      const config: SingleFileOrInputConfig = {
        name: "name",
        title: "title",
        placeholder: "placeholder",
        inputOptionItem: {
          id: "input",
          label: "input",
        },
        inputBoxConfig: {
          prompt: "prompt",
          title: "title",
          name: "input name",
        },
      };

      sinon
        .stub(VsCodeUI.prototype, "selectFile")
        .resolves(ok({ type: "success", result: "input" }));
      sinon
        .stub(VsCodeUI.prototype, "inputText")
        .onFirstCall()
        .resolves(ok({ type: "back" }))
        .onSecondCall()
        .resolves(ok({ type: "success", result: "testUrl" }));
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await ui.selectFileOrInput(config);

      expect(result.isOk()).is.true;
      if (result.isOk()) {
        expect(result.value.result).to.equal("testUrl");
      }
      sinon.restore();
    });
  });
});
