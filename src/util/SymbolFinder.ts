import { readFileSync } from 'fs';
import { AhkVersion, ImplicitLibraryPathExtractor, IncludePathResolver } from '@zero-plusplus/autohotkey-utilities';

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
  public matchTargets(context: ParserContext): RegExpMatchArray | null {
    const source = context.source.slice(context.index);

    const matchResults: Array<RegExpMatchArray | null> = [];
    const classRegExp = /(?<skip>.*?)(?<class>(?<=^|(\r)?\n|\uFEFF)(?<classIndent>[^\S\r\n\uFEFF]*)class\s+(?<className>[\w_$@#]+)(\s+extends\s+(?<superClassName>[\w_.$@#]+))?\s*\{)/msiu;
    matchResults.push(source.match(classRegExp));

    const includeRegExp = /(?<skip>.*?)(?<include>(?<=^|(\r)?\n|\uFEFF)[^\S\r\n\uFEFF]*#Include\s+(\*i\s+)?(?<includePath>[^\r\n]+))/msiu;
    matchResults.push(source.match(includeRegExp));

    const funcRegExp = /(?<skip>.*?)(?<func>(?<=^|(\r)?\n|\uFEFF)(?<funcIndent>[^\S\r\n\uFEFF]*)(?<funcName>[\w_$@#]+)\([^)]*\)[\s\r\n]*\{)/msiu;
    matchResults.push(source.match(funcRegExp));

    const propertyRegExp = /(?<skip>.*?)(?<property>(?<=^|(\r)?\n|\uFEFF)(?<propertyIndent>[^\S\r\n\uFEFF]*)(?<propertyName>[\w_$@#]+)(\[[^\]*]\])?\s*\{)/msiu;
    matchResults.push(source.match(propertyRegExp));

    const sorted = matchResults
      .filter((result) => typeof result?.index === 'number')
      .sort((a, b) => {
        let index_a = a!.index!;
        if (a?.groups?.skip) {
          index_a += a.groups.skip.length;
        }
        let index_b = b!.index!;
        if (b?.groups?.skip) {
          index_b += b.groups.skip.length;
        }
        return index_a - index_b;
      });
    return sorted[0];
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
    while (true) {
      const match = this.matchTargets(context);
      if (!match?.groups) {
        break;
      }

      if (match.groups.skip) {
        this.parseSkipNode(context, match.groups.skip);
        continue;
      }
      else if (match.groups.include) {
        this.parseIncludeNode(context);
        continue;
      }
      else if (match.groups.class) {
        this.parseClassNode(context);
        continue;
      }
      else if (match.groups.func) {
        this.parseFunctionNode(context);
        continue;
      }
    }
  }
  public parseClassNode(context: ParserContext): void {
    const match = this.matchTargets(context);
    if (!match?.groups) {
      return;
    }

    if (match.groups.skip) {
      this.parseSkipNode(context, match.groups.skip);
      this.parseClassNode(context);
      return;
    }

    const blockLocation = this.createBlockLocation(context, match.groups.classIndent);
    if (!blockLocation) {
      return;
    }

    const location = this.createLocation(context, context.index, blockLocation.endIndex);
    const classNode = this.createClassNode(context, match.groups.className, location, blockLocation);
    context.parsedNodes.push(classNode);
    context.index = blockLocation.startIndex + 1;

    context.scope.push(classNode.name);
    while (true) {
      if (blockLocation.endIndex <= context.index) {
        break;
      }

      const match = this.matchTargets(context);
      if (!match?.groups) {
        break;
      }

      if (match.groups.skip) {
        this.parseSkipNode(context, match.groups.skip);
      }
      else if (match.groups.class) {
        this.parseClassNode(context);
      }
      else if (match.groups.func) {
        this.parseFunctionNode(context);
      }
      else if (match.groups.property) {
        this.parseDynamicPropertyNode(context);
      }
      else if (match.groups.include) {
        this.parseIncludeNode(context);
      }
    }
    context.scope.pop();
  }
  public parseSkipNode(context: ParserContext, contents: string): void {
    context.index += contents.length;
    context.parsedNodes.push(this.createSkipNode(context, contents));
  }
  public parseIncludeNode(context: ParserContext): void {
    const match = this.matchTargets(context);
    if (!match?.groups) {
      return;
    }

    if (match.groups.skip) {
      this.parseSkipNode(context, match.groups.skip);
      this.parseFunctionNode(context);
      return;
    }

    if (!match.groups.include) {
      return;
    }

    const includePath = this.resolver.resolve(match.groups.includePath, {
      A_LineFile: context.sourceFile,
    });
    const newContext = this.createContext(includePath, context);
    this.parse(newContext);

    context.index += match.groups.include.length;
    context.parsedNodes.push(...newContext.parsedNodes);
  }
  public parseFunctionNode(context: ParserContext): void {
    const match = this.matchTargets(context);
    if (!match?.groups) {
      return;
    }

    if (match.groups.skip) {
      this.parseSkipNode(context, match.groups.skip);
      this.parseFunctionNode(context);
      return;
    }

    const blockLocation = this.createBlockLocation(context, match.groups.funcIndent);
    if (!blockLocation) {
      return;
    }
    const location = this.createLocation(context, context.index, blockLocation.endIndex);
    const functionNode = this.createFunctionNode(context, match.groups.funcName, location, blockLocation);
    context.parsedNodes.push(functionNode);
    context.index = blockLocation.startIndex + 1;

    context.scope.push(functionNode.name);
    if (match.groups.func) {
      while (true) {
        if (blockLocation.endIndex <= context.index) {
          break;
        }

        const match = this.matchTargets(context);
        if (!match?.groups) {
          break;
        }

        if (match.groups.skip) {
          this.parseSkipNode(context, match.groups.skip);
        }
        else {
          this.parseFunctionNode(context);
        }
      }
    }
    context.index = functionNode.location.endIndex + 1;
    context.scope.pop();
  }
  public parseDynamicPropertyNode(context: ParserContext): void {
    const match = this.matchTargets(context);
    if (!match?.groups) {
      return;
    }

    if (match.groups.skip) {
      this.parseSkipNode(context, match.groups.skip);
      this.parseFunctionNode(context);
      return;
    }

    const blockLocation = this.createBlockLocation(context, match.groups.propertyIndent);
    if (!blockLocation) {
      return;
    }

    const regex = new RegExp([
      '(?<skip>.*?)',
      '(',
      '(?<getter>(?<=^|(\\r)?\\n)(?<getterIndent>[ \\t]*)get\\s*\\{)',
      '|',
      '(?<setter>(?<=^|(\\r)?\\n)(?<setterIndent>[ \\t]*)set\\s*\\{)',
      ')',
    ].join(''), 'ui');

    context.index = blockLocation.startIndex + 1;
    const body: DynamicPropertyBody = {};
    while (true) {
      if (body.setter && body.getter) {
        break;
      }

      const match = context.source.slice(context.index).match(regex);
      if (!match?.groups) {
        break;
      }

      if (match.groups.skip) {
        this.parseSkipNode(context, match.groups.skip);
      }
      else if (match.groups.getter) {
        const blockLocation = this.createBlockLocation(context, match.groups.getterIndent);
        if (!blockLocation) {
          break;
        }
        const location = this.createLocation(context, context.index, blockLocation.endIndex);
        body.getter = this.createGetterNode(context, location, blockLocation);
        context.index = blockLocation.endIndex;
      }
      else if (match.groups.setter) {
        const blockLocation = this.createBlockLocation(context, match.groups.setterIndent);
        if (!blockLocation) {
          break;
        }
        const location = this.createLocation(context, context.index, blockLocation.endIndex);
        body.setter = this.createSetterNode(context, location, blockLocation);
        context.index = blockLocation.endIndex;
      }
    }

    const location = this.createLocation(context, context.index, blockLocation.endIndex);
    const dynamicProperty = this.createDynamicPropertyNode(context, match.groups.propertyName, location, blockLocation, body);

    context.index = dynamicProperty.location.endIndex;
    context.parsedNodes.push(dynamicProperty);
  }
  public createContext(sourceFile, prevContext?: ParserContext): ParserContext {
    const rootSource = readFileSync(sourceFile, 'utf-8');
    const context: ParserContext = {
      ...prevContext,
      sourceFile,
      source: rootSource,
      index: 0,
      scope: prevContext?.scope.slice() ?? [],
      parsedNodes: [],
    };
    return context;
  }
  public createFullName(context: ParserContext, name: string): string {
    if (0 < context.scope.length) {
      return `${context.scope.join('')}.${name}`;
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
