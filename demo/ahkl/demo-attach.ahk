#Requires AutoHotkey v1.1
#SingleInstance, Force
#Persistent

SetTimer LoopFn, 1000
return

LoopFn() {
  a := ""
  b := ""
  c := ""
  FileAppend, stdout`n, *
  FileAppend, stderr`n, **
  OutputDebug outputdebug`n
}
