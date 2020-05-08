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
  isContinuationCommand: boolean;
}
// Comment out because I don't know the pattern of error response
// export class DbgpError extends Error {
//   public code: number;
//   constructor(message: string, code: number) {
//     super(message);
//     this.code = code;
//     this.message = message;
//     this.name = 'DbgpError';
//   }
// }
export class Response {
  public transactionId: number;
  public commandName: string;
  constructor(response: XmlNode) {
    const { transaction_id, command } = response.attributes;
    // if (name === 'error') {
    //   const code = parseInt(attributes.code, 10);
    //   const message = attributes.content;
    //   throw new DbgpError(message, code);
    // }
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
  constructor(response: XmlNode) {
    super(response);
    const { feature_name, supported } = response.attributes;

    this.featureName = feature_name as FeatureGetName;
    this.supported = Boolean(parseInt(supported, 10));
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
export type BreakpointType = 'line';
export type BreakpointState = 'enabled' | 'disabled';
export class Breakpoint {
  public id: number;
  public type: BreakpointType;
  public state: BreakpointState;
  public fileUri: string;
  public line: number;
  public temporary?: boolean;
  constructor(responseOrFileUri: XmlNode | string, line?: number) {
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
  public fileName: string;
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
    this.fileName = filename;
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
export class Session extends EventEmitter {
  public static singleton: Session;
  public readonly id: number = 1;
  private readonly socket: Socket;
  private readonly pendingCommands = new Map<number, Command>();
  private readonly commandQueue: Command[] = [];
  private transactionCounter = 1;
  private insufficientData: Buffer = Buffer.from('');
  private _isRunningContinuationCommand = false;
  public get isRunningContinuationCommand(): boolean {
    return this._isRunningContinuationCommand;
  }
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
          this._isRunningContinuationCommand = false;
          command?.resolve(xml.response);
        }

        if (0 < this.commandQueue.length) {
          const command = this.commandQueue.shift();
          if (typeof command === 'undefined') {
            return;
          }

          this.sendCommand(command).catch(command.reject);
        }
      }
    });
  }
  public async sendStackGetCommand(): Promise<StackGetResponse> {
    return new StackGetResponse(await this.enqueueCommand('stack_get'));
  }
  public async sendPropertyGetCommand(property: Property): Promise<PropertyGetResponse> {
    return new PropertyGetResponse(
      await this.enqueueCommand('property_get', `-n ${property.fullName} -c ${property.context.id} -d ${property.context.stackFrame.level}`),
      property.context,
    );
  }
  public async sendRunCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.enqueueContinuationCommand('run'));
  }
  public async sendBreakCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.enqueueContinuationCommand('break'));
  }
  public async sendStopCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.enqueueContinuationCommand('stop'));
  }
  public async sendStepIntoCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.enqueueContinuationCommand('step_into'));
  }
  public async sendStepOutCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.enqueueContinuationCommand('step_out'));
  }
  public async sendStepOverCommand(): Promise<ContinuationResponse> {
    return new ContinuationResponse(await this.enqueueContinuationCommand('step_over'));
  }
  public async sendContextNamesCommand(stackFrame: StackFrame): Promise<ContextNamesResponse> {
    return new ContextNamesResponse(await this.enqueueCommand('context_names'), stackFrame);
  }
  public async sendContextGetCommand(context: Context): Promise<ContextGetResponse> {
    return new ContextGetResponse(await this.enqueueCommand('context_get', `-c ${context.id} -d ${context.stackFrame.level}`), context);
  }
  public async sendFeatureGetCommand(featureName: FeatureGetName, value: string | number): Promise<FeatureGetResponse> {
    return new FeatureGetResponse(await this.enqueueCommand('feature_get', `-n ${featureName}`));
  }
  public async sendFeatureSetCommand(featureName: FeatureSetName, value: string | number): Promise<FeatureSetResponse> {
    return new FeatureSetResponse(await this.enqueueCommand('feature_set', `-n ${featureName} -v ${String(value)}`));
  }
  public async sendBreakpointGetCommand(breakpointId: number): Promise<BreakpointGetResponse> {
    return new BreakpointGetResponse(await this.enqueueCommand('breakpoint_get', `-d ${breakpointId}`));
  }
  public async sendBreakpointSetCommand(fileUri: string, line: number): Promise<BreakpointSetResponse> {
    return new BreakpointSetResponse(await this.enqueueCommand('breakpoint_set', `-t line -f ${fileUri} -n ${line}`));
  }
  public async sendBreakpointRemoveCommand(breakpoint: Breakpoint): Promise<Response> {
    return new Response(await this.enqueueCommand('breakpoint_remove', `-d ${String(breakpoint.id)}`));
  }
  public async sendBreakpointListCommand(): Promise<BreakpointListResponse> {
    return new BreakpointListResponse(await this.enqueueCommand('breakpoint_list'));
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
  private async enqueueCommand(commandName: CommandName, args?: string, data?: string, isContinuationCommand = false): Promise<XmlNode> {
    return new Promise<XmlNode>((resolve, reject) => {
      const command = { name: commandName, args, data, resolve, reject, isContinuationCommand: false } as Command;
      if (this.commandQueue.length === 0 && this.pendingCommands.size === 0) {
        this.sendCommand(command);
        return;
      }

      this.commandQueue.push(command);
    });
  }
  private async enqueueContinuationCommand(commandName: ContinuationCommandName, args?: string, data?: string): Promise<XmlNode> {
    return this.enqueueCommand(commandName, args, data, true);
  }
  private async sendCommand(command: Command): Promise<void> {
    const transactionId = this.createTransactionId();
    let command_str = `${command.name} -i ${String(transactionId)}`;
    if (typeof command.args !== 'undefined') {
      command_str += ` ${command.args}`;
    }
    if (typeof command.data !== 'undefined') {
      command_str += ` -- ${Buffer.from(command.data).toString('base64')}`;
    }
    command_str += '\0';

    this.pendingCommands.set(transactionId, command);
    this._isRunningContinuationCommand = command.isContinuationCommand;
    await this.write(command_str);
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
