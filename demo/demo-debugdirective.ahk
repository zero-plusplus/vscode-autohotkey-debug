str := "abc"

label := "obj"
obj := { key: "value" }
arr := [ 1, str, obj ]

; @Debug-Output => {str}
; @Debug-Output => {label}{obj}{arr}{:break:}
a := ""

; @Debug-Output => {:clear:}{:start:}A
; @Debug-Output => {:startCollapsed:}B
; @Debug-Output => C-1
; @Debug-Output => C-2
; @Debug-Output => {:end:}{:end:}
; @Debug-Output => {:break:}
b := ""

; @Debug-ClearConsole
; @Debug-Breakpoint => cleard console!
return