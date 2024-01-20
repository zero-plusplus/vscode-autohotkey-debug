import { SpawnSyncOptions, spawnSync } from 'child_process';
import { getAhkVersion } from './AutoHotkeyLuncher';

export const getRunningAhkScriptList = (ahkRuntime: string, options?: SpawnSyncOptions): string[] => {
  const version = getAhkVersion(ahkRuntime);
  if (!version) {
    return [];
  }
  const ahkCode = version.mejor <= 1.1
    ? `
      DetectHiddenWindows On
      WinGetTitle, selfTitle, ahk_id %A_ScriptHwnd%
      WinGet idList, List, ahk_class AutoHotkey

      processPathList := ""
      Loop %idList% {
        id := idList%A_Index%
        WinGetTitle title, ahk_id %id%
        if (selfTitle == title) {
          continue
        }

        RegExMatch(title, "O)^(?<path>.+)(?=\\s-\\sAutoHotkey)", match)
        if (!match) {
          continue
        }
        processPathList .= match.path "\`n"
      }
      FileOpen("*", "w", "CP65001").write(RTrim(processPathList, "\`n"))
    ` : `
      A_DetectHiddenWindows := true
      selfTitle := WinGetTitle("ahk_id " A_ScriptHwnd)
      idList := WinGetList("ahk_class AutoHotkey")

      processPathList := ""
      for i, id in idList {
        title := WinGetTitle("ahk_id " id)
        if (selfTitle == title) {
          continue
        }

        RegExMatch(title, "^(?<path>.+)(?=\\s-\\sAutoHotkey)", &match)
        if (!match) {
          continue
        }
        processPathList .= match.path "\`n"
      }
      FileOpen("*", "w", "CP65001").write(RTrim(processPathList, "\`n"))
    `;
  const result = spawnSync(ahkRuntime, [ '/ErrorStdOut', '*' ], { ...options, input: ahkCode });
  if (result.error) {
    return [];
  }
  const scriptList = result.stdout.toString();
  if (scriptList) {
    return scriptList.split('\n');
  }
  return [];
};
