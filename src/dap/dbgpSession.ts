import { EventEmitter } from 'events';
import { Socket } from 'net';
import * as xmlParse from 'xml-parser';
/**
 * @see https://xdebug.org/docs/dbgp#connection-initialization
 */
export class InitPacket {
  /**
   * defined by the debugger engine
   */
  public appId: string;
  /**
   * defined by the user. The DBGP_IDEKEY environment variable SHOULD be used if it is available, otherwise setting this value is debugger engine implementation specific. This value may be empty.
   */
  public ideKey: string;
  /**
   * If the environment variable DBGP_COOKIE exists, then the init packet MUST contain a session attribute with the value of the variable. This allows an IDE to execute a debugger engine, and maintain some state information between the execution and the protocol connection. This value should not be expected to be set in 'remote' debugging situations where the IDE is not in control of the process.
   */
  public session: string;
  /**
   * the systems thread id
   */
  public thread: string;
  /**
   * the appid of the application that spawned the process. When an application is executed, it should set it's APPID into the environment. If an APPID already exists, it should first read that value and use it as the PARENT_APPID.
   */
  public parent: string;
  /**
   * debugger engine specific, must not contain additional information, such as version, etc.
   */
  public language: string;
  /**
   * The highest version of this protocol supported
   */
  public protocolVersion: string;
  /**
   * URI of the script file being debugged
   */
  public fileUri: string;
  constructor(response: xmlParse.Document) {
    const { attributes } = response.root;
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
// See https://github.com/Lexikos/AutoHotkey_L/blob/master/source/Debugger.cpp#L42
type CommandName =
  'run' | 'step_into' | 'step_over' | 'step_out' | 'break' | 'stop' | 'detach' |
  'status' |
  'stack_get' | 'stack_depth' | 'context_get' | 'context_names' |
  'property_get' | 'property_set' | 'property_value' |
  'feature_get' | 'feature_set' |
  'breakpoint_set' | 'breakpoint_get' | 'breakpoint_update' | 'breakpoint_remove' | 'breakpoint_list' |
  'stdout' | 'stderr' |
  'typemap_get' |
  'source';
interface Command {
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
  constructor(response: xmlParse.Document) {
    const { attributes } = response.root;
    // if (name === 'error') {
    //   const code = parseInt(attributes.code, 10);
    //   const message = attributes.content;
    //   throw new DbgpError(message, code);
    // }
    this.transactionId = parseInt(attributes.transaction_id, 10);
    this.commandName = attributes.commandName as CommandName;
    this.success = Boolean(parseInt(attributes.success, 10));
  }
}
// See https://github.com/Lexikos/AutoHotkey_L/blob/master/source/Debugger.cpp#L451
type FeatureSetName = 'max_data' | 'max_children' | 'max_depth';
class FeatureSetResponse extends Response {
  public featureName: FeatureSetName;
  public success: boolean;
  constructor(response: xmlParse.Document) {
    super(response);
    const { feature, success } = response.root.attributes;
    this.featureName = feature as FeatureSetName;
    this.success = Boolean(parseInt(success, 10));
  }
}
export class DbgpSession extends EventEmitter {
  public static readonly ID = 1; // No need for multiple sessions
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

    this.on('message', (response: xmlParse.Document) => {
      if (response.root.name === 'init') {
        this.emit('init', new InitPacket(response));
        return;
      }

      const transactionId = parseInt(response.root.attributes.transaction_id, 10);
      if (this.pendingCommands.has(transactionId)) {
        const command = this.pendingCommands.get(transactionId);
        this.pendingCommands.delete(transactionId);
        this._isRunningContinuationCommand = false;
        command?.resolve(response);
      }

      if (0 < this.commandQueue.length) {
        const command = this.commandQueue.shift();
        if (command === undefined) {
          return;
        }

        this.sendCommand(command).catch(command.reject);
      }
    });
  }
  public async sendFeatureSetCommand(featureName: FeatureSetName, value: string | number): Promise<FeatureSetResponse> {
    return new FeatureSetResponse(await this.enqueueCommand('feature_set', `-n ${featureName} -v ${String(value)}`));
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
  private async enqueueCommand(commandName: CommandName, args?: string, data?: string, isContinuationCommand = false): Promise<xmlParse.Document> {
    return new Promise<xmlParse.Document>((resolve, reject) => {
      const command = { name: commandName, args, data, resolve, reject, isContinuationCommand } as Command;
      if (this.commandQueue.length === 0 && this.pendingCommands.size === 0) {
        this.sendCommand(command);
        return;
      }

      this.commandQueue.push(command);
    });
  }
  private async sendCommand(command: Command): Promise<void> {
    const transactionId = this.createTransactionId();
    let command_str = `${command.name} -i ${String(transactionId)}`;
    if (command.args !== undefined) {
      command_str += ` ${command.args}`;
    }
    if (command.data !== undefined) {
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
