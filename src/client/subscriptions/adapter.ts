import * as vscode from 'vscode';
import { DebugAdapterDescriptor, DebugAdapterDescriptorFactory, DebugAdapterInlineImplementation, DebugSession, ProviderResult } from 'vscode';
import { AutoHotkeyDebugAdapter } from '../../dap/adapter/adapter';

const createInlineAutoHotkeyDebugAdapterFactory: DebugAdapterDescriptorFactory = {
  createDebugAdapterDescriptor(_session: DebugSession): ProviderResult<DebugAdapterDescriptor> {
    return new DebugAdapterInlineImplementation(new AutoHotkeyDebugAdapter());
  },
};
export const debugAdapterSubscriber: vscode.Disposable = vscode.debug.registerDebugAdapterDescriptorFactory('autohotkey', createInlineAutoHotkeyDebugAdapterFactory);
