// Ref: https://github.com/Lexikos/AutoHotkey_L/blob/master/source/Debugger.cpp
import { EventEmitter } from 'events';
import { Socket } from 'net';
import * as parser from 'fast-xml-parser';
import * as he from 'he';
import { rtrim } from 'underscore.string';

export interface XmlDocument {
  init?: XmlNode;
  response?: XmlNode;
}
export interface XmlNode {
  attributes: {
    [key: string]: string;
  };
  breakpoint?: XmlNode;
  content?: string;
  context?: XmlNode[];
  error?: XmlNode;
  property?: XmlNode[];
  stack?: XmlNode[];
  source?: XmlNode[];
}
/**
 * @see https://xdebug.org/docs/dbgp#connection-initialization
 */
export class InitPacket {
  public appId: string;
  public ideKey: string;
  public session: string;
  public thread: string;
  public parent: string;
  public language: string;
  public protocolVersion: string;
  public fileUri: string;
  constructor(response: XmlNode) {
    const { appid, ide_key, session, thread, parent, language, protocol_version, fileuri } = response.attributes;

    this.appId = appid;
    this.ideKey = ide_key;
    this.session = session;
    this.thread = thread;
    this.parent = parent;
    this.language = language;
    this.protocolVersion = protocol_version;
    this.fileUri = fileuri;
  }
}
export type ContinuationCommandName = 'run' | 'step_into' | 'step_over' | 'step_out' | 'break' | 'stop' | 'detach';
export type CommandName =
  ContinuationCommandName |
  'status' |
  'stack_get' | 'stack_depth' | 'context_get' | 'context_names' |
  'property_get' | 'property_set' | 'property_value' |
  'feature_get' | 'feature_set' |
  'breakpoint_set' | 'breakpoint_get' | 'breakpoint_update' | 'breakpoint_remove' | 'breakpoint_list' |
  'stdout' | 'stderr' |
  'typemap_get' |
  'source';
export interface Command {
  name: CommandName;
  args?: string;
  data?: string;
  resolve: (response: any) => any;
  reject: (error?: Error) => any;
}

const errorMssages = {
  '1': 'parse error in command',
  '3': 'invalid options (ie, missing a required option, invalid value for a passed option, not supported feature)',
  '4': 'Unimplemented command',
  '5': 'Command not available (Is used for async commands. For instance if the engine is in state "run" then only "break" and "status" are available).',
  '100': `can not open file (as a reply to a "source" command if the requested source file can't be opened)`,
  '200': 'breakpoint could not be set (for some reason the breakpoint could not be set due to problems registering it)',
  '201': `breakpoint type not supported (for example I don't support 'watch' yet and thus return this error)`,
  '202': 'invalid breakpoint (the IDE tried to set a breakpoint on a line that does not exist in the file (ie "line 0" or lines past the end of the file)',
  '203': 'no code on breakpoint line (the IDE tried to set a breakpoint on a line which does not have any executable code. The debugger engine is NOT required to return this type if it is impossible to determine if there is code on a given location. (For example, in the PHP debugger backend this will only be returned in some special cases where the current scope falls into the scope of the breakpoint to be set)).',
  '204': 'Invalid breakpoint state (using an unsupported breakpoint state was attempted)',
  '205': 'No such breakpoint (used in breakpoint_get etc. to show that there is no breakpoint with the given ID)',
  '300': 'Can not get property (when the requested property to get did not exist, this is NOT used for an existing but uninitialized property, which just gets the type "uninitialised" (See: PreferredTypeNames)).',
  '301': 'Stack depth invalid (the -d stack depth parameter did not exist (ie, there were less stack elements than the number requested) or the parameter was < 0)',
  '302': 'Context invalid (an non existing context was requested)',
  '998': 'An internal exception in the debugger occurred',
};

export class DbgpError extends Error {
  public code: number;
  constructor(code: string) {
    const message = errorMssages[code];
    super(message);

    this.name = 'DbgpError';
    this.message = message;
    this.code = parseInt(code, 10);
  }
}
export class Response {
  public transactionId: number;
  public commandName: string;
  constructor(response: XmlNode) {
    const { transaction_id, command } = response.attributes;

    if (response.error) {
      const { code } = response.error.attributes;
      throw new DbgpError(code);
    }

    this.transactionId = parseInt(transaction_id, 10);
    this.commandName = command as CommandName;
  }
}
export type StackFrameType = 'file';
export class StackFrame {
  public level: number;
  public name: string;
  public type: StackFrameType;
  public fileUri: string;
  public line: number;
  constructor(response: XmlNode) {
    const { level, type, filename, lineno, where } = response.attributes;

    this.level = parseInt(level, 10);
    this.name = where;
    this.type = type as StackFrameType;
    this.fileUri = filename;
    this.line = parseInt(lineno, 10);
  }
}
export class StackGetResponse extends Response {
  public stackFrames: StackFrame[] = [];
  constructor(response: XmlNode) {
    super(response);

    if (response.stack) {
      const stacks = Array.isArray(response.stack) ? response.stack : [ response.stack ];
      stacks.forEach((stack) => {
        this.stackFrames.push(new StackFrame(stack));
      });
    }
  }
}

