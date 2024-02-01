import * as vscode from 'vscode';
import { debugConfigSubscribers } from './subscriptions/config';
import { debugAdapterSubscriber } from './subscriptions/adapter';

export const activate = (context: vscode.ExtensionContext): void => {
  context.subscriptions.push(debugAdapterSubscriber);
  context.subscriptions.push(...debugConfigSubscribers);
};
