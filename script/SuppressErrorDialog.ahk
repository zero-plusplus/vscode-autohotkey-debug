/**
 * @licence MIT <http://opensource.org/licenses/mit-license.php>
 * @auther zero-plusplus
 * @link https://gist.github.com/zero-plusplus/107d88903f8cb869d3a1600db51b7b0a
 */
#ErrorStdOut, UTF-8
/**
 * Suppresses run-time error dialogs and instead outputs their contents to standard output.
 *
 * @param {boolean} [enable := true]
 * @example
 *  #Include <SuppressErrorDialog>
 *
 *  ; Just include it and it will work
 *  throw Exception("Some error") ; Output to standard output instead message box
 *
 *  SuppressErrorDialog(false)
 *  throw Exception("Some error") ; The error is displayed in the message box as usual
 */
SuppressErrorDialog(enable := true) {
  static _init_ := SuppressErrorDialog()

  OnError("SuppressErrorDialog_OnError", enable)
}
SuppressErrorDialog_OnError(exception) {
  static ERROR_CODE := 2

  if (!IsObject(exception)) {
    exception := Exception(exception, -1)
  }

  message := Format("{} ({}) : ==> {}", exception.file, exception.line, exception.message)
  if (exception.extra) {
    message .= "`n     Specifically: " . exception.extra
  }

  stacks := SuppressErrorDialog_CallStack()
  if (0 < stacks.length()) {
    message .= "`n`n[Call Stack]"
    for i, stack in stacks {
      message .= Format("`n> {}:{} : [{}]", stack.file, stack.line, stack.what)
    }
  }

  OutputDebug, %message%`n
  ExitApp, %ERROR_CODE%
}
SuppressErrorDialog_CallStack()
{
  stacks := []

  startFrame := 2
  while (true) {
    e := Exception("", -(startFrame + (A_Index - 1)))
    if ((e.what + 0) != "") {
      break
    }

    stacks.push(e)
  }

  ; The what properties are off by one, unlike the actual stack properties (v2 only properties), so fix them here
  if (0 < stacks.length()) {
    for i, stack in stacks {
      if (i + 1 <= stacks.length()) {
        nextStack := stacks[i + 1]
        stack.what := nextStack.what
      }
    }
    stacks[stacks.length()].what := "Auto-execute"
  }
  return stacks
}