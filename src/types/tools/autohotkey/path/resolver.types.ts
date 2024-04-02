export const supportedAutoHotkeyEnvironments_v1 = [
  'A_AhkPath',
  'A_AppData',
  'A_AppDataCommon',
  'A_ComputerName',
  'A_ComSpec',
  'A_Desktop',
  'A_DesktopCommon',
  'A_IsCompiled',
  'A_IsUnicode',
  'A_LineFile',
  'A_MyDocuments',
  'A_ProgramFiles',
  'A_Programs',
  'A_ProgramsCommon',
  'A_ScriptDir',
  'A_ScriptFullPath',
  'A_ScriptName',
  'A_Space',
  'A_StartMenu',
  'A_StartMenuCommon',
  'A_Startup',
  'A_StartupCommon',
  'A_Tab',
  'A_Temp',
  'A_UserName',
  'A_WinDir',
] as const;
export const supportedAutoHotkeyEnvironments_v2 = [
  'A_AhkPath',
  'A_AppData',
  'A_AppDataCommon',
  'A_ComputerName',
  'A_ComSpec',
  'A_Desktop',
  'A_DesktopCommon',
  'A_IsCompiled',
  'A_LineFile',
  'A_MyDocuments',
  'A_ProgramFiles',
  'A_Programs',
  'A_ProgramsCommon',
  'A_ScriptDir',
  'A_ScriptFullPath',
  'A_ScriptName',
  'A_Space',
  'A_StartMenu',
  'A_StartMenuCommon',
  'A_Startup',
  'A_StartupCommon',
  'A_Tab',
  'A_Temp',
  'A_UserName',
  'A_WinDir',
] as const;

export type AutoHotkeyEnvironmentName = typeof supportedAutoHotkeyEnvironments_v1[number] | typeof supportedAutoHotkeyEnvironments_v2[number];
export type AutoHotkeyEnvironments =
  | AutoHotkeyEnvironments_v1
  | AutoHotkeyEnvironments_v2;
export type AutoHotkeyEnvironments_v1 = Record<typeof supportedAutoHotkeyEnvironments_v1[number], string>;
export type AutoHotkeyEnvironments_v2 = Record<typeof supportedAutoHotkeyEnvironments_v2[number], string>;
export type PartialedAutoHotkeyEnvironments =
  | PartialedAutoHotkeyEnvironments_v1
  | PartialedAutoHotkeyEnvironments_v2;
export type PartialedAutoHotkeyEnvironments_v1 = Partial<Record<typeof supportedAutoHotkeyEnvironments_v1[number], string>>;
export type PartialedAutoHotkeyEnvironments_v2 = Partial<Record<typeof supportedAutoHotkeyEnvironments_v2[number], string>>;
