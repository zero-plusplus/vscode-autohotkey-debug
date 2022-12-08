#SingleInstance
#Persistent

str := "abc"
num := 123
num_like := "123"
key := "key"
obj := { key: "value", "3": "100" }
arr := [ 1, 10, 100 ]
nestedObj := { a: { b: { obj: obj, arr: arr } } }
instance := new T()
class T {
}
return