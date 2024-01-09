﻿#SingleInstance
#Persistent

abc := "abc"
a := "a"
c := "c"

null := ""
str_alpha := "aBc"
str_alnum := "aBc123"
str_not_alnum := "$$$"
str_upper := "ABC"
str_lower := "abc"
str_time := "01 Jan 1970 00:00:00 GMT"
str_space := " "
num_int := 123
num_int_like := "3"
num_float := 123.456
num_float_like := "123.456"
num_hex := 0x123
num_hex_like := "0x123"
num_scientific_notation := 1.0e4
num_scientific_notation_like := "1.0e4"
bool_true := true
bool_false := false

key := "key"
obj := { key: "value" }
arr := [ 1, 10, 100 ]
arr_like := { 1: 1, 2: 10, 3: 100, size: 3 }
nestedObj := { a: { b: { key: "value", obj: obj, arr: arr } } }
instance := new T()
circular := {}
circular.circular := circular

num_prefix_unary := 0
num_postfix_unary := 0
str_reassign := ""
num_reassign := 0

; #region tests
testResults := {}
; #region ObjHasKey
testResults["ObjHasKey(obj, ""key"")"] := ObjHasKey(obj, "key")
testResults["ObjHasKey(obj, key)"] := ObjHasKey(obj, key)
testResults["ObjHasKey(arr, 1)"] := ObjHasKey(arr, 1)
testResults["ObjHasKey(T, ""staticField"")"] := ObjHasKey(T, "staticField")
testResults["ObjHasKey(T, ""method"")"] := ObjHasKey(T, "method")
testResults["instance.instanceField && ObjHasKey(instance, ""instanceField"")"] := instance.instanceField && ObjHasKey(instance, "instanceField")
testResults["instance.baseInstanceField && ObjHasKey(instance, ""baseInstanceField"")"] := instance.baseInstanceField && ObjHasKey(instance, "baseInstanceField")

testResults["!(instance.method && ObjHasKey(instance, ""method""))"] := !(instance.method && ObjHasKey(instance, "method"))
testResults["!ObjHasKey(obj, ""unknown"")"] := !ObjHasKey(obj, str_alpha)
; #endregion ObjHasKey

; #region IsSet
testResults["IsSet(str_alpha)"] := IsSet(str_alpha)
testResults["IsSet(obj)"] := IsSet(obj)
testResults["IsSet(T)"] := IsSet(T)

testResults["!IsSet(undefined)"] := !IsSet(undefined)
; #endregion IsSet

; #region IsObject
testResults["IsObject(obj)"] := IsObject(obj)
testResults["IsObject(T)"] := IsObject(T)

testResults["!IsObject(str_alpha)"] := !IsObject(str_alpha)
testResults["!IsObject(num_int)"] := !IsObject(num_int)
testResults["!IsObject(undefined)"] := !IsObject(undefined)
; #endregion IsObject

; #region ObjGetBase
testResults["ObjGetBase(obj)"] := ObjGetBase(obj)
testResults["ObjGetBase(T)"] := ObjGetBase(T)
testResults["ObjGetBase(T2)"] := ObjGetBase(T2)

; testResults["ObjGetBase(str_alpha)"] := ObjGetBase(str_alpha) ; Error:  Parameter #1 invalid.
; testResults["ObjGetBase(num_int)"] := ObjGetBase(num_int) ; Error:  Parameter #1 invalid.
; testResults["ObjGetBase(undefined)"] := ObjGetBase(undefined) ; Error:  Parameter #1 invalid.
; #endregion ObjGetBase

; #region ObjCount
testResults["ObjCount(obj)"] := ObjCount(obj)
testResults["ObjCount(arr)"] := ObjCount(arr)
testResults["ObjCount(arr_like)"] := ObjCount(arr_like)
testResults["ObjCount(T)"] := ObjCount(T)
testResults["ObjCount(T2)"] := ObjCount(T2)

testResults["ObjCount(str_alpha)"] := ObjCount(str_alpha)
testResults["ObjCount(num_int)"] := ObjCount(num_int)
testResults["ObjCount(undefined)"] := ObjCount(undefined)
; #endregion ObjCount

; #region Math
for i, funcName in [ "Abs", "Ceil", "Exp", "Floor", "Log", "Ln", "Round", "Sqrt", "Sin", "Cos", "Tan", "ASin", "ACos", "ATan" ] {
  testResults[funcName . "(0)"] := %funcName%(0)
  testResults[funcName . "(3)"] := %funcName%(3)
  testResults[funcName . "(-3)"] := %funcName%(-3)
  testResults[funcName . "(1.23)"] := %funcName%(1.23)
  testResults[funcName . "(-1.23)"] := %funcName%(-1.23)
  testResults[funcName . "(num_int_like)"] := %funcName%(num_int_like)
  testResults[funcName . "(str_alpha)"] := %funcName%(str_alpha)
  testResults[funcName . "(obj)"] := %funcName%(obj)
}

; #region Max, Min
for i, funcName in [ "Max", "Min" ] {
  testResults[funcName . "(1, ""2"", 3)"] := %funcName%(1, "2", 3)
  testResults[funcName . "(""a"", ""b"", ""c"")"] := %funcName%("a", "b", "c")
  testResults[funcName . "(""1"", ""b"", ""c"")"] := %funcName%("1", "b", "c")
}
; #endregion Max, Min

; #region Mod
testResults["Mod(7.5, ""2"")"] := Mod(7.5, "2")
testResults["Mod(2, ""b"")"] := Mod(2, "b")
; #endregion Mod
; #endregion Math

; #region StrLen
testResults["StrLen(str_alpha)"] := StrLen(str_alpha)
testResults["StrLen(num_int)"] := StrLen(num_int)
testResults["StrLen(num_hex)"] := StrLen(num_hex)
testResults["StrLen(obj)"] := StrLen(obj)
; #endregion StrLen

; #region InStr
; testResults["InStr(""abc"", ""B"")"] := InStr("abc", "b")
; testResults["InStr(""abc"", ""B"", false)"] := InStr("abc", "b", false)
; testResults["InStr(""abc"", ""b"", true)"] := InStr("abc", "b", true)
; testResults["InStr(""abc"", ""b"", ""true"")"] := InStr("abc", "b", "true")
; testResults["InStr(""abcabc"", ""b"", true, 3)"] := InStr("abcabc", "b", true, 3)
; testResults["InStr(""abcabc"", ""b"", true, 1, 2)"] := InStr("abcabc", "b", true, 1, 2)
; testResults["InStr(""abcabc"", ""b"", true, -2, 1)"] := InStr("abcabc", "b", true, -2, 1)
; #endregion InStr
; #endregion tests

class T extends T2 {
  static staticField := "static"
  instanceField := "instance"
  method() {
  }
}
class T2 {
  baseInstanceField := "base"
  baseMethod() {
  }
}
return