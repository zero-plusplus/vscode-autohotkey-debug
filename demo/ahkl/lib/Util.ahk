#Requires AutoHotkey v1.1

RangeArray(count, callback := "") {
  arr := []
  Loop %count% {
    arr.push(IsObject(callback) ? %callback%(A_Index) : A_Index)
  }
  return arr
}
class Clazz extends ClazzBase {
  field := "instance field"
  static staticField := "static field"

  _property_baking := "property"
  property {
    get {
      return this._property_baking
    }
    set {
      return this._property_baking := value
    }
  }

  method() {
    FileAppend Called method!`n, *
  }
}
class ClazzBase {
  baseField := "base field"
}
