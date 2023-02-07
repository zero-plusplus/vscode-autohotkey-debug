global key := "key"
global obj := { a: { b: { c: { ddd: "value1"
                             , eee: "value2" } } }
              , key: { nest: "value" } }
global arr := [ obj ]
instance := new T()

class T extends TBase {
  static staticField1 := "value"
  static staticField2 := obj
  _property_baking := arr
  property[] {
      get {
          return this._property_baking
      }
      set {
          return this._property_baking := value
      }
  }
  instanceField1 := "value"
  instanceField2 := obj
  method() {
    FileAppend Called method!`n, *
  }
}
class TBase {
  baseInstanceField := obj
}
