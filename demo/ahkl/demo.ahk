#Requires AutoHotkey v1.1
#SingleInstance Force
#Warn All, StdOut

#Include <Util>

globalVar := "global"
global superGlobalVar := "super global"

demo()
demo() {
  static staticVar := "static"

  ; Overwrite global var
  globalVar := "shadowing"
  superGlobalVar := "overwrite"

  ; Primitives
  str_empty := ""
  str := "string"
  str_multiline := "
  (LTrim
    line 1
    line 2
    line 3
  )"
  str_int_like := "123"
  str_float_like := "123.456"
  str_scientificNotation_like := "1.0e5"

  num_int := 123
  num_int_negative := -123
  num_float := 123.456
  num_float_negative := -123.456
  num_hex := 0x123
  num_hex_negative := -0x123
  num_scientificNotation := 1.0e5

  bool_true := true
  bool_false := false

  ; Objects
  arr_empty := []
  arr := [ str, num_int, RangeArray(1000) ]
  arr_large := RangeArray(10000)
  arr_large_nested := RangeArray(1000, Func("RangeArray").bind(150))
  arr_like := RangeArray(1000)
  arr_like.size := arr_like.length()
  arr_sparse := { 1: str, 9000: num_int }

  obj_empty := {}
  obj := { str: str, int: num_int, arr: arr }
  obj_specialkey := { [1, 2, 3]: "value", "spaced key": "value2"}

  circular := {}
  circular.circular := circular

  instance := new Clazz()
  instance.property := "overwrite"
  instance.method()
}
