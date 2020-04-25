import { ExtensionContext, commands, window } from 'vscode';

export const activate = function(context: ExtensionContext): void {
  console.log('Congratulations, your extension "helloworld-sample" is now active!');

  const disposable = commands.registerCommand('vscode-ahk-debug.helloworld', () => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    window.showInformationMessage('Hello World!');
  });

  context.subscriptions.push(disposable);
};
