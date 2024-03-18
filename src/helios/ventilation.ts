import { WebSocket } from 'ws';
import { Logger } from 'homebridge';
import { DeviceMap } from './deviceMap';

export enum VentilationCommand {
    GetStatus, SetHome, SetAway, SetBoost
}

export enum VentilationStatus {
    Home, Away, Boost, Fireplace
}

export interface VentilationAck {
    message: string;
}

export interface VentilationInfo {
    deviceModel: string;
    deviceType: string;
    serialNumber: string;
    deviceState: VentilationStatus;
}

export type VentilationMessage = VentilationInfo | VentilationAck;

/*
* Original source for reverse engineered message protocol for fetching ventilation status: https://github.com/sanchosk/helios2mqtt
*/
export class HeliosVentilation {

  private heliosHost: string;

  private heliosPort: number;

  private log: Logger;

  private promiseResolve: ((value: VentilationMessage | PromiseLike<VentilationMessage>) => void) | undefined = undefined;

  private promiseReject: ((reason?: string) => void) | undefined = undefined;

  constructor(heliosHost: string, heliosPort: number, log: Logger) {
    this.heliosHost = heliosHost;
    this.heliosPort = heliosPort;
    this.log = log;
  }

  async send(command: VentilationCommand): Promise<VentilationMessage> {
    const ws = await this.connect();

    let data;
    // determined by debugging bundle.js, line 3853 ('Message is received...')
    switch(command) {
      case VentilationCommand.SetHome:
        this.log.info('set ventilation mode to home/default');
        data = new Uint16Array(9);
        data[0] = 8, data[1] = 249, data[2] = 4609, data[3] = 0, data[4] = 4612, data[5] = 0, data[6] = 4613, data[7] = 0, data[8] = 14091;
        break;
      case VentilationCommand.SetAway:
        this.log.info('set ventilation mode to away');
        data = new Uint16Array(9);
        data[0] = 8, data[1] = 249, data[2] = 4609, data[3] = 1, data[4] = 4612, data[5] = 0, data[6] = 4613, data[7] = 0, data[8] = 14092;
        break;
      case VentilationCommand.SetBoost:
        this.log.info('set ventilation mode to boost');
        data = new Uint16Array(7);
        data[0] = 6, data[1] = 249, data[2] = 4612, data[3] = 30, data[4] = 4613, data[5] = 0, data[6] = 9510;
        break;
      case VentilationCommand.GetStatus:
      default:
        data = new Uint16Array(4);
        data[0] = 3, data[1] = 246, data[2] = 0, data[3] = 249;
    }
    if (ws.readyState === WebSocket.OPEN) {
      this.log.debug('sending data of length %d', data.byteLength);
      ws.send(data.buffer);
    }

    const cleanup = (message) => {
      this.log.debug('closing connection for command', command);
      ws.close();
      return message;
    };
    return new Promise<VentilationMessage>((resolve, reject) => {
      this.promiseResolve = resolve;
      this.promiseReject = reject;
    }).then(cleanup, cleanup);
  }

  private async connect(): Promise<WebSocket> {
    this.log.debug('Connecting to: ws://%s', this.heliosHost, this.heliosPort);
    const ws = new WebSocket('ws://' + this.heliosHost + ':' + this.heliosPort + '/');

    ws.on('close', (data) => {
      this.log.debug('connection closed');
    });
    ws.on('error', (data) => {
      this.log.error('connection error %s', data);
      this.reject('connection error');
    });
    ws.on('open', () => {
      this.log.debug('connection open');
      this.resolve({
        message: 'OPENED',
      });
    });
    ws.on('message', (data: ArrayBuffer) => this.handleMessageReceived(data));

    await this.connectionReady();
    return ws;
  }

  private connectionReady(): Promise<VentilationMessage> {
    return new Promise<VentilationMessage>((resolve, reject) => {
      this.promiseResolve = resolve;
      this.promiseReject = reject;
    });
  }

  private handleMessageReceived(data: ArrayBuffer) {
    this.log.debug('received data of length %d', data.byteLength);

    if (data.byteLength === 1410) {
      const deviceModel = DeviceMap.device_model_data[data[17 * 2 + 1]] || 'unknown';
      const deviceType = DeviceMap.device_type_data[data[16 * 2 + 1]] || 'unknown';
      const serialNumber = data[14 * 2] * 16777216 + data[14 * 2 + 1] * 65536 + data[15 * 2] * 256 + data[15 * 2 + 1] + '';

      // Based on https://github.com/sanchosk/helios2mqtt
      // the status is calculated:
      // IF fireplace timer is 0 and boost timer is 0 and state is 0 => 0
      // IF fireplace timer is not 0 => 3
      // IF boost timer is not 0 => 2
      // IF state is not 0 => 1
      // eq: a = 0 == u ? 0 == v ? 0 == Y ? 0 : 1 : 2 : 3
      const state = data[107 * 2 + 1];
      const fire = data[111 * 2 + 1];
      const boost = data[110 * 2 + 1];
      const deviceState = (
        0 === fire ?
          0 === boost ?
            0 === state ?
              VentilationStatus.Home : VentilationStatus.Away : VentilationStatus.Boost : VentilationStatus.Fireplace);
      const info = {
        deviceModel,
        deviceType,
        serialNumber,
        deviceState,
      };
      this.log.debug('received device info', info);
      this.resolve(info);
    } else if (data.byteLength === 6) {
      this.log.debug('received ACK');
      this.resolve({
        message: 'ACK',
      });
    } else {
      this.log.debug('received unexpected data');
      this.reject('received unexpected data');
    }
  }

  private resolve(message: VentilationMessage) {
    if (this.promiseResolve !== undefined) {
      this.promiseResolve(message);
    }
    this.promiseResolve = undefined;
    this.promiseReject = undefined;
  }

  private reject(message: string) {
    if (this.promiseReject !== undefined) {
      this.promiseReject(message);
    }
    this.promiseResolve = undefined;
    this.promiseReject = undefined;
  }
}

