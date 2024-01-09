import * as vscode from 'vscode';
import { AhkDebugSession, DebugConfig, ExtraFeatures, PerfTipsConfig } from '../../ahkDebug';
import { enableRunToEndOfFunction, setEnableRunToEndOfFunction } from '../../commands';
import { timeoutPromise } from '../../util/util';
import { StackFrame } from '../../util/VariableManager';
import * as dbgp from '../../dbgpSession';
import { sync as pathExistsSync } from 'path-exists';
import { AhkConfigurationProvider } from '../../dap/ConfigurationProvider';

export class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
  public readonly provider: AhkConfigurationProvider;
  public session?: AhkDebugSession;
  constructor(provider: AhkConfigurationProvider) {
    this.provider = provider;
  }
  public createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    const perfTipsDecorationTypes: vscode.TextEditorDecorationType[] = [];
    const extraCommands: ExtraFeatures = {
      init: (session: AhkDebugSession): void => {
        this.session = session;
      },
      async runToEndOfFunctionBreakpoint(behavior): Promise<dbgp.ContinuationResponse | undefined> {
        if (!enableRunToEndOfFunction) {
          return undefined;
        }

        const result = behavior();
        setEnableRunToEndOfFunction(false);
        return result;
      },
      async displayPerfTips(session: AhkDebugSession, stackFrame: StackFrame, config: PerfTipsConfig) {
        if (!session.logEvalutor) {
          return;
        }

        const { source, line } = stackFrame;
        const document = await vscode.workspace.openTextDocument(source.path);
        let line_0base = line - 1;
        if (line_0base === document.lineCount) {
          line_0base--; // I don't know about the details, but if the script stops at the end of the file and it's not a blank line, then line_0base will be the value of `document.lineCount + 1`, so we'll compensate for that
        }

        const { format, fontColor, fontStyle } = config;
        const logDataList = await timeoutPromise(session.logEvalutor.eval(format), 5000);
        if (!logDataList || logDataList.length === 0 || logDataList[0].type === 'object') {
          return;
        }

        const message = String(logDataList[0].value);
        const decorationType = vscode.window.createTextEditorDecorationType({
          after: {
            fontStyle,
            color: fontColor,
            contentText: ` ${message}`,
          },
        });
        perfTipsDecorationTypes.push(decorationType);

        const textLine = document.lineAt(line_0base);
        const startPosition = textLine.range.end;
        const endPosition = new vscode.Position(line_0base, textLine.range.end.character + message.length - 1);
        const decoration = { range: new vscode.Range(startPosition, endPosition) } as vscode.DecorationOptions;

        const editor = await vscode.window.showTextDocument(document);
        if (session.isSessionTerminated) {
          return; // If debugging terminated while the step is running, the decorations may remain display
        }
        editor.setDecorations(decorationType, [ decoration ]);
      },
      clearPerfTips(): void {
        for (const editor of vscode.window.visibleTextEditors) {
          for (const decorationType of perfTipsDecorationTypes) {
            editor.setDecorations(decorationType, []);
          }
        }
      },
      async clearDebugConsole(): Promise<void> {
        // There is a lag between the execution of a command and the console being cleared. This lag can be eliminated by executing the command multiple times.
        await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
        await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
        await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
      },
      async showErrorMessage(message: string): Promise<void> {
        await vscode.window.showErrorMessage(message);
      },
      async jumpToError(errorMessage: string): Promise<boolean> {
        const match = errorMessage.match(/^(?<filePath>.+):(?<line>\d+)(?=\s:\s==>)/u);
        if (!match?.groups) {
          return false;
        }

        const { filePath, line } = match.groups;
        const _line = parseInt(line, 10) - 1;

        const doc = await vscode.workspace.openTextDocument(filePath);
        const lineRange = doc.lineAt(_line).range;
        const lineText = doc.getText(lineRange);
        const leadingSpace = lineText.match(/^(?<space>\s*)/u)?.groups?.space ?? '';
        const trailingSpace = lineText.match(/(?<space>\s+)$/u)?.groups?.space ?? '';
        const startPosition = new vscode.Position(_line, leadingSpace.length);
        const endPosition = new vscode.Position(_line, lineText.length - trailingSpace.length);
        const editor = await vscode.window.showTextDocument(doc, {
          selection: new vscode.Range(startPosition, startPosition),
        });

        const decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: new vscode.ThemeColor('editor.symbolHighlightBackground'),
        });
        const decoration: vscode.DecorationOptions = { range: new vscode.Range(startPosition, endPosition) };
        editor.setDecorations(decorationType, [ decoration ]);
        setTimeout(() => {
          editor.setDecorations(decorationType, []);
        }, 500);

        return true;
      },
      async openFileOnExit(filePath) {
        if (!pathExistsSync(filePath)) {
          await this.showErrorMessage(`File not found. Value of \`openFileOnExit\` in launch.json: \`${filePath}\``);
        }

        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      },
    };

    return new vscode.DebugAdapterInlineImplementation(new AhkDebugSession(this.provider as { config: DebugConfig }, extraCommands));
  }
}
