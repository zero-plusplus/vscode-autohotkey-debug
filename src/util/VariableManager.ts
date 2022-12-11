import * as path from 'path';
import * as DebugAdapter from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import { URI } from 'vscode-uri';
import * as dbgp from '../dbgpSession';
import { rtrim } from 'underscore.string';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { isNumberLike, isPrimitive, toArray, toFileUri } from './util';
import { equalsIgnoreCase } from './stringUtils';
import { CategoryData, MatcherData, ScopeSelector } from '../extension';
import { CaseInsensitiveMap } from './CaseInsensitiveMap';
import { AhkDebugSession } from '../ahkDebug';

export const escapeAhk = (str: string, ahkVersion?: AhkVersion): string => {
  return str
    .replace(/"/gu, ahkVersion?.mejor === 2 ? '`"' : '""')
    .replace(/`/gu, '```')
    .replace(/,/gu, '`,')
    .replace(/%/gu, '`%')
    .replace(/;/gu, '`;')
    .replace(/::/gu, '`::')
    .replace(/\r\n/gu, '`r`n')
    .replace(/\n/gu, '`n')
    .replace(/\r/gu, '`r')
    .replace(/[\b]/gu, '`b')
    .replace(/\t/gu, '`t')
    .replace(/\v/gu, '`v')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x07]/gu, '`a')
    .replace(/\f/gu, '`f');
};
export const unescapeAhk = (str: string, ahkVersion?: AhkVersion): string => {
  return str
    .replace(ahkVersion?.mejor === 2 ? /`"/gu : /""/gu, '"')
    .replace(/``/gu, '`')
    .replace(/`,/gu, ',')
    .replace(/`%/gu, '%')
    .replace(/`;/gu, ';')
    .replace(/`::/gu, '::')
    .replace(/`r`n/gu, '\r\n')
    .replace(/`n/gu, '\n')
    .replace(/`r/gu, '\r')
    .replace(/`b/gu, '\b')
    .replace(/`t/gu, '\t')
    .replace(/`v/gu, '\v')
    .replace(/`f/gu, '\f')
    .replace(/`a/gu, '\x07');
};
export const singleToDoubleString = (str: string): string => {
  return str
    .replace(/"/gu, '`"')
    .replace(/`'/gu, `'`);
};
export const formatProperty = (property: dbgp.Property, ahkVersion?: AhkVersion): string => {
  const formatPrimitiveProperty = (property: dbgp.PrimitiveProperty): string => {
    if (property.type === 'string') {
      return `"${escapeAhk(property.value, ahkVersion)}"`;
    }
    else if (property.type === 'undefined') {
      return 'Not initialized';
    }
    return property.value;
  };

  if (property instanceof dbgp.PrimitiveProperty) {
    return formatPrimitiveProperty(property);
  }

  const objectProperty = property as dbgp.ObjectProperty;
  const maxIndex = objectProperty.maxIndex;
  const isArray = objectProperty.isArray;
  let value = isArray
    ? `${objectProperty.className}(${maxIndex!}) [`
    : `${objectProperty.className} {`;

  const children = objectProperty.children.slice(0, 100).filter((property) => property.name !== '<base>');
  for (const child of children) {
    const displayValue = child instanceof dbgp.PrimitiveProperty
      ? formatPrimitiveProperty(child)
      : (child as dbgp.ObjectProperty).className;

    const objectChild = child as dbgp.ObjectProperty;
    if (objectProperty.isArray) {
      if (!objectChild.isIndexKey) {
        continue;
      }

      value += `${displayValue}, `;
      continue;
    }

    const key = objectChild.isIndexKey
      ? String(objectChild.index)
      : objectChild.name;
    value += `${key}: ${displayValue}, `;
  }

  if (children.length === 100) {
    value += '…';
  }

  value = rtrim(value, ', ');
  value += isArray ? ']' : '}';
  return value;
};
export const isComObject = (property: dbgp.ObjectProperty): boolean => {
  const comPropertyInfos = [
    [ 'Value', 'integer' ],
    [ 'VarType', 'integer' ],
    [ 'DispatchType', 'string' ],
    [ 'DispatchIID', 'string' ],
  ];

  if (property.children.length !== 4) {
    return false;
  }
  for (const comPropertyInfo of comPropertyInfos) {
    const [ expectedName, expectedType ] = comPropertyInfo;
    const comProperty = property.children.find((child) => child.name === expectedName);
    if (!comProperty) {
      return false;
    }
    if (comProperty.type !== expectedType) {
      return false;
    }
  }
  return true;
};

const handles = new DebugAdapter.Handles();

export type StackFrames = StackFrame[] & { isIdleMode?: boolean };
export class StackFrame implements DebugProtocol.StackFrame {
  public readonly dbgpStackFrame: dbgp.StackFrame;
  public readonly id: number;
  public readonly source: DebugAdapter.Source;
  public readonly line: number;
  public readonly name: string;
  public readonly column = 1;
  public readonly session: dbgp.Session;
  constructor(session: dbgp.Session, dbgpStackFrame: dbgp.StackFrame) {
    this.dbgpStackFrame = dbgpStackFrame;
    this.id = handles.create(this);
    this.name = dbgpStackFrame.name;
    this.line = dbgpStackFrame.line;
    const filePath = URI.parse(toFileUri(dbgpStackFrame.fileUri)).fsPath;
    this.source = new DebugAdapter.Source(path.basename(filePath), filePath);

    this.session = session;
  }
}

export class Scope implements DebugAdapter.Scope {
  public readonly session: dbgp.Session;
  public readonly context: dbgp.Context;
  public readonly name: string;
  public readonly variablesReference: number;
  public readonly expensive: boolean;
  public children?: Variable[];
  constructor(session: dbgp.Session, context: dbgp.Context, expensive = false) {
    this.session = session;
    this.context = context;
    this.name = context.name;
    this.variablesReference = handles.create(this);
    this.expensive = expensive;
  }
  public async loadChildren(maxDepth?: number): Promise<Variable[]> {
    this.children = await this.createChildren(maxDepth);
    return this.children;
  }
  public async createChildren(maxDepth?: number): Promise<Variable[]> {
    if (!maxDepth && this.children) {
      return this.children;
    }

    const { properties } = await this.session.sendContextGetCommand(this.context, maxDepth);
    return properties.map((property) => {
      return new Variable(this.session, property);
    });
  }
}
export type CategoryMatcher = (variable: Variable) => boolean;
export class Category implements Scope {
  public readonly scopes: Scope[];
  public readonly categoryData: CategoryData;
  public readonly allCategoriesData: CategoryData[];
  public readonly categoryMatcher: CategoryMatcher;
  public readonly variablesReference: number;
  public readonly expensive: boolean;
  public children?: Variable[];
  public get context(): dbgp.Context {
    return this.scopes[0].context;
  }
  public get session(): dbgp.Session {
    return this.scopes[0].session;
  }
  public get name(): string {
    return this.categoryData.label;
  }
  constructor(scopes: Scope[], categoryData: CategoryData, allCategoriesData: CategoryData[], expensive = false) {
    this.variablesReference = handles.create(this);
    this.expensive = expensive;
    this.scopes = scopes;
    this.categoryData = categoryData;
    this.categoryMatcher = this.createCategoryMatcher(categoryData.matchers);
    this.allCategoriesData = allCategoriesData;
  }
  public create(value: Variable | Scope | Category): number {
    return handles.create(value);
  }
  public async loadChildren(maxDepth?: number): Promise<Variable[]> {
    this.children = await this.createChildren(maxDepth);
    return this.children;
  }
  public async createChildren(maxDepth?: number): Promise<Variable[]> {
    if (!maxDepth && this.children) {
      return this.children;
    }

    const sourceScopes = this.scopes.filter((scope) => {
      const sourceNames = toArray<string>(this.categoryData.source);
      return sourceNames.some((sourceName) => equalsIgnoreCase(scope.name, sourceName));
    });

    const sourceVariables: Variable[] = [];
    for await (const scope of sourceScopes) {
      sourceVariables.push(...await scope.createChildren(maxDepth));
    }

    const matchers = this.categoryData.matchers;
    if (!matchers && !this.categoryData.noduplicate) {
      return sourceVariables;
    }

    const variables: Variable[] = sourceVariables.filter((variable) => {
      if (this.categoryData.noduplicate) {
        const categoriesDataBySameSource = this.allCategoriesData.filter((categoryData) => {
          if (this.categoryData.label === categoryData.label) {
            return false;
          }
          if (!categoryData.matchers) {
            return false;
          }
          const sourceA = toArray<string>(this.categoryData.source).sort((a, b) => a.localeCompare(b)).join();
          const sourceB = toArray<string>(categoryData.source).sort((a, b) => a.localeCompare(b)).join();
          return sourceA === sourceB;
        });
        const isDuplicated = categoriesDataBySameSource.some((categoryData) => this.createCategoryMatcher(categoryData.matchers)(variable));
        if (isDuplicated) {
          return false;
        }
      }
      return this.categoryMatcher(variable);
    });
    return variables.sort((a, b) => {
      if (a.property.isIndexKey && b.property.isIndexKey) {
        return a.property.index! - b.property.index!;
      }
      return a.name.localeCompare(b.name);
    });
  }
  private createCategoryMatcher(matchersData?: MatcherData[]): CategoryMatcher {
    if (!matchersData || matchersData.length === 0) {
      return (variable: Variable): boolean => true;
    }
    return (variable: Variable): boolean => {
      return matchersData.every((matcher) => {
        const matchers: Array<(() => boolean)> = [];
        if (typeof matcher.pattern === 'string') {
          const regex = new RegExp(matcher.pattern, matcher.ignorecase ? 'iu' : 'u');
          matchers.push(() => regex.test(variable.name));
        }
        if (typeof matcher.builtin === 'boolean') {
          matchers.push(() => {
            if (variable.property.facet === 'Builtin') {
              return true;
            }
            if ((/(^A_)|^\d$/ui).test(variable.name)) {
              return true;
            }

            const globalVariableNames = this.session.ahkVersion.mejor === 2
              ? [ 'Abs', 'ACos', 'Any', 'Array', 'ASin', 'ATan', 'BlockInput', 'BoundFunc', 'Break', 'Buffer', 'CallbackCreate', 'CallbackFree', 'CaretGetPos', 'Catch', 'Ceil', 'Chr', 'Class', 'Click', 'ClipboardAll', 'ClipWait', 'Closure', 'ComCall', 'ComObjActive', 'ComObjArray', 'ComObjConnect', 'ComObject', 'ComObjFlags', 'ComObjFromPtr', 'ComObjGet', 'ComObjQuery', 'ComObjType', 'ComObjValue', 'ComValue', 'ComValueRef', 'Continue', 'ControlAddItem', 'ControlChooseIndex', 'ControlChooseString', 'ControlClick', 'ControlDeleteItem', 'ControlFindItem', 'ControlFocus', 'ControlGetChecked', 'ControlGetChoice', 'ControlGetClassNN', 'ControlGetEnabled', 'ControlGetExStyle', 'ControlGetFocus', 'ControlGetHwnd', 'ControlGetIndex', 'ControlGetItems', 'ControlGetPos', 'ControlGetStyl', 'ControlGetText', 'ControlGetVisible', 'ControlHide', 'ControlHideDropDown', 'ControlMove', 'ControlSen', 'ControlSendText', 'ControlSetChecked', 'ControlSetEnabled', 'ControlSetExStyle', 'ControlSetStyl', 'ControlSetText', 'ControlShow', 'ControlShowDropDown', 'CoordMode', 'Cos', 'Critical', 'DateAdd', 'DateDiff', 'DetectHiddenText', 'DetectHiddenWindows', 'DirCopy', 'DirCreate', 'DirDelete', 'DirExist', 'DirMove', 'DirSelect', 'DllCall', 'Download', 'DriveEject', 'DriveGetCapacity', 'DriveGetFileSystem', 'DriveGetLabel', 'DriveGetList', 'DriveGetSerial', 'DriveGetSpaceFree', 'DriveGetStatus', 'DriveGetStatusCD', 'DriveGetType', 'DriveLock', 'DriveRetract', 'DriveSetLabel', 'DriveUnlock', 'Edit', 'EditGetCurrentCol', 'EditGetCurrentLine', 'EditGetLine', 'EditGetLineCount', 'EditGetSelectedText', 'EditPaste', 'Else', 'Enumerator', 'EnvGet', 'EnvSet', 'Error', 'Exit', 'ExitApp', 'Exp', 'File', 'FileAppend', 'FileCopy', 'FileCreateShortcut', 'FileDelete', 'FileEncoding', 'FileExist', 'FileGetAttrib', 'FileGetShortcut', 'FileGetSize', 'FileGetTime', 'FileGetVersion', 'FileInstall', 'FileMove', 'FileOpen', 'FileRead', 'FileRecycle', 'FileRecycleEmpty', 'FileSelect', 'FileSetAttrib', 'FileSetTime', 'Finally', 'Float', 'Floor', 'For', 'Format', 'FormatTime', 'Func', 'GetKeyName', 'GetKeySC', 'GetKeyState', 'GetKeyVK', 'GetMethod', 'Goto', 'GroupActivate', 'GroupAdd', 'GroupClose', 'GroupDeactivate', 'Gui', 'Gui()', 'GuiCtrlFromHwnd', 'GuiFromHwnd', 'HasBase', 'HasMethod', 'HasProp', 'HotIf', 'Hotkey', 'Hotstring', 'If', 'IL_Ad', 'IL_Creat', 'IL_Destroy', 'ImageSearch', 'IndexError', 'IniDelete', 'IniRead', 'IniWrite', 'InputBox', 'InputHook', 'InstallKeybdHook', 'InstallMouseHook', 'InStr', 'Integer', 'IsLabel', 'IsObject', 'IsSet', 'KeyError', 'KeyHistory', 'KeyWait', 'ListHotkeys', 'ListLines', 'ListVars', 'ListViewGetContent', 'Ln', 'LoadPicture', 'Log', 'Loop', 'Map', 'Max', 'MemberError', 'MemoryError', 'Menu', 'Menu()', 'MenuBar', 'MenuBar()', 'MenuFromHandle', 'MenuSelect', 'MethodError', 'Min', 'Mod', 'MonitorGet', 'MonitorGetCount', 'MonitorGetName', 'MonitorGetPrimary', 'MonitorGetWorkArea', 'MouseClick', 'MouseClickDrag', 'MouseGetPos', 'MouseMove', 'MsgBox', 'Number', 'NumGet', 'NumPut', 'ObjAddRef', 'ObjAddress', 'ObjBindMethod', 'Object', 'ObjGetBase', 'ObjGetCapacity', 'ObjHasOwnPro', 'ObjOwnProp', 'ObjOwnPropCount', 'ObjPtr', 'ObjRelease', 'ObjSetBase', 'ObjSetCapacity', 'OnClipboardChange', 'OnError', 'OnExit', 'OnMessage', 'Ord', 'OSError', 'OutputDebug', 'Pause', 'Persistent', 'PixelGetColor', 'PixelSearch', 'PostMessage', 'Primitive', 'ProcessClose', 'ProcessExist', 'ProcessSetPriority', 'ProcessWait', 'ProcessWaitClose', 'PropertyError', 'Random', 'RegDelete', 'RegDeleteKey', 'RegExMatch', 'RegExMatchInfo', 'RegExReplace', 'RegRead', 'RegWrite', 'Reload', 'Return', 'Round', 'Run', 'RunAs', 'RunWait', 'Send', 'SendLevel', 'SendMessage', 'SendMode', 'SetCapsLockState', 'SetControlDelay', 'SetDefaultMouseSpeed', 'SetKeyDelay', 'SetMouseDelay', 'SetNumLockState', 'SetRegView', 'SetScrollLockState', 'SetStoreCapsLockMode', 'SetTimer', 'SetTitleMatchMode', 'SetWinDelay', 'SetWorkingDir', 'Shutdown', 'Sin', 'Sleep', 'Sort', 'SoundBeep', 'SoundGetInterface', 'SoundGetMute', 'SoundGetName', 'SoundGetVolume', 'SoundPlay', 'SoundSetMute', 'SoundSetVolume', 'SplitPath', 'Sqrt', 'StatusBarGetText', 'StatusBarWait', 'StrCompare', 'StrGet', 'String', 'StrLen', 'StrLower', 'StrPut', 'StrReplace', 'StrSplit', 'StrUpper', 'SubStr', 'Suspend', 'Switch', 'SysGet', 'SysGetIPAddresses', 'Tan', 'TargetError', 'These', 'Thread', 'Throw', 'TimeoutError', 'ToolTip', 'TraySetIcon', 'TrayTip', 'Trim', 'Try', 'Type', 'TypeError', 'Until', 'ValueError', 'VarRef', 'VarSetStrCapacity', 'VerCompare', 'While-loop', 'WinActivate', 'WinActivateBottom', 'WinActive', 'WinClose', 'WinExist', 'WinGetClass', 'WinGetClientPos', 'WinGetControls', 'WinGetControlsHwnd', 'WinGetCount', 'WinGetExStyle', 'WinGetID', 'WinGetIDLast', 'WinGetList', 'WinGetMinMax', 'WinGetPID', 'WinGetPos', 'WinGetProcessName', 'WinGetProcessPath', 'WinGetStyl', 'WinGetText', 'WinGetTitle', 'WinGetTransColor', 'WinGetTransparent', 'WinHide', 'WinKill', 'WinMaximize', 'WinMinimize', 'WinMinimizeAll', 'WinMove', 'WinMoveBottom', 'WinMoveTop', 'WinRedraw', 'WinRestore', 'WinSetAlwaysOnTop', 'WinSetEnabled', 'WinSetExStyle', 'WinSetRegion', 'WinSetStyl', 'WinSetTitle', 'WinSetTransColor', 'WinSetTransparent', 'WinShow', 'WinWait', 'WinWaitActive', 'WinWaitClose', 'ZeroDivisionError' ]
              : [ 'ErrorLevel' ];
            const isBuiltin = globalVariableNames.some((name) => equalsIgnoreCase(name, variable.name));

            return matcher.builtin ? isBuiltin : !isBuiltin;
          });
        }
        if (typeof matcher.static === 'boolean') {
          matchers.push(() => {
            const isStatic = variable.property.facet === 'Static';
            return matcher.static ? isStatic : !isStatic;
          });
        }
        if (typeof matcher.type === 'string') {
          matchers.push(() => variable.type === matcher.type);
        }
        if (typeof matcher.className === 'string') {
          matchers.push(() => Boolean(variable.className && equalsIgnoreCase(variable.className, matcher.className!)));
        }

        const result = matchers.every((tester) => tester());
        if (matcher.method === 'exclude') {
          return !result;
        }
        return result;
      });
    };
  }
}
export class Categories extends Array<Scope | Category> implements DebugProtocol.Variable {
  public readonly name: string;
  public readonly value: string;
  public readonly expensive: boolean;
  public readonly variablesReference: number;
  public children?: DebugProtocol.Variable[];
  constructor(...params: Array<Scope | Category>) {
    super(...params);

    this.name = 'VARIABLES';
    this.value = 'VARIABLES';
    this.variablesReference = handles.create(this);
    this.expensive = false;
  }
  public async loadChildren(maxDepth?: number): Promise<DebugProtocol.Variable[]> {
    this.children = await this.createChildren(maxDepth);
    return this.children;
  }
  public async createChildren(maxDepth?: number): Promise<DebugProtocol.Variable[]> {
    if (!maxDepth && this.children) {
      return this.children;
    }

    const variables: DebugProtocol.Variable[] = [];
    for await (const scope of this) {
      await scope.loadChildren(maxDepth);
      variables.push({
        name: scope.name,
        value: scope.name,
        variablesReference: scope.variablesReference,
      });
    }
    return variables;
  }
}
export class VariableGroup extends Array<Scope | Category | Categories | Variable> implements DebugProtocol.Variable {
  public name = '';
  public value = '';
  public readonly variablesReference: number;
  constructor(...variables: Array<Scope | Category | Categories | Variable>) {
    super();
    this.variablesReference = handles.create(this);
    this.push(...variables);
  }
}
export class Variable implements DebugProtocol.Variable {
  public readonly hasChildren: boolean;
  public _isLoadedChildren: boolean;
  public get isLoadedChildren(): boolean {
    return this._isLoadedChildren;
  }
  public readonly session: dbgp.Session;
  public readonly name: string;
  public get value(): string {
    return formatProperty(this.property, this.session.ahkVersion);
  }
  public readonly variablesReference: number;
  public readonly __vscodeVariableMenuContext: 'string' | 'number' | 'object';
  public readonly type?: string;
  public get indexedVariables(): number | undefined {
    if (this.property instanceof dbgp.ObjectProperty && this.property.isArray && 100 < this.property.maxIndex!) {
      return this.property.maxIndex;
    }
    return undefined;
  }
  public get namedVariables(): number | undefined {
    return this.property instanceof dbgp.ObjectProperty ? 1 : undefined;
  }
  public get isArray(): boolean {
    return this.property instanceof dbgp.ObjectProperty ? this.property.isArray : false;
  }
  public _property: dbgp.Property;
  public get property(): dbgp.Property {
    return this._property;
  }
  public get context(): dbgp.Context {
    return this.property.context;
  }
  public get fullName(): string {
    return this.property.fullName;
  }
  public get className(): string | undefined {
    return this.property instanceof dbgp.ObjectProperty ? this.property.className : undefined;
  }
  public get maxIndex(): number | undefined {
    return this.property instanceof dbgp.ObjectProperty ? this.property.maxIndex : undefined;
  }
  public get children(): dbgp.Property[] | undefined {
    return this.property instanceof dbgp.ObjectProperty ? this.property.children : undefined;
  }
  constructor(session: dbgp.Session, property: dbgp.Property) {
    this.hasChildren = property instanceof dbgp.ObjectProperty;
    this._isLoadedChildren = property instanceof dbgp.ObjectProperty && 0 < property.children.length;

    this.session = session;
    this._property = property;
    this.name = property.name;
    this.variablesReference = this.hasChildren ? handles.create(this) : 0;
    this.type = property.type;
    if (property instanceof dbgp.PrimitiveProperty) {
      this.__vscodeVariableMenuContext = isNumberLike(property.value) ? 'number' : 'string';
    }
    else {
      this.__vscodeVariableMenuContext = 'object';
    }
  }
  public async loadChildren(): Promise<void> {
    if (!this.isLoadedChildren) {
      const reloadedProperty = await this.session.safeFetchProperty(this.context, this.fullName, 1);
      if (reloadedProperty) {
        this._property = reloadedProperty;
        this._isLoadedChildren = true;
      }
    }
  }
  public async createMembers(args: DebugProtocol.VariablesArguments): Promise<Variable[] | undefined> {
    if (!(this.property instanceof dbgp.ObjectProperty)) {
      return undefined;
    }

    await this.loadChildren();
    if (!this.children) {
      return undefined;
    }

    const variables: Variable[] = [];
    for await (const property of this.children) {
      // Fix: [#133](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/133)
      if (property.fullName.includes('<enum>')) {
        continue;
      }

      if (args.filter) {
        if (args.filter === 'named' && property.isIndexKey) {
          continue;
        }
        if (args.filter === 'indexed') {
          if (!property.isIndexKey) {
            continue;
          }
          const index = property.index!;
          const start = args.start! + 1;
          const end = args.start! + args.count!;
          const contains = start <= index && index <= end;
          if (!contains) {
            continue;
          }
        }
      }

      const variable = new Variable(this.session, property);
      if (!isComObject(this.property)) {
        await variable.loadChildren();
      }
      variables.push(variable);
    }
    return variables;
  }
}
export type MetaVariableValue = string | number | Scope | Category | Categories | StackFrame | StackFrames | Record<string, any>;
export type LazyMetaVariableValue = Promise<MetaVariableValue>;
export class MetaVariable implements DebugProtocol.Variable {
  public readonly name: string;
  public readonly type = 'metavariable';
  public readonly variablesReference: number;
  public get indexedVariables(): number | undefined {
    if (this.rawValue instanceof Variable) {
      return this.rawValue.indexedVariables;
    }
    return undefined;
  }
  public get namedVariables(): number | undefined {
    if (this.rawValue instanceof Variable) {
      return this.rawValue.namedVariables;
    }
    return undefined;
  }
  public rawValue: MetaVariableValue | LazyMetaVariableValue;
  public loadedPromiseValue?: MetaVariableValue;
  public children?: Array<Variable | MetaVariable | DebugProtocol.Variable>;
  public get value(): string {
    const value = this.loadedPromiseValue ?? this.rawValue;
    if (isPrimitive(value)) {
      return typeof this.rawValue === 'string' ? `"${value}"` : String(value);
    }
    if (value instanceof Scope || value instanceof Category || value instanceof Categories || value instanceof StackFrame) {
      return value.name;
    }
    if (value instanceof Variable || value instanceof MetaVariable) {
      return value.value;
    }
    return JSON.stringify(value);
  }
  public get hasChildren(): boolean {
    return !isPrimitive(this.loadedPromiseValue ?? this.rawValue);
  }
  constructor(name: string, value: MetaVariableValue | LazyMetaVariableValue) {
    this.name = name;
    this.rawValue = value;
    this.variablesReference = isPrimitive(value) ? 0 : handles.create(this);
  }
  public async loadChildren(maxDepth?: number): Promise<Array<Variable | MetaVariable | DebugProtocol.Variable>> {
    this.children = await this.createChildren(maxDepth);
    return this.children;
  }
  public async createChildren(maxDepth?: number): Promise<Array<Variable | MetaVariable | DebugProtocol.Variable>> {
    if (this.children) {
      return this.children;
    }
    if (!this.loadedPromiseValue) {
      this.loadedPromiseValue = this.rawValue instanceof Promise ? await this.rawValue : this.rawValue;
    }

    if (isPrimitive(this.loadedPromiseValue)) {
      return [];
    }
    if (this.loadedPromiseValue instanceof Scope || this.loadedPromiseValue instanceof Category || this.loadedPromiseValue instanceof Categories || this.loadedPromiseValue instanceof MetaVariable) {
      return this.loadedPromiseValue.createChildren(maxDepth);
    }
    return Object.entries(this.loadedPromiseValue).map(([ key, value ]) => {
      if (value instanceof MetaVariable) {
        return value;
      }
      return new MetaVariable(key, value);
    });
  }
}
export class MetaVariableValueMap extends CaseInsensitiveMap<string, MetaVariableValue | LazyMetaVariableValue> {
  public createMetaVariable(name: string): MetaVariable | undefined {
    const value = this.get(name);
    if (!value) {
      return undefined;
    }
    return new MetaVariable(name, value);
  }
  // public get(key: string): MetaVariableValue | LazyMetaVariableValue | undefined {
  //   return super.get(key);
  // }
  // public set(key: string, value: MetaVariableValue | LazyMetaVariableValue): this {
  //   return super.set(key, value);
  // }
}

export class VariableManager {
  public readonly debugAdapter: AhkDebugSession;
  public readonly session: dbgp.Session;
  public readonly categoriesData?: CategoryData[];
  // private readonly scopeByVariablesReference = new Map<number, Scope>();
  // private readonly objectByVariablesReference = new Map<number, dbgp.ObjectProperty>();
  // private readonly stackFramesByFrameId = new Map<number, dbgp.StackFrame>();
  constructor(debugAdapter: AhkDebugSession, categories?: CategoryData[]) {
    this.debugAdapter = debugAdapter;
    this.session = debugAdapter.session!;
    this.categoriesData = categories;
  }
  public createVariableReference(value?: any): number {
    return handles.create(value);
  }
  public async createCategories(frameId: number): Promise<Categories> {
    const defaultScopes = await this.createDefaultScopes(frameId);
    if (!this.categoriesData) {
      return defaultScopes;
    }

    const categories = new Categories();
    for await (const categoryData of this.categoriesData) {
      if (categoryData.hidden === true) {
        continue;
      }

      const existSources = defaultScopes.some((scope) => {
        return toArray<ScopeSelector>(categoryData.source).some((source) => equalsIgnoreCase(scope.name, source));
      });
      if (!existSources) {
        continue;
      }

      const category = new Category(defaultScopes, categoryData, this.categoriesData);
      if (categoryData.hidden === 'auto') {
        await category.loadChildren();
        if (category.children?.length === 0) {
          continue;
        }
      }
      categories.push(category);
    }
    return categories;
  }
  public getCategory(variablesReference: number): Scope | Category | undefined {
    const category = handles.get(variablesReference);
    if (category instanceof Scope || category instanceof Category) {
      return category;
    }
    return undefined;
  }
  public getCategories(variablesReference: number): Categories | undefined {
    const categories = handles.get(variablesReference);
    if (categories instanceof Categories) {
      return categories;
    }
    return undefined;
  }
  public getObjectVariable(variablesReference: number): Variable | undefined {
    const variable = handles.get(variablesReference);
    if (variable instanceof Variable) {
      return variable;
    }
    return undefined;
  }
  public getMetaVariable(variablesReference: number): MetaVariable | undefined {
    const metaVariable = handles.get(variablesReference);
    if (metaVariable instanceof MetaVariable) {
      return metaVariable;
    }
    return undefined;
  }
  public async createVariables(args: DebugProtocol.VariablesArguments, maxDepth?: number): Promise<Variable[] | undefined> {
    const variable = this.getObjectVariable(args.variablesReference);
    if (variable) {
      return variable.createMembers(args);
    }
    const scope = this.getCategory(args.variablesReference);
    return scope?.createChildren(maxDepth);
  }
  public async createStackFrames(): Promise<StackFrames> {
    const { stackFrames: dbgpStackFrames } = await this.session.sendStackGetCommand();

    const stackFrames: StackFrames = dbgpStackFrames.map((dbgpStackFrame) => {
      return new StackFrame(this.session, dbgpStackFrame);
    });
    stackFrames.isIdleMode = false;
    if (dbgpStackFrames.length === 0) {
      stackFrames.isIdleMode = true;
      stackFrames.push(new StackFrame(
        this.session,
        {
          name: 'Standby',
          fileUri: URI.file(this.debugAdapter.config.program).path,
          level: 0,
          line: 0,
          type: 'file',
        },
      ));
    }
    return stackFrames;
  }
  public getStackFrame(frameId: number): StackFrame | undefined {
    const stackFrame = handles.get(frameId);
    if (stackFrame instanceof StackFrame) {
      return stackFrame;
    }
    return undefined;
  }
  public async evaluate(name: string, stackFrame?: dbgp.StackFrame): Promise<Variable | undefined> {
    const property = await this.session.evaluate(name, stackFrame);
    if (!property) {
      return undefined;
    }
    return new Variable(this.session, property);
  }
  private async createDefaultScopes(frameId: number): Promise<Categories> {
    const stackFrame = this.getStackFrame(frameId) ?? (await this.createStackFrames())[0];
    const { contexts } = await this.session.sendContextNamesCommand(stackFrame.dbgpStackFrame);
    const scopes = new Categories();
    for await (const context of contexts) {
      const scope = new Scope(this.session, context);
      scopes.push(scope);
    }
    return scopes;
  }
}
