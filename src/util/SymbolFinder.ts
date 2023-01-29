import { AhkVersion, ImplicitLibraryPathExtractor, IncludePathResolver } from '@zero-plusplus/autohotkey-utilities';
import { readFileSync } from 'fs';
import { TextEditorLineNumbersStyle } from 'vscode';
import { equalsIgnoreCase } from './stringUtils';

export interface Position {
  line: number;
  column: number;
}
export interface Location {
  sourceFile: string;
  startIndex: number;
  endIndex: number;
  value: string;
}

export type Node =
  | SkipNode
  | IncludeNode
  | NamedNode;
export type NamedNode =
  | ClassNode
  | FunctionNode
  | DynamicPropertyNode
  | GetterNode
  | SetterNode;
export interface NodeBase {
  context: ParserContext;
  type: string;
  scope: string[];
  location: Location;
}
export interface NamedNodeBase extends NodeBase {
  name: string;
  fullname: string;
}
export interface SkipNode extends NodeBase {
  type: 'skip';
}
export interface IncludeNode extends NodeBase {
  type: 'include';
  path: string;
}
export interface ClassNode extends NamedNodeBase {
  type: 'class';
  superClass?: string;
  block: Location;
}
export interface FunctionNode extends NamedNodeBase {
  type: 'function';
  block: Location;
}
export interface DynamicPropertyBody {
  getter?: GetterNode;
  setter?: SetterNode;
}
export interface DynamicPropertyNode extends NamedNodeBase {
  type: 'property';
  block: Location;
  body: DynamicPropertyBody;
}
export interface GetterNode extends NamedNodeBase {
  type: 'getter';
  blockLocation: Location;
}
export interface SetterNode extends NamedNodeBase {
  type: 'setter';
  blockLocation: Location;
}

export type ParserContext = {
  sourceFile: string;
  source: string;
  sourceLength: TextEditorLineNumbersStyle;
  index: number;
  scope: string[];
  parsedNodes: Node[];
};

export const getText = (node: Node): string => {
  return node.context.source.slice(node.location.startIndex, node.location.endIndex);
};
export const getLine = (node: Node, index: number): number => {
  const startLine_base1 = Array.from(node.context.source.slice(0, index).matchAll(/\r\n|\n/gu)).length + 1;
  return startLine_base1;
};
export const getColumn = (node: Node, index: number): number => {
  const startColumn_base1 = (node.context.source.slice(0, index).match(/(^|(\r)?\n)(?<lastLine>.+)$/u)?.groups?.lastLine.length ?? 0) + 1;
  return startColumn_base1;
};
export const getAncestorsMap = (classNodes: ClassNode[]): Map<string, NamedNode[]> => {
  // const rootClassNode = classNodes.filter((node) => node.superClass);
  const ancestorsMap = new Map<string, NamedNode[]>();
  for (const classNode of classNodes) {
    const ancestors: NamedNode[] = [];

    let currentSuperClass = classNodes.find((node) => equalsIgnoreCase(node.fullname, classNode.superClass ?? ''));
    while (currentSuperClass) {
      ancestors.push(currentSuperClass);
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      currentSuperClass = classNodes.find((node) => equalsIgnoreCase(node.fullname, currentSuperClass?.superClass ?? ''));
    }
    ancestorsMap.set(classNode.fullname, ancestors);
  }
  return ancestorsMap;
};

