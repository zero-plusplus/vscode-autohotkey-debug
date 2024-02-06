import { spawnSync } from 'child_process';
import { defaultHostName, defaultPort, escapePcreRegExEscape, evaluateAhkVersion } from './';

export const attachAutoHotkeyScript = (runtime: string, program: string, hostname = defaultHostName, port = defaultPort): boolean => {
  const version = evaluateAhkVersion(runtime);
  if (!version) {
    return false;
  }

  const ahkCode = version.mejor <= 1.1 ? `
    DetectHiddenWindows On
    SetTitleMatchMode RegEx
    if (WinExist("i)${escapePcreRegExEscape(program)} ahk_class AutoHotkey")) {
      PostMessage DllCall("RegisterWindowMessage", "Str", "AHK_ATTACH_DEBUGGER"), DllCall("ws2_32\\inet_addr", "astr", "${hostname}"), ${port}
      ExitApp
    }
    ExitApp 1
  ` : `
    A_DetectHiddenWindows := true
    SetTitleMatchMode("RegEx")
    if WinExist("i)${escapePcreRegExEscape(program)} ahk_class AutoHotkey") {
      PostMessage DllCall("RegisterWindowMessage",  "Str", "AHK_ATTACH_DEBUGGER"), DllCall("ws2_32\\inet_addr", "astr", "${hostname}"), ${port}
      ExitApp
    }
    ExitApp(1)
  `;
  const result = spawnSync(runtime, [ '/ErrorStdOut', '/CP65001', '*' ], { input: ahkCode });
  if (result.error) {
    return false;
  }
  return true;
};
