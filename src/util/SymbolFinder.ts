import { readFileSync } from 'fs';
import { AhkVersion, ImplicitLibraryPathExtractor, IncludePathResolver } from '@zero-plusplus/autohotkey-utilities';
import { TextEditorLineNumbersStyle } from 'vscode';

export interface Position {
  line: number;
  column: number;
}
export interface Location {
  sourceFile: string;
  startIndex: number;
  endIndex: number;
  start: Position;
  end: Position;
  value: string;
}

export type Node =
  | SkipNode
  | IncludeNode
  | ClassNode
  | FunctionNode
  | DynamicPropertyNode
  | GetterNode
  | SetterNode;
export interface NodeBase {
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

export class SymbolFinder {
  private readonly version: AhkVersion;
  private readonly resolver: IncludePathResolver;
  private readonly implicitExtractor: ImplicitLibraryPathExtractor;
  constructor(version: string | AhkVersion) {
    this.version = typeof version === 'string' ? new AhkVersion(version) : version;
    this.resolver = new IncludePathResolver(this.version);
    this.implicitExtractor = new ImplicitLibraryPathExtractor(this.version);
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

    const propertyRegExp = /(?<skip>.*?)(?<property>(?<=^|(\r)?\n|\uFEFF)(?<propertyIndent>[^\S\r\n\uFEFF]*)(?<propertyName>[\w_$@#]+)(\[[^\]*]\])?\s*\{)/siu;
    const propertyMatch = text.match(propertyRegExp);
    if (propertyMatch?.groups?.property) {
      return propertyMatch;
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

    let lastLineBreakIndex = -1;
    const stack: string[] = [];
    while (context.index < context.sourceLength) {
      const char = context.source.charAt(context.index);
      stack.push(char);
      if (char === '\n' || (char === '\r' && context.source.charAt(context.index + 1) === '\n')) {
        lastLineBreakIndex = context.index;
      }
      if (char !== '{') {
        context.index++;
        continue;
      }

      if (-1 < lastLineBreakIndex) {
        context.index -= stack.length - lastLineBreakIndex;
        const parsingText = stack.slice(lastLineBreakIndex + 1).join('');
        const match = this.matchSymbols(parsingText);
        if (!match?.groups) {
          break;
        }

        if (match.groups.skip) {
          this.parseSkipNode(context, match.groups.skip);
        }

        if (match.groups.include) {
          // context.index -= (match.groups.include.length - 1);
          this.parseIncludeNode(context, match.groups.include, match.groups.includePath);
        }
        else if (match.groups.class) {
          // context.index -= (match.groups.class.length - 1);
          this.parseClassNode(context, match.groups.className, match.groups.classIndent);
        }
        else if (match.groups.func) {
          // context.index -= (match.groups.func.length - 1);
          this.parseFunctionNode(context, match.groups.funcName, match.groups.funcIndent);
        }
        else {
          context.index += (stack.length - 1);
        }

        stack.splice(0);
      }
    }
  }
  public parseSkipNode(context: ParserContext, contents: string): void {
    context.index += contents.length;

    let _contents = contents;
    while (context.index < context.sourceLength) {
      const char = context.source.charAt(context.index);
      if (char === ' ' || char === '\t') {
        _contents += char;
        context.index++;
        continue;
      }
      break;
    }
    context.parsedNodes.push(this.createSkipNode(context, _contents));
  }
  public parseClassNode(context: ParserContext, name: string, indent: string): void {
    const startIndex = context.index;
    const stack: string[] = [];
    context.scope.push(name);

    let startBlockIndent = -1;
    while (context.index < context.sourceLength) {
      const char = context.source.charAt(context.index);
      stack.push(char);
      if (char === '}') {
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

        const parsingText = stack.join('');
        const match = this.matchSymbols(parsingText);
        if (match?.groups?.skip) {
          this.parseSkipNode(context, `${match.groups.skip}`);
        }

        if (match?.groups?.class) {
          context.index -= (match.groups.class.length - 1);
          this.parseClassNode(context, match.groups.className, match.groups.classIndent);
        }
        else if (match?.groups?.func) {
          context.index -= (match.groups.func.length - 1);
          this.parseFunctionNode(context, match.groups.funcName, match.groups.funcIndent);
        }
        else if (match?.groups?.include) {
          context.index -= (match.groups.include.length - 1);
          this.parseIncludeNode(context, match.groups.include, match.groups.includePath);
        }
        else if (match?.groups?.property) {
          context.index -= (match.groups.property.length - 1);
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
    const classNode = this.createClassNode(context, name, location, blockLocation);
    context.parsedNodes.push(classNode);
  }
  public parseIncludeNode(context: ParserContext, includeLine: string, includePath: string): void {
    const resolvedIncludePath = this.resolver.resolve(includePath, {
      A_LineFile: context.sourceFile,
    });
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
      if (char === '}') {
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
    const startIndex = context.index;
    const stack: string[] = [];
    context.scope.push(name);

    const regex = new RegExp([
      '(?<skip>.*?)',
      '(',
      '(?<getter>(?<=^|(\\r)?\\n)(?<getterIndent>[ \\t]*)get\\s*\\{)',
      '|',
      '(?<setter>(?<=^|(\\r)?\\n)(?<setterIndent>[ \\t]*)set\\s*\\{)',
      ')',
    ].join(''), 'ui');

    let startBlockIndex = -1;
    while (context.index < context.sourceLength) {
      const char = context.source.charAt(context.index);
      stack.push(char);
      if (char === '}') {
        const parsingText = stack.join('');
        const match = this.matchEndBlock(parsingText, indent);
        if (match) {
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
        const match = parsingText.match(regex);
        if (match?.groups?.skip) {
          this.parseSkipNode(context, `${match.groups.skip}`);
        }

        if (match?.groups?.getter) {
          this.parseGetterNode(context, match.groups.getterIndent);
        }
        else if (match?.groups?.setter) {
          this.parseGetterNode(context, match.groups.getterIndent);
        }
        else {
          context.index += (stack.length - 1);
        }

        stack.splice(0);
      }
      context.index++;
    }

    const location = this.createLocation(context, startIndex, context.index);
    const blockLocation = this.createLocation(context, startBlockIndex, context.index);
    const functionNode = this.createFunctionNode(context, name, location, blockLocation);
    context.parsedNodes.push(functionNode);
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
      if (char === '}') {
        const parsingText = stack.join('');
        const match = this.matchEndBlock(parsingText, indent);
        if (match?.index) {
          startBlockIndex = match.index;
          break;
        }
        stack.splice(0);
      }
      context.index++;
    }

    const location = this.createLocation(context, startIndex, context.index);
    const blockLocation = this.createLocation(context, startBlockIndex, context.index);
    const functionNode = this.createGetterNode(context, location, blockLocation);
    context.parsedNodes.push(functionNode);
    context.scope.pop();
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
      if (char === '}') {
        const parsingText = stack.join('');
        const match = this.matchEndBlock(parsingText, indent);
        if (match?.index) {
          startBlockIndex = match.index;
          break;
        }
        stack.splice(0);
      }
      context.index++;
    }

    const location = this.createLocation(context, startIndex, context.index);
    const blockLocation = this.createLocation(context, startBlockIndex, context.index);
    const functionNode = this.createGetterNode(context, location, blockLocation);
    context.parsedNodes.push(functionNode);
    context.scope.pop();
  }
  public maskComment(source: string): string {
    return source.replace(/(\/\*(?:\*(?!\/)|[^*])*\*\/)/gsu, (substring) => {
      return '*'.repeat(substring.length);
    });
  }
  public createContext(sourceFile, prevContext?: ParserContext): ParserContext {
    const rootSource = readFileSync(sourceFile, 'utf-8');
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
    const startLine_base1 = Array.from(context.source.slice(0, startIndex).matchAll(/(\r)?\n/gu)).length + 1;
    const startColumn_base1 = (context.source.slice(0, startIndex).match(/(^|(\r)?\n)(?<lastLine>.+)$/u)?.groups?.lastLine.length ?? 0) + 1;
    const value = context.source.slice(startIndex, endIndex);
    const endLine_base0 = startLine_base1 + Array.from(value.matchAll(/(\r)?\n/gu)).length + 1;
    const endColumn_base0 = value.match(/(?<=^|(\r)?\n)(?<lastLine>.+)$/u)?.groups?.lastLine.length ?? 0;

    return {
      sourceFile: context.sourceFile,
      value,
      startIndex,
      endIndex,
      start: {
        line: startLine_base1,
        column: startColumn_base1,
      },
      end: {
        line: endLine_base0,
        column: endColumn_base0,
      },
    };
  }
  public createBlockLocation(context: ParserContext, indent: string): Location | undefined {
    const source = context.source.slice(context.index);
    const openBraceMatch = source.match(/\{/u);
    if (!openBraceMatch?.index) {
      return undefined;
    }
    const openBraceIndex = context.index + openBraceMatch.index;

    const closeBraceMatch = source.match(new RegExp(`(?<=(^|(\\r)?\\n|[\\uFEFF])${indent})\\}`, 'msiu'));
    if (!closeBraceMatch?.index) {
      return undefined;
    }
    const closeBraceindex = context.index + closeBraceMatch.index + 1;
    return this.createLocation(context, openBraceIndex, closeBraceindex);
  }
  public createSkipNode(context: ParserContext, contents: string): SkipNode {
    return {
      type: 'skip',
      scope: context.scope,
      location: this.createLocation(context, context.index, context.index + contents.length),
    };
  }
  public createClassNode(context: ParserContext, name: string, location: Location, blockLocation: Location): ClassNode {
    return {
      type: 'class',
      name,
      fullname: this.createFullName(context, name),
      scope: context.scope.slice(),
      location,
      block: blockLocation,
    };
  }
  public createFunctionNode(context: ParserContext, name: string, location: Location, blockLocation: Location): FunctionNode {
    return {
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
      type: 'property',
      name,
      fullname: this.createFullName(context, name),
      scope: context.scope.slice(),
      location,
      block: blockLocation,
      body,
    };
  }
  public createGetterNode(context: ParserContext, location: Location, blockLocation: Location): GetterNode {
    const name = 'set';
    return {
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
      type: 'setter',
      name,
      fullname: this.createFullName(context, name),
      scope: context.scope.slice(),
      location,
      blockLocation,
    };
  }
}
