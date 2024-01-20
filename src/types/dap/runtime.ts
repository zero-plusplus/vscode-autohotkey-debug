
export type LaunchType = 'launch' | 'attach';
export interface ScriptRuntime {
  config: ScriptLauncherConfig;
  launch: (config: OptionalLauncherConfig) => this;
  toLaunchCommand: () => string;
  on: (event: string, listener: () => void) => void;
  terminate: () => void;
}


export interface ScriptRuntime {
  config: Config;
}