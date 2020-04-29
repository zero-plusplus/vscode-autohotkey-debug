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
export class DbgpSession extends EventEmitter {
  public static readonly ID = 1; // No need for multiple sessions
  private readonly socket: Socket;
  private restPackets: Buffer[] = [];
  private dataLength = 0;
  constructor(socket: Socket) {
    super();

    this.socket = socket
      .on('data', (packet: Buffer): void => this.handlePacket(packet))
      .on('error', (error: Error) => this.emit('error', error))
      .on('close', () => this.emit('close'));

    this.on('message', (response: xmlParse.Document) => {
      if (response.root.name === 'init') {
        this.emit('init', new InitPacket(response));
      }
    });
  }
  public async close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.socket.once('close', resolve);
      this.socket.end();
    });
  }
  public async sendCommand(command: string): Promise<void> {
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
    const terminatorIndex = packet.indexOf(0);
    const isCompleteReceived = -1 < terminatorIndex;
    if (isCompleteReceived) {
      let dataLength = parseInt(packet.slice(0, terminatorIndex).toString(), 10);
      const isReceivedDataLength = !isNaN(dataLength);
      if (isReceivedDataLength) {
        const responsePacket = packet.slice(terminatorIndex + 1);
        this.dataLength = dataLength;
        this.handlePacket(responsePacket);
        return;
      }

      // Received response
      dataLength = this.dataLength;
      const data = Buffer.concat([ ...this.restPackets, packet ]);

      // flush stored packet
      this.dataLength = 0;
      this.restPackets = [];

      const xml_str = data.slice(0, terminatorIndex).toString();
      const response = xmlParse(xml_str);
      this.emit('message', response);

      const restPacket = data.slice(terminatorIndex + 1);
      if (0 < restPacket.length) {
        this.handlePacket(restPacket);
      }

      return;
    }

    // Wait for next packet
    this.restPackets.push(packet);
  }
}