type PropertyFacet = '' | 'Alias' | 'Builtin' | 'Static' | 'ClipboardAll';
type PropertyType = 'undefined' | 'string' | 'integer' | 'float' | 'object';
export abstract class Property {
  public context: Context;
  public facet: PropertyFacet;
  public fullName: string;
  public name: string;
  public type: PropertyType;
  public size: number;
  public get isIndex(): boolean {
    return this.index !== null;
  }
  public get index(): number | null {
    const match = this.name.match(/\[(?<index>\d+)\]/u);
    if (match?.groups?.index) {
      return parseInt(match.groups.index, 10);
    }
    return null;
  }
  public abstract get displayValue(): string;
  constructor(propertyNode: XmlNode, context: Context) {
    const { facet, fullname, name, type, size } = propertyNode.attributes;

    this.context = context;
    this.facet = facet as PropertyFacet;
    this.fullName = fullname;
    this.name = name;
    this.type = type as PropertyType;
    this.size = parseInt(size, 10);
  }
  public static from(propertyNode: XmlNode, context: Context): Property {
    if (propertyNode.attributes.type === 'object') {
      return new ObjectProperty(propertyNode, context);
    }
    return new PrimitiveProperty(propertyNode, context);
  }
}
export class ObjectProperty extends Property {
  public className: string;
  public children: Property[] = [];
  public maxIndex?: number;
  public address: number;
  public page: number;
  public pageSize: number;
  public get isArray(): boolean {
    return typeof this.maxIndex !== 'undefined';
  }
  public get displayValue(): string {
    let value = this.isArray
      ? `${this.className}(${this.maxIndex!}) [`
      : `${this.className} {`;
    for (const property of this.children) {
      if (50 < value.length) {
        value += '…';
        break;
      }
      if ('value' in property) {
        const primitiveProperty = property as PrimitiveProperty;
        value += this.isArray
          ? `${primitiveProperty.displayValue}, `
          : `${primitiveProperty.name}: ${primitiveProperty.displayValue}, `;
        continue;
      }

      const objectProperty = property as ObjectProperty;
      value += this.isArray
        ? `${objectProperty.className}, `
        : `${objectProperty.name}: ${objectProperty.className}, `;
    }

    value = rtrim(value, ', ');
    value += this.isArray ? ']' : '}';
    return value;
  }
  constructor(propertyNode: XmlNode, context: Context) {
    super(propertyNode, context);
    const { classname, address, page, pagesize } = propertyNode.attributes;

    this.className = classname;
    this.address = parseInt(address, 10);
    this.page = parseInt(page, 10);
    this.pageSize = parseInt(pagesize, 10);

    if (propertyNode.property) {
      let maxIndex = -1;
      const properties = Array.isArray(propertyNode.property) ? propertyNode.property : [ propertyNode.property ];
      properties.forEach((propertyNode) => {
        const match = propertyNode.attributes.name.match(/\[(?<index>\d+)\]/u);
        if (match?.groups) {
          const currentIndex = parseInt(match.groups.index, 10);
          if (maxIndex < currentIndex) {
            maxIndex = currentIndex;
          }
        }

        this.children.push(Property.from(propertyNode, context));
      });

      if (-1 < maxIndex) {
        this.maxIndex = maxIndex;
      }
    }
  }
}
export class PrimitiveProperty extends Property {
  public encoding: string;
  public value: string;
  public get displayValue(): string {
    if (this.type === 'string') {
      return `"${this.value}"`;
    }
    else if (this.type === 'undefined') {
      return 'Not initialized';
    }
    return this.value;
  }
  constructor(propertyNode: XmlNode, context: Context) {
    super(propertyNode, context);
    const { encoding } = propertyNode.attributes;

    this.encoding = encoding;
    this.value = 'content' in propertyNode ? Buffer.from(String(propertyNode.content), encoding as BufferEncoding).toString() : '';
  }
}
export class PropertyGetResponse extends Response {
  public properties: Property[] = [];
  constructor(response: XmlNode, context: Context) {
    super(response);

    if (response.property) {
      const properties = Array.isArray(response.property) ? response.property : [ response.property ];
      properties.forEach((property: XmlNode) => {
        this.properties.push(Property.from(property, context));
      });
    }
  }
}
export class PropertySetResponse extends Response {
  public success: boolean;
  constructor(response: XmlNode) {
    super(response);
    const { success } = response.attributes;

    this.success = Boolean(parseInt(success, 10));
  }
}
export type ContinuationStatus = 'starting' | 'break' | 'running' | 'stopped';
export type ContinuationReason = 'ok' | 'error';
export class ContinuationResponse extends Response {
  public commandName: ContinuationCommandName;
  public reason: ContinuationReason;
  public status: ContinuationStatus;
  constructor(response: XmlNode) {
    super(response);
    const { command, status, reason } = response.attributes;

    this.commandName = command as ContinuationCommandName;
    this.reason = reason as ContinuationReason;
    this.status = status as ContinuationStatus;
  }
}
export class Context {
  public id: number;
  public name: string;
  public stackFrame: StackFrame;
  constructor(id: number, name: string, stackFrame: StackFrame) {
    this.id = id;
    this.name = name;
    this.stackFrame = stackFrame;
  }
}
export class ContextNamesResponse extends Response {
  public contexts: Context[] = [];
  constructor(response: XmlNode, stackFrame: StackFrame) {
    super(response);

    if (response.context) {
      response.context.forEach(({ attributes: { id, name } }) => {
        this.contexts.push(new Context(parseInt(id, 10), name, stackFrame));
      });
    }
  }
}
export class ContextGetResponse extends Response {
  public context: Context;
  public properties: Property[] = [];
  constructor(response: XmlNode, context: Context) {
    super(response);

    this.context = context;
    if (response.property) {
      const properties = Array.isArray(response.property) ? response.property : [ response.property ];
      properties.forEach((property) => {
        this.properties.push(Property.from(property, context));
      });
    }
  }
}
export type FeatureGetName = 'language_supports_threads' | 'language_name' | 'language_version' | 'encoding' | 'protocol_version' | 'supports_async' | 'breakpoint_types';
export class FeatureGetResponse extends Response {
  public featureName: FeatureGetName;
  public supported: boolean;
  public value: string;
  constructor(response: XmlNode) {
    super(response);
    const { feature_name, supported } = response.attributes;

    this.featureName = feature_name as FeatureGetName;
    this.supported = Boolean(parseInt(supported, 10));
    this.value = String(response.content);
  }
}
export type FeatureSetName = 'max_data' | 'max_children' | 'max_depth';
export class FeatureSetResponse extends Response {
  public featureName: FeatureSetName;
  public success: boolean;
  constructor(response: XmlNode) {
    super(response);
    const { feature, success } = response.attributes;

    this.featureName = feature as FeatureSetName;
    this.success = Boolean(parseInt(success, 10));
  }
}
export type BreakpointConditionType = 'condition' | 'hit' | 'log';
export interface BreakpointAdvancedData {
  counter: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}
