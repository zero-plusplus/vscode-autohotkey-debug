#SingleInstance Force
#Warn All, StdOut
globalVar := "Global"
global SuperGlobalVar := "SuperGlobal"

demo()
demo()
{
    static staticVar := "Static"

    ; Overwrite global var
    globalVar := "Local"
    SuperGlobalVar := "Local"

    ; Primitives
    str_empty := ""
    str := "string"
    str_multiline := "
    (LTrim
        line 1
        line 2
        line 3
    )"
    int := 123
    int_negative := -123
    float := 123.456
    float_negative := -123.456
    hex := 0x123
    hex_negative := -0x123
    scientificNotation := 1.0e5
    bool_true := true
    bool_false := false

    ; Objects
    arr_empty := []
    arr := [str, int]
    arr_big := Util_CreateBigArray()
    arr_like := { 1: str, 2: int, size: 2}
    arr_sparse := { 1: str, 3: int }

    obj_empty := {}
    obj := { str: str, int: int, arr: arr }
    obj_specialkey := { [1, 2, 3]: "value", "spaced key": "value2"}

    circular := {}
    circular.circular := circular
    instance := new Clazz()
    instance.property := "overwrite"
    instance.method()
}
class Clazz
{
    static field_static := "static field"
    field_instance := "instance field"
    static _field_baking := "baking field"
    property[] {
        get {
            return this._field_baking
        }
        set {
            return this._field_baking := value
        }
    }
    method()
    {
        FileAppend Called method!`n, *
    }
}