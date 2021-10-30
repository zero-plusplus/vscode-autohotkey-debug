import { SpawnSyncOptions, spawnSync } from 'child_process';
import { getAhkVersion } from './getAhkVersion';

export const getRunningAhkScriptList = (ahkRuntime: string, options?: SpawnSyncOptions): string[] => {
  const version = getAhkVersion(ahkRuntime);
  if (!version) {
    return [];
  }
  const ahkCode = version.mejor <= 1.1
    ? `
      DetectHiddenWindows On
      WinGet idList, List, ahk_class AutoHotkey

      processPathList := ""
      Loop %idList% {
        id := idList%A_Index%
        WinGetTitle title, ahk_id %id%
        if (title ~= "^.+\\\\\\*(?=\\s-)") {
          continue
        }
        RegExMatch(title, "O)(?<path>.+)(?=\\s-)", match)
        processPathList .= match.path "\`n"
      }
      FileOpen("*", "w").write(RTrim(processPathList, "\`n"))
    ` : `
      A_DetectHiddenWindows := true
      idList := WinGetList("ahk_class AutoHotkey")

      processPathList := ""
      for i, id in idList {
        title := WinGetTitle("ahk_id " id)
        if (title ~= "^\\*(?=\\s-)") {
          continue
        }
        RegExMatch(title, "(?<path>.+)(?=\\s-)", &match)
        processPathList .= match.path "\`n"
      }
      FileOpen("*", "w").write(RTrim(processPathList, "\`n"))
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