export type BreakpointType = 'line';
export type BreakpointState = 'enabled' | 'disabled';
export class Breakpoint {
  public id: number;
  public type: BreakpointType;
  public state: BreakpointState;
  public fileUri: string;
  public line: number;
  public temporary?: boolean;
  public advancedData?: BreakpointAdvancedData;
  constructor(responseOrFileUri: XmlNode | string, line?: number, advancedData?: BreakpointAdvancedData) {
    if (typeof responseOrFileUri === 'object') {
      const response = responseOrFileUri;
      const { id, type, state, filename, lineno, temporary } = response.attributes;

      this.id = parseInt(id, 10);
      this.type = type as BreakpointType;
      this.state = state as BreakpointState;
      this.fileUri = filename;
      this.line = parseInt(lineno, 10);
      this.temporary = Boolean(parseInt(temporary, 10));
    }
    else if (typeof line === 'number') {
      const fileName = responseOrFileUri;

      this.id = -1;
      this.type = 'line';
      this.state = 'enabled';
      this.fileUri = fileName;
      this.line = line;
      this.temporary = false;

      if (advancedData) {
        this.advancedData = advancedData;
      }
    }
    else {
      throw Error('The argument is invalid');
    }
  }
}
export class BreakpointGetResponse extends Response {
  public id: number;
  public type: BreakpointType;
  public state: BreakpointState;
  public fileUri: string;
  public line: number;
  constructor(response: XmlNode) {
    super(response);
    if (typeof response.breakpoint === 'undefined') {
      throw Error('');
    }
    const { id, filename, lineno, state, type } = response.breakpoint.attributes;

    this.id = parseInt(id, 10);
    this.type = type as BreakpointType;
    this.state = state as BreakpointState;
    this.fileUri = filename;
    this.line = parseInt(lineno, 10);
  }
}
export class BreakpointSetResponse extends Response {
  public id: number;
  public state: BreakpointState;
  constructor(response: XmlNode) {
    super(response);
    const { id, state } = response.attributes;

    this.id = parseInt(id, 10);
    this.state = state as BreakpointState;
  }
}
export class BreakpointListResponse extends Response {
  public readonly breakpoints: Breakpoint[] = [];
  constructor(response: XmlNode) {
    super(response);

    if (response.breakpoint) {
      const breakpoints = Array.isArray(response.breakpoint) ? response.breakpoint : [ response.breakpoint ];
      breakpoints.forEach((breakpoint) => {
        this.breakpoints.push(new Breakpoint(breakpoint));
      });
    }
  }
}
export class Source {
  public source;
  constructor(source: XmlNode) {
    this.source = source;
  }
}
export class SourceResponse extends Response {
  public sources: Source[] = [];
  constructor(response: XmlNode) {
    super(response);

    if (response.source) {
      const sources = Array.isArray(response.source) ? response.source : [ response.source ];
      sources.forEach((source) => {
        this.sources.push(new Source(source));
      });
    }
  }
}
export class Session extends EventEmitter {
  public static singleton: Session;
  public readonly id: number = 1;
  private readonly socket: Socket;
  private readonly pendingCommands = new Map<number, Command>();
  private transactionCounter = 1;
  private insufficientData: Buffer = Buffer.from('');
  constructor(socket: Socket) {
    super();
    this.socket = socket
      .on('data', (packet: Buffer): void => this.handlePacket(packet))
      .on('error', (error: Error) => this.emit('error', error))
      .on('close', () => this.emit('close'));

    this.on('message', (xml: XmlDocument) => {
      if (xml.init) {
        this.emit('init', new InitPacket(xml.init));
      }
      else if (xml.response) {
        const transactionId = parseInt(xml.response.attributes.transaction_id, 10);
        if (this.pendingCommands.has(transactionId)) {
          const command = this.pendingCommands.get(transactionId);
          this.pendingCommands.delete(transactionId);
          command?.resolve(xml.response);
        }
      }
    });
  }
  public async sendStackGetCommand(): Promise<StackGetResponse> {
    return new StackGetResponse(await this.sendCommand('stack_get'));
  }
  public async sendPropertyGetCommand(context: Context, name: string): Promise<PropertyGetResponse> {
    return new PropertyGetResponse(
      await this.sendCommand('property_get', `-n ${name} -c ${context.id} -d ${context.stackFrame.level}`),
      context,
    );
  }
  public async sendPropertySetCommand(property: { context: Context; fullName: string; typeName: string; data: string }): Promise<PropertySetResponse> {
    return new PropertySetResponse(await this.sendCommand('property_set', `-c ${property.context.id} -d ${property.context.stackFrame.level} -n ${property.fullName} -t ${property.typeName}`, property.data));
  }
  public async sendRunCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.sendCommand('run'));
  }
  public async sendBreakCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.sendCommand('break'));
  }
  public async sendStopCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.sendCommand('stop'));
  }
  public async sendStepIntoCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.sendCommand('step_into'));
  }
  public async sendStepOutCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.sendCommand('step_out'));
  }
  public async sendStepOverCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.sendCommand('step_over'));
  }
  public async sendContextNamesCommand(stackFrame: StackFrame): Promise<ContextNamesResponse> {
    return new ContextNamesResponse(await this.sendCommand('context_names'), stackFrame);
  }
  public async sendContextGetCommand(context: Context): Promise<ContextGetResponse> {
    return new ContextGetResponse(await this.sendCommand('context_get', `-c ${context.id} -d ${context.stackFrame.level}`), context);
  }
  public async sendFeatureGetCommand(featureName: FeatureGetName): Promise<FeatureGetResponse> {
    return new FeatureGetResponse(await this.sendCommand('feature_get', `-n ${featureName}`));
  }
  public async sendFeatureSetCommand(featureName: FeatureSetName, value: string | number): Promise<FeatureSetResponse> {
    return new FeatureSetResponse(await this.sendCommand('feature_set', `-n ${featureName} -v ${String(value)}`));
  }
  public async sendBreakpointGetCommand(breakpointId: number): Promise<BreakpointGetResponse> {
    return new BreakpointGetResponse(await this.sendCommand('breakpoint_get', `-d ${breakpointId}`));
  }
  public async sendBreakpointSetCommand(fileUri: string, line: number): Promise<BreakpointSetResponse> {
    return new BreakpointSetResponse(await this.sendCommand('breakpoint_set', `-t line -f ${fileUri} -n ${line}`));
  }
  public async sendBreakpointRemoveCommand(breakpoint: Breakpoint): Promise<Response> {
    return new Response(await this.sendCommand('breakpoint_remove', `-d ${String(breakpoint.id)}`));
  }
  public async sendBreakpointListCommand(): Promise<BreakpointListResponse> {
    return new BreakpointListResponse(await this.sendCommand('breakpoint_list'));
  }
  public async fetchPrimitiveProperty(propertyName: string): Promise<string | null> {
    for await (const contextId of [ 0, 1 ]) {
      const response = await this.sendCommand('property_get', `-n ${propertyName} -c ${contextId}`);
      if (response.property) {
        const [ property ] = Array.isArray(response.property) ? response.property : [ response.property ];
        const value = property.content
          ? Buffer.from(property.content, property.attributes.encoding as BufferEncoding).toString()
          : '';
        return value;
      }
    }

    return null;
  }
  public async close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.socket.once('close', resolve);
      this.socket.end();
    });
  }
  private createTransactionId(): number {
    this.transactionCounter += 1;
    return this.transactionCounter;
  }
  private async sendCommand(commandName: CommandName, args?: string, data?: string): Promise<XmlNode> {
    return new Promise<XmlNode>((resolve, reject) => {
      const transactionId = this.createTransactionId();
      let command_str = `${commandName} -i ${String(transactionId)}`;
      if (typeof args !== 'undefined') {
        command_str += ` ${args}`;
      }
      if (typeof data !== 'undefined') {
        command_str += ` -- ${Buffer.from(data).toString('base64')}`;
      }
      command_str += '\0';

      this.pendingCommands.set(transactionId, {
        name: commandName,
        args,
        data,
        resolve,
        reject,
      } as Command);
      this.write(command_str);
    });
  }
  private async write(command: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.socket.writable) {
        reject(new Error('Socket not writable.'));
      }

      this.socket.write(Buffer.from(command), (err) => {
        if (err) {
          reject(new Error('Some error occurred when writing'));
        }
        resolve();
      });
    });
  }
  private handlePacket(packet: Buffer): void {
    // As shown in the example below, the data passed from dbgp is divided into data length and response.
    // https://xdebug.org/docs/dbgp#response
    //     data_length
    //     [NULL]
    //     <?xml version="1.0" encoding="UTF-8"?>
    //     <response xmlns="urn:debugger_protocol_v1"
    //               command="command_name"
    //               transaction_id="transaction_id"/>
    //     [NULL]
    const currentPacket = Buffer.concat([ this.insufficientData, packet ]);
    this.insufficientData = Buffer.from('');

    const terminatorIndex = currentPacket.indexOf(0);
    const isCompleteReceived = -1 < terminatorIndex;
    if (isCompleteReceived) {
      const data = currentPacket.slice(0, terminatorIndex);
      const isReceivedDataLength = !isNaN(parseInt(data.toString(), 10));
      if (isReceivedDataLength) {
        const responsePacket = currentPacket.slice(terminatorIndex + 1);
        this.handlePacket(responsePacket);
        return;
      }

      // Received response
      const xml_str = data.toString();
      const response = parser.parse(xml_str, {
        attributeNamePrefix: '',
        attrNodeName: 'attributes',
        textNodeName: 'content',
        ignoreAttributes: false,
        parseNodeValue: false,
        attrValueProcessor: (value: string, attrName: string) => String(he.decode(value, { isAttributeValue: true })),
        tagValueProcessor: (value: string, tagName: string) => String(he.decode(value)),
      });

      this.emit('message', response);

      const restPacket = currentPacket.slice(terminatorIndex + 1);
      if (0 < restPacket.length) {
        this.handlePacket(restPacket);
      }
      return;
    }

    // Wait for next packet
    this.insufficientData = currentPacket;
  }
}