type FileReader = (...params: any[]) => string;
export class SymbolFinder {
  private readonly version: AhkVersion;
  private readonly resolver: IncludePathResolver;
  private readonly implicitExtractor: ImplicitLibraryPathExtractor;
  private readonly fileReader: FileReader;
  constructor(version: string | AhkVersion, fileReader?: FileReader) {
    this.version = typeof version === 'string' ? new AhkVersion(version) : version;
    this.resolver = new IncludePathResolver(this.version);
    this.implicitExtractor = new ImplicitLibraryPathExtractor(this.version);
    this.fileReader = fileReader ?? ((filePath: string): string => readFileSync(filePath, 'utf-8'));
  }
  public find(sourceFile: string): Node[] {
    const context = this.createContext(sourceFile);
    this.parse(context);
    return context.parsedNodes;
  }
  public matchSymbols(text: string): RegExpMatchArray | null {
    const classRegExp = /(?<skip>.*?)(?<class>(?<=^|(\r)?\n|\uFEFF)(?<classIndent>[^\S\r\n\uFEFF]*)class\s+(?<className>[\w_$@#]+)(\s+extends\s+(?<superClassName>[\w_.$@#]+))?\s*\{)/siu;
    const classMatch = text.match(classRegExp);
    if (classMatch?.groups?.class) {
      return classMatch;
    }

    const includeRegExp = /(?<skip>.*?)(?<include>(?<=^|(\r)?\n|\uFEFF)[^\S\r\n\uFEFF]*#Include\s+(\*i\s+)?(?<includePath>[^\r\n]+))/siu;
    const includeMatch = text.match(includeRegExp);
    if (includeMatch?.groups?.include) {
      return includeMatch;
    }

    const funcRegExp = /(?<skip>.*?)(?<func>(?<=^|(\r)?\n|\uFEFF)(?<funcIndent>[^\S\r\n\uFEFF]*)(?<funcName>[\w_$@#]+)\([^)]*\)[\s\r\n]*\{)/siu;
    const funcMatch = text.match(funcRegExp);
    if (funcMatch?.groups?.func) {
      return funcMatch;
    }

    const propertyRegExp = /(?<skip>.*?)(?<property>(?<=^|(\r)?\n|\uFEFF)(?<propertyIndent>[^\S\r\n\uFEFF]*)(?<propertyName>[\w_$@#]+)(\[[^\]]*\])?\s*\{)/siu;
    const propertyMatch = text.match(propertyRegExp);
    if (propertyMatch?.groups?.property) {
      return propertyMatch;
    }
    return null;
  }
  public matchAccesor(text: string): RegExpMatchArray | null {
    const getterRegExp = /(?<skip>.*?)(?<getter>(?<=^|(\r)?\n)(?<getterIndent>[^\S\r\n\uFEFF]*)get\s*\{)/siu;
    const getterMatch = text.match(getterRegExp);
    if (getterMatch?.groups?.getter) {
      return getterMatch;
    }

    const setterRegExp = /(?<skip>.*?)(?<setter>(?<=^|(\r)?\n)(?<setterIndent>[^\S\r\n\uFEFF]*)set\s*\{)/siu;
    const setterMatch = text.match(setterRegExp);
    if (setterMatch?.groups?.setter) {
      return setterMatch;
    }
    return null;
  }
  public matchEndBlock(contents: string, indent: string): RegExpMatchArray | null {
    const regexp = new RegExp(`(?<=(^|(\\r)?\\n)${indent})\\}`, 'u');
    return contents.match(regexp);
  }
  public parse(context: ParserContext): void {
    if (this.version.mejor === 1.1) {
      const libraryFilePathList = this.implicitExtractor.extract([ context.sourceFile ]);
      for (const libraryFilePath of libraryFilePathList) {
        const newContext = this.createContext(libraryFilePath, context);
        this.parse(newContext);
        context.parsedNodes.push(...newContext.parsedNodes);
      }
    }

    const stack: string[] = [];
    while (context.index < context.sourceLength) {
      const char = context.source.charAt(context.index);
      stack.push(char);
      if (char !== '{') {
        context.index++;
        continue;
      }

      context.index -= (stack.length - 1);
      const parsingText = stack.join('');
      const match = this.matchSymbols(parsingText);
      if (!match?.groups) {
        break;
      }

      if (match.groups.skip) {
        this.parseSkipNode(context, match.groups.skip);
      }

      if (match.groups.include) {
        this.parseIncludeNode(context, match.groups.include, match.groups.includePath);
      }
      else if (match.groups.class) {
        this.parseClassNode(context, match.groups.className, match.groups.superClassName, match.groups.classIndent);
      }
      else if (match.groups.func) {
        this.parseFunctionNode(context, match.groups.funcName, match.groups.funcIndent);
      }
      else {
        context.index += (stack.length - 1);
      }

      stack.splice(0);
    }
  }
  public parseSkipNode(context: ParserContext, contents: string, skipSpace = false): void {
    context.index += contents.length;

    let _contents = contents;
    if (skipSpace) {
      while (context.index < context.sourceLength) {
        const char = context.source.charAt(context.index);
        if (char === ' ' || char === '\t') {
          _contents += char;
          context.index++;
          continue;
        }
        break;
      }
    }
    context.parsedNodes.push(this.createSkipNode(context, _contents));
  }
  public parseClassNode(context: ParserContext, name: string, superClassName: string, indent: string): void {
    const startIndex = context.index;
    const stack: string[] = [];
    context.scope.push(name);

    let startBlockIndent = -1;
    while (context.index < context.sourceLength) {
      const char = context.source.charAt(context.index);
      stack.push(char);
      if (stack.includes('\n') && char === '}') {
        const parsingText = stack.join('');
        const match = this.matchEndBlock(parsingText, indent);
        if (match) {
          break;
        }
        stack.splice(0);
      }
      else if (char === '{') {
        if (startBlockIndent === -1) {
          startBlockIndent = context.index;
          context.index++;
          stack.splice(0);
          continue;
        }

        context.index -= (stack.length - 1);
        const parsingText = stack.join('');
        const match = this.matchSymbols(parsingText);
        if (match?.groups?.skip) {
          this.parseSkipNode(context, `${match.groups.skip}`);
        }

        if (match?.groups?.class) {
          this.parseClassNode(context, match.groups.className, match.groups.superClassName, match.groups.classIndent);
        }
        else if (match?.groups?.func) {
          this.parseFunctionNode(context, match.groups.funcName, match.groups.funcIndent);
        }
        else if (match?.groups?.include) {
          this.parseIncludeNode(context, match.groups.include, match.groups.includePath);
        }
        else if (match?.groups?.property) {
          this.parseDynamicPropertyNode(context, match.groups.propertyName, match.groups.propertyIndent);
        }
        else {
          context.index += (stack.length - 1);
        }
        stack.splice(0);
      }
      context.index++;
    }
    context.scope.pop();

    const location = this.createLocation(context, startIndex, context.index);
    const blockLocation = this.createLocation(context, startBlockIndent, context.index);
    const classNode = this.createClassNode(context, name, superClassName, location, blockLocation);
    context.parsedNodes.push(classNode);
  }
  public parseIncludeNode(context: ParserContext, includeLine: string, includePath: string): void {
    const resolvedIncludePath = this.resolver.resolve(includePath, {
      A_LineFile: context.sourceFile,
    }) ?? '';
    const newContext = this.createContext(resolvedIncludePath, context);
    this.parse(newContext);

    context.index += includeLine.length;
    context.parsedNodes.push(...newContext.parsedNodes);
  }
  public parseFunctionNode(context: ParserContext, name: string, indent: string): void {
    const startIndex = context.index;
    const stack: string[] = [];
    context.scope.push(name);

    let startBlockIndex = -1;
    while (context.index < context.sourceLength) {
      const char = context.source.charAt(context.index);
      stack.push(char);
      if (stack.includes('\n') && char === '}') {
        const parsingText = stack.join('');
        const match = this.matchEndBlock(parsingText, indent);
        if (match) {
          context.index++;
          break;
        }
        stack.splice(0);
      }
      else if (char === '{') {
        if (startBlockIndex === -1) {
          startBlockIndex = context.index;
          context.index++;
          stack.splice(0);
          continue;
        }

        context.index -= (stack.length - 1);
        const parsingText = stack.join('');
        const match = this.matchSymbols(parsingText);
        if (match?.groups?.skip) {
          this.parseSkipNode(context, `${match.groups.skip}`);
        }

        if (match?.groups?.func) {
          this.parseFunctionNode(context, match.groups.funcName, match.groups.funcIndent);
        }
        else {
          context.index += (stack.length - 1);
        }

        stack.splice(0);
      }

      context.index++;
    }
    context.scope.pop();

    const location = this.createLocation(context, startIndex, context.index);
    const blockLocation = this.createLocation(context, startBlockIndex, context.index);
    const functionNode = this.createFunctionNode(context, name, location, blockLocation);
    context.parsedNodes.push(functionNode);
  }
  public parseDynamicPropertyNode(context: ParserContext, name: string, indent: string): void {
    // const startIndex = context.index;
    const stack: string[] = [];
    context.scope.push(name);

    const body: DynamicPropertyBody = {};
    let startBlockIndex = -1;
    while (context.index < context.sourceLength) {
      if (body.getter && body.setter) {
        break;
      }

      const char = context.source.charAt(context.index);
      stack.push(char);
      if (stack.includes('\n') && char === '}') {
        const parsingText = stack.join('');
        const match = this.matchEndBlock(parsingText, indent);
        if (match) {
          context.index++;
          break;
        }
        stack.splice(0);
      }
      else if (char === '{') {
        if (startBlockIndex === -1) {
          startBlockIndex = context.index;
          context.index++;
          stack.splice(0);
          continue;
        }

        context.index -= (stack.length - 1);
        const parsingText = stack.join('');
        const match = this.matchAccesor(parsingText);
        if (match?.groups?.skip) {
          this.parseSkipNode(context, `${match.groups.skip}`);
        }

        if (!body.getter && match?.groups?.getter) {
          this.parseGetterNode(context, match.groups.getterIndent);
          // body.getter = context.parsedNodes.pop() as GetterNode;
        }
        else if (!body.setter && match?.groups?.setter) {
          this.parseSetterNode(context, match.groups.setterIndent);
          // body.setter = context.parsedNodes.pop() as SetterNode;
        }
        else {
          context.index += (stack.length - 1);
        }

        stack.splice(0);
      }
      context.index++;
    }

    // const location = this.createLocation(context, startIndex, context.index);
    // const blockLocation = this.createLocation(context, startBlockIndex, context.index);
    // const propertyNode = this.createDynamicPropertyNode(context, name, location, blockLocation, body);
    // context.parsedNodes.push(propertyNode);
    context.scope.pop();
  }
  public parseGetterNode(context: ParserContext, indent: string): void {
    const startIndex = context.index;
    const name = 'get';
    const stack: string[] = [];
    context.scope.push(name);

    let startBlockIndex = -1;
    while (context.index < context.sourceLength) {
      const char = context.source.charAt(context.index);
      stack.push(char);
      if (stack.includes('\n') && char === '}') {
        const parsingText = stack.join('');
        const match = this.matchEndBlock(parsingText, indent);
        if (match) {
          context.index++;
          break;
        }
        stack.splice(0);
      }
      else if (startBlockIndex === -1 && char === '{') {
        startBlockIndex = context.index;
        stack.splice(0);
      }
      context.index++;
    }
    context.scope.pop();

    const location = this.createLocation(context, startIndex, context.index);
    const blockLocation = this.createLocation(context, startBlockIndex, context.index);
    const getterNode = this.createGetterNode(context, location, blockLocation);
    context.parsedNodes.push(getterNode);
  }
  public parseSetterNode(context: ParserContext, indent: string): void {
    const startIndex = context.index;
    const name = 'set';
    const stack: string[] = [];
    context.scope.push(name);

    let startBlockIndex = -1;
    while (context.index < context.sourceLength) {
      const char = context.source.charAt(context.index);
      stack.push(char);
      if (stack.includes('\n') && char === '}') {
        const parsingText = stack.join('');
        const match = this.matchEndBlock(parsingText, indent);
        if (match?.index) {
          context.index++;
          break;
        }
        stack.splice(0);
      }
      else if (startBlockIndex === -1 && char === '{') {
        startBlockIndex = context.index;
        stack.splice(0);
      }
      context.index++;
    }
    context.scope.pop();

    const location = this.createLocation(context, startIndex, context.index);
    const blockLocation = this.createLocation(context, startBlockIndex, context.index);
    const setterNode = this.createSetterNode(context, location, blockLocation);
    context.parsedNodes.push(setterNode);
  }
  public maskComment(source: string): string {
    return source.replace(/(\/\*(?:\*(?!\/)|[^*])*\*\/)/gsu, (substring) => {
      const lines = substring.split(/\r\n|\n/gu);
      return lines.map((line) => {
        return '*'.repeat(line.length);
      }).join('\r\n');
    });
  }
  public createContext(sourceFile: string, prevContext?: ParserContext): ParserContext {
    const rootSource = this.fileReader(sourceFile);
    const context: ParserContext = {
      ...prevContext,
      sourceFile,
      source: this.maskComment(rootSource),
      sourceLength: rootSource.length,
      index: 0,
      scope: prevContext?.scope.slice() ?? [],
      parsedNodes: [],
    };
    return context;
  }
  public createFullName(context: ParserContext, name: string): string {
    if (0 < context.scope.length) {
      return `${context.scope.join('.')}.${name}`;
    }
    return name;
  }
  public createLocation(context: ParserContext, startIndex: number, endIndex: number): Location {
    const value = context.source.slice(startIndex, endIndex);
    return {
      sourceFile: context.sourceFile,
      value,
      startIndex,
      endIndex,
    };
  }
  public createSkipNode(context: ParserContext, contents: string): SkipNode {
    return {
      context,
      type: 'skip',
      scope: context.scope,
      location: this.createLocation(context, context.index, context.index + contents.length),
    };
  }
  public createClassNode(context: ParserContext, name: string, superClassName: string, location: Location, blockLocation: Location): ClassNode {
    return {
      context,
      type: 'class',
      name,
      fullname: this.createFullName(context, name),
      superClass: superClassName,
      scope: context.scope.slice(),
      location,
      block: blockLocation,
    };
  }
  public createFunctionNode(context: ParserContext, name: string, location: Location, blockLocation: Location): FunctionNode {
    return {
      context,
      type: 'function',
      name,
      fullname: this.createFullName(context, name),
      scope: context.scope.slice(),
      location,
      block: blockLocation,
    };
  }
  public createDynamicPropertyNode(context: ParserContext, name: string, location: Location, blockLocation: Location, body: DynamicPropertyBody): DynamicPropertyNode {
    return {
      context,
      type: 'property',
      fullname: this.createFullName(context, name),
      scope: context.scope.slice(),
      name,
      location,
      block: blockLocation,
      body,
    };
  }
  public createGetterNode(context: ParserContext, location: Location, blockLocation: Location): GetterNode {
    const name = 'get';
    return {
      context,
      type: 'getter',
      name,
      fullname: this.createFullName(context, name),
      scope: context.scope.slice(),
      location,
      blockLocation,
    };
  }
  public createSetterNode(context: ParserContext, location: Location, blockLocation: Location): SetterNode {
    const name = 'set';
    return {
      context,
      type: 'setter',
      name,
      fullname: this.createFullName(context, name),
      scope: context.scope.slice(),
      location,
      blockLocation,
    };
  }
}
