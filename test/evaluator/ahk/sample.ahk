#SingleInstance
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
num_int_like := "123"
num_float := 123.456
num_float_like := "123.456"
num_hex := 0x123
num_hex_like := "0x123"
num_scientific_notation := 1.0e4
num_scientific_notation_like := "1.0e4"
bool_true := true
bool_false := false

key := "key"
obj := { key: "value", "3": "100" }
arr := [ 1, 10, 100 ]
nestedObj := { a: { b: { key: "value", obj: obj, arr: arr } } }
instance := new T()

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
testResults["!ObjHasKey(str_alpha, str_alpha)"] := !ObjHasKey(str_alpha, str_alpha)
; #endregion ObjHasKey
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