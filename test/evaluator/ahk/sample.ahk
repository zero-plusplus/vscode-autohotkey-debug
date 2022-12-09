#SingleInstance
#Persistent

str_alpha := "abc"
str_alnum := "abc123"
str_not_alnum := "$$$"
str_upper := "ABC"
num_int := 123
num_int_like := "123"
num_float := 123.456
num_float_like := "123.456"
num_hex := 0x123
num_hex_like := "0x123"
num_scientific_notation := 1.0e4
num_scientific_notation_like := "1.0e4"
key := "key"
obj := { key: "value", "3": "100" }
arr := [ 1, 10, 100 ]
nestedObj := { a: { b: { obj: obj, arr: arr } } }
instance := new T()
class T {
}
return