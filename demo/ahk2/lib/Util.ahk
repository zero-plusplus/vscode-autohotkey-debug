#Requires AutoHotkey v2.0+

RangeArray(count, callback?) {
  arr := []
  Loop count {
    arr.push(IsSet(callback) ? callback(A_Index) : A_Index)
  }
  return arr
}
class Clazz extends ClazzBase {
  field := 'instance field'
  static staticField := 'static field'

  _property_baking := 'property'
  property {
    get {
      return this._property_baking
    }
    set {
      return this._property_baking := value
    }
  }
  static staticProperty_baking := 'static property'
  static staticProperty {
    get {
      return this.staticProperty_baking
    }
    set {
      return this.staticProperty_baking := value
    }
  }

  method() {
    FileAppend('Called method!`n', '*')
  }
  static staticMethod() {
    FileAppend('Called static method!`n', '*')
  }
}
class ClazzBase {
  baseField := 'base field'
  static baseField := 'base field'

  _baseProperty_baking := 'base property'
  baseProperty {
    get {
      return this._baseProperty_baking
    }
    set {
      return this._baseProperty_baking := value
    }
  }
  static staticBaseProperty_baking := 'static base property'
  static staticBaseProperty {
    get {
      return this.staticBaseProperty_baking
    }
    set {
      return this.staticBaseProperty_baking := value
    }
  }

  baseMethod() {
    FileAppend('Called base method!`n', '*')
  }
  static staticBaseMethod() {
    FileAppend('Called static base method!`n', '*')
  }
}
