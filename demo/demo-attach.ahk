#SingleInstance, Force
#Persistent

SetTimer LoopFn, 1000
LoopFn() {
  a := ""
  b := ""
  c := ""
  FileAppend, stdout`n, *
  FileAppend, stderr`n, **
  OutputDebug outputdebug`n
}