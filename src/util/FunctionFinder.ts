import { readFileSync } from 'fs';
import { AhkVersion, IncludePathResolver } from '@zero-plusplus/autohotkey-utilities';

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
export interface GetterNode extends NodeBase {
  type: 'getter';
  blockLocation: Location;
}
export interface SetterNode extends NodeBase {
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

export class FunctionFinder {
  private readonly sourceFile: string;
  private readonly version: AhkVersion;
  private readonly resolver: IncludePathResolver;
  constructor(sourceFile: string, version: string | AhkVersion) {
    this.sourceFile = sourceFile;
    this.version = typeof version === 'string' ? new AhkVersion(version) : version;
    this.resolver = new IncludePathResolver(this.version);
  }
  public find(name?: string | string[]): Node[] {
    const context = this.createContext(this.sourceFile);
    this.parse(context);
    return context.parsedNodes;
  }
  public matchTargets(context: ParserContext): RegExpMatchArray | null {
    const regex = new RegExp([
      '(?<skip>.*?)',
      '(',
      '(?<class>(?<=^|(\\r)?\\n)[^\\S\\r\\n]*class\\s+(?<className>[\\w_$@#]+)(\\s+extends\\s+(?<superClassName>[\\w_.$@#]+))?[\\s\\r\\n]*\\{)',
      '|',
      '(?<include>(?<=^|(\\r)?\\n)[^\\S\\r\\n]*#Include\\s+(\\*i\\s+)?(?<includePath>[^\\r\\n]+))',
      '|',
      '(?<func>(?<=^|(\\r)?\\n)[^\\S\\r\\n]*(?<funcName>[\\w_$@#]+)\\([\\s\\r\\n]*)',
      '|',
      '(?<property>(?<=^|(\\r)?\\n)[^\\S\\r\\n]*(?<propertyName>[\\w_$@#]+)(\\[|\\s*\\{))',
      ')',
    ].join(''), 'msiu');

    return context.source.slice(context.index).match(regex);
  }
  public parse(context: ParserContext): void {
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

    const blockLocation = this.createBlockLocation(context);
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

    const blockLocation = this.createBlockLocation(context);
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

    const blockLocation = this.createBlockLocation(context);
    if (!blockLocation) {
      return;
    }

    const regex = new RegExp([
      '(?<skip>.*?)',
      '(',
      '(?<getter>(?<=^|(\\r)?\\n)[^\\S\\r\\n]*get\\s*\\{)',
      '|',
      '(?<setter>(?<=^|(\\r)?\\n)[^\\S\\r\\n]*set\\s*\\{)',
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
        const blockLocation = this.createBlockLocation(context);
        if (!blockLocation) {
          break;
        }
        const location = this.createLocation(context, context.index, blockLocation.endIndex);
        body.getter = this.createGetterNode(context, location, blockLocation);
        context.index = blockLocation.endIndex;
      }
      else if (match.groups.setter) {
        const blockLocation = this.createBlockLocation(context);
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
  public createLocation(context: ParserContext, startIndex: number, endIndex: number): Location {
    const startLine_base0 = Array.from(context.source.slice(0, startIndex).matchAll(/(\r)?\n/gu)).length;
    const startColumn_base0 = context.source.slice(0, startIndex).match(/(^|(\r)?\n)(?<lastLine>.+)$/u)?.groups?.lastLine.length ?? 0;
    const value = context.source.slice(startIndex, endIndex);
    const endLine_base0 = startLine_base0 + Array.from(value.matchAll(/(\r)?\n/gu)).length + 1;
    const endColumn_base0 = value.match(/(?<=^|(\r)?\n)(?<lastLine>.+)$/u)?.groups?.lastLine.length ?? 0;

    return {
      sourceFile: context.sourceFile,
      value,
      startIndex,
      endIndex,
      start: {
        line: startLine_base0,
        column: startColumn_base0,
      },
      end: {
        line: endLine_base0,
        column: endColumn_base0,
      },
    };
  }
  public createBlockLocation(context: ParserContext): Location | undefined {
    const openBraceMatch = context.source.slice(context.index).match(/\{/u);
    if (!openBraceMatch?.index) {
      return undefined;
    }
    const startBlockIndex = context.index + openBraceMatch.index;
    const length = context.source.length;

    let isTeminated = false;
    let index = startBlockIndex + 1;
    let openBraceCount = 0;
    while (index < length) {
      const char = context.source.charAt(index);
      if ((/(\r)?\n/u).test(char)) {
        isTeminated = true;
      }
      else if (isTeminated && (/[^\s{}]/u).test(char)) {
        isTeminated = false;
      }
      else if (char === '{') {
        openBraceCount++;
      }
      else if (isTeminated && char === '}') {
        if (openBraceCount === 0) {
          break;
        }
        openBraceCount--;
      }
      index++;
    }
    return this.createLocation(context, startBlockIndex, index + 1);
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
      scope: context.scope.slice(),
      location,
      block: blockLocation,
    };
  }
  public createFunctionNode(context: ParserContext, name: string, location: Location, blockLocation: Location): FunctionNode {
    return {
      type: 'function',
      name,
      scope: context.scope.slice(),
      location,
      block: blockLocation,
    };
  }
  public createDynamicPropertyNode(context: ParserContext, name: string, location: Location, blockLocation: Location, body: DynamicPropertyBody): DynamicPropertyNode {
    return {
      type: 'property',
      name,
      scope: context.scope.slice(),
      location,
      block: blockLocation,
      body,
    };
  }
  public createGetterNode(context: ParserContext, location: Location, blockLocation: Location): GetterNode {
    return {
      type: 'getter',
      scope: context.scope.slice(),
      location,
      blockLocation,
    };
  }
  public createSetterNode(context: ParserContext, location: Location, blockLocation: Location): SetterNode {
    return {
      type: 'setter',
      scope: context.scope.slice(),
      location,
      blockLocation,
    };
  }
}
