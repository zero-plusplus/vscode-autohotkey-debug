import * as vscode from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';
import { URI } from 'vscode-uri';
import { unescapeAhk } from './util/VariableManager';

interface VariableContextMenuParam {
  container: DebugProtocol.Scope;
  variable: DebugProtocol.Variable;
}
const removeQuote = (string: string): string => {
  return string.replace(/(^"|"$)/gu, '');
};
const convertToText = (param: VariableContextMenuParam): string => {
  return unescapeAhk(removeQuote(param.variable.value));
};
const convertToBinary = (param: VariableContextMenuParam): string => {
  return Math.ceil(Number(removeQuote(param.variable.value))).toString(2);
};
const convertToDecimal = (param: VariableContextMenuParam): string => {
  return Number(removeQuote(param.variable.value)).toString(10);
};
const convertToHex = (param: VariableContextMenuParam): string => {
  const number = Math.ceil(Number(removeQuote(param.variable.value)));
  return 0 < number ? `0x${number.toString(16)}` : `-0x${number.toString(16).replace(/^-/u, '')}`;
};
const convertToScientificNotation = (param: VariableContextMenuParam): string => {
  return Number(removeQuote(param.variable.value)).toExponential();
};
const showValue = async(text: string): Promise<void> => {
  const uri = URI.parse(`valuepreview:${encodeURI(text)}.ahk`);
  const doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
  await vscode.window.showTextDocument(doc, { preview: true });
};
export const registerCommands = (context: vscode.ExtensionContext): void => {
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('valuepreview', new class implements vscode.TextDocumentContentProvider {
    public readonly onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    public readonly onDidChange = this.onDidChangeEmitter.event;
    public provideTextDocumentContent(uri: vscode.Uri): string {
      return decodeURI(uri.path.replace(/\.ahk/u, ''));
    }
  }()));

  // View
  context.subscriptions.push(vscode.commands.registerCommand('vscode-autohotkey-debug.variables-view.viewValue', async(param: VariableContextMenuParam): Promise<void> => {
    await showValue(param.variable.value);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-autohotkey-debug.variables-view.viewAsText', async(param: VariableContextMenuParam): Promise<void> => {
    await showValue(convertToText(param));
  }));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-autohotkey-debug.variables-view.ViewAsEachBaseNumbers', async(param: VariableContextMenuParam): Promise<void> => {
    const text = [
      `[Binary]`,
      convertToBinary(param),
      '',
      `[Decimal]`,
      convertToDecimal(param),
      '',
      `[Hex]`,
      convertToHex(param),
      '',
      `[Scientific Notation]`,
      convertToScientificNotation(param),
    ].join('\n');
    await showValue(text);
  }));

  // Copy
  context.subscriptions.push(vscode.commands.registerCommand('vscode-autohotkey-debug.variables-view.copyAsText', async(param: VariableContextMenuParam): Promise<void> => {
    const text = convertToText(param);
    await vscode.env.clipboard.writeText(text);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-autohotkey-debug.variables-view.copyAsDecimal', async(param: VariableContextMenuParam): Promise<void> => {
    const decimal = convertToDecimal(param);
    await vscode.env.clipboard.writeText(decimal);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-autohotkey-debug.variables-view.copyAsBinary', async(param: VariableContextMenuParam): Promise<void> => {
    const binary = convertToBinary(param);
    await vscode.env.clipboard.writeText(binary);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-autohotkey-debug.variables-view.copyAsHex', async(param: VariableContextMenuParam): Promise<void> => {
    const hex = convertToHex(param);
    await vscode.env.clipboard.writeText(hex);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('vscode-autohotkey-debug.variables-view.copyAsScientificNotation', async(param: VariableContextMenuParam): Promise<void> => {
    const scientificNotation = convertToScientificNotation(param);
    await vscode.env.clipboard.writeText(scientificNotation);
  }));
};
