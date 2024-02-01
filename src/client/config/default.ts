import { defaultAutoHotkeyInstallDir } from '../../tools/autohotkey';
import { NormalizedDebugConfig } from '../../types/dap/config';

export const createDefaultLauncherConfig = (program: string): NormalizedDebugConfig => {
  return {
    name: 'AutoHotkey Debug',
    type: 'autohotkey',
    request: 'launch',
    stopOnEntry: false,
    skipFunctions: [],
    skipFiles: [],
    trace: false,

    runtime: defaultAutoHotkeyInstallDir,
    runtimeArgs: [],
    program,
    args: [],
    port: 9002,
    hostname: 'localhost',
    noDebug: false,
    cwd: undefined,
    env: undefined,

    openFileOnExit: undefined,
    variableCategories: undefined,
    setBreakpoints: [],

    maxChildren: 10000,

    usePerfTips: false,
    useIntelliSenseInDebugging: true,
    useDebugDirective: false,
    useAutoJumpToError: false,
    useUIAVersion: false,
    useOutputDebug: {
      category: 'stderr',
      useTrailingLinebreak: true,
    },
    useAnnounce: 'detail',
    useLoadedScripts: {
      scanImplicitLibrary: true,
    },
  };
};
