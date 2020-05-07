// Ref: https://github.com/Lexikos/AutoHotkey_L/blob/master/source/Debugger.cpp
import { EventEmitter } from 'events';
import { Socket } from 'net';
import * as xmlParse from 'xml-parser';
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
  constructor(response: xmlParse.Node) {
    const { attributes } = response;

    this.appId = attributes.appid;
    this.ideKey = attributes.ide_key;
    this.session = attributes.session;
    this.thread = attributes.thread;
    this.parent = attributes.parent;
    this.language = attributes.language;
    this.protocolVersion = attributes.protocol_version;
    this.fileUri = attributes.fileuri;
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
  public success: boolean;
  constructor(response: xmlParse.Node) {
    const { transaction_id, command, success } = response.attributes;
    // if (name === 'error') {
    //   const code = parseInt(attributes.code, 10);
    //   const message = attributes.content;
    //   throw new DbgpError(message, code);
    // }
    this.transactionId = parseInt(transaction_id, 10);
    this.commandName = command as CommandName;
    this.success = Boolean(parseInt(success, 10));
  }
}
export type StackFrameType = 'file';
export class StackFrame {
  public level: number;
  public name: string;
  public type: StackFrameType;
  public fileUri: string;
  public line: number;
  constructor(stack: xmlParse.Node) {
    const { level, type, filename, lineno, where } = stack.attributes;

    this.level = parseInt(level, 10);
    this.name = where;
    this.type = type as StackFrameType;
    this.fileUri = filename;
    this.line = parseInt(lineno, 10);
  }
}
export class StackGetResponse extends Response {
  public stackFrames: StackFrame[] = [];
  constructor(response: xmlParse.Node) {
    super(response);

    response.children.forEach((stack) => {
      this.stackFrames.push(new StackFrame(stack));
    });
  }
}
export type ContinuationStatus = 'starting' | 'break' | 'running' | 'stopped';
export type ContinuationReason = 'ok' | 'error';
export class ContinuationResponse extends Response {
  public commandName: ContinuationCommandName;
  public reason: ContinuationReason;
  public status: ContinuationStatus;
  constructor(response: xmlParse.Node) {
    super(response);
    const { command, status, reason } = response.attributes;

    this.commandName = command as ContinuationCommandName;
    this.reason = reason as ContinuationReason;
    this.status = status as ContinuationStatus;
  }
}
export type FeatureGetName = 'language_supports_threads' | 'language_name' | 'language_version' | 'encoding' | 'protocol_version' | 'supports_async' | 'breakpoint_types';
export class FeatureGetResponse extends Response {
  public featureName: FeatureGetName;
  public supported: boolean;
  constructor(response: xmlParse.Node) {
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
  constructor(response: xmlParse.Node) {
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
  constructor(responseOrFileUri: xmlParse.Node | string, line?: number) {
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
  constructor(response: xmlParse.Node) {
    super(response);
    const { id, filename, lineno, state, type } = response.children[0].attributes;

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
  constructor(response: xmlParse.Node) {
    super(response);
    const { id, state } = response.attributes;

    this.id = parseInt(id, 10);
    this.state = state as BreakpointState;
  }
}
export class BreakpointListResponse extends Response {
  public breakpoints: Breakpoint[];
  constructor(response: xmlParse.Node) {
    super(response);
    const { children } = response;

    this.breakpoints = children.map((node) => new Breakpoint(node));
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

    this.on('message', (response: xmlParse.Node) => {
      if (response.name === 'init') {
        this.emit('init', new InitPacket(response));
        return;
      }

      const transactionId = parseInt(response.attributes.transaction_id, 10);
      if (this.pendingCommands.has(transactionId)) {
        const command = this.pendingCommands.get(transactionId);
        this.pendingCommands.delete(transactionId);
        this._isRunningContinuationCommand = false;
        command?.resolve(response);
      }

      if (0 < this.commandQueue.length) {
        const command = this.commandQueue.shift();
        if (typeof command === 'undefined') {
          return;
        }

        this.sendCommand(command).catch(command.reject);
      }
    });
  }
  public async sendStackGetCommand(): Promise<StackGetResponse> {
    return new StackGetResponse(await this.enqueueCommand('stack_get'));
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
  private async enqueueCommand(commandName: CommandName, args?: string, data?: string, isContinuationCommand = false): Promise<xmlParse.Node> {
    return new Promise<xmlParse.Node>((resolve, reject) => {
      const command = { name: commandName, args, data, resolve, reject, isContinuationCommand: false } as Command;
      if (this.commandQueue.length === 0 && this.pendingCommands.size === 0) {
        this.sendCommand(command);
        return;
      }

      this.commandQueue.push(command);
    });
  }
  private async enqueueContinuationCommand(commandName: ContinuationCommandName, args?: string, data?: string): Promise<xmlParse.Node> {
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
      const response = xmlParse(xml_str);
      this.emit('message', response.root);

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
