import { DebugConfig } from '../../types/dap/config.types';
import * as attributes from './attributes';

export const createDefaultDebugConfig = (program: string): DebugConfig => {
  return {
    name: attributes.name.defaultValue,
    type: attributes.type.defaultValue,
    request: attributes.request.defaultValue,
    stopOnEntry: attributes.stopOnEntry.defaultValue,
    skipFunctions: attributes.skipFunctions.defaultValue,
    skipFiles: attributes.skipFiles.defaultValue,
    trace: attributes.trace.defaultValue,

    runtime: attributes.runtime.defaultValue,
    runtimeArgs: attributes.runtimeArgs.defaultValue,
    program,
    args: attributes.args.defaultValue,
    port: attributes.port.defaultValue,
    hostname: attributes.hostname.defaultValue,
    noDebug: attributes.noDebug.defaultValue,
    cwd: attributes.cwd.defaultValue,
    env: attributes.env.defaultValue,
    maxChildren: 1000,

    openFileOnExit: attributes.openFileOnExit.defaultValue,
    variableCategories: attributes.variableCategories.defaultValue,
    setBreakpoints: attributes.setBreakpoints.defaultValue,

    usePerfTips: attributes.usePerfTips.defaultValue,
    useIntelliSenseInDebugging: attributes.useIntelliSenseInDebugging.defaultValue,
    useDebugDirective: attributes.useDebugDirective.defaultValue,
    useAutoJumpToError: attributes.useAutoJumpToError.defaultValue,
    useUIAVersion: attributes.useUIAVersion.defaultValue,
    useOutputDebug: attributes.useOutputDebug.defaultValue,
    useAnnounce: attributes.useAnnounce.defaultValue,
    useLoadedScripts: attributes.useLoadedScripts.defaultValue,
  };
};
