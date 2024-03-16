import { LogLevel, Logger } from 'homebridge';
import { HeliosVentilation, VentilationAck, VentilationCommand, VentilationInfo, VentilationStatus } from './ventilation';

import assert from 'assert';


class TestLogger implements Logger {
  prefix?: string | undefined;
  info(message: string, ...parameters: any[]): void {
    console.log(message, parameters);
  }

  warn(message: string, ...parameters: any[]): void {
    console.log(message, parameters);
  }

  error(message: string, ...parameters: any[]): void {
    console.log(message, parameters);
  }

  debug(message: string, ...parameters: any[]): void {
    console.log(message, parameters);
  }

  log(level: LogLevel, message: string, ...parameters: any[]): void {
    console.log(message, parameters);
  }
}

const heliosHost = '192.168.3.11';
const heliosPort = 80;
const logger = new TestLogger();

describe('Websocket Tests', () => {
  it('get status', async () => {
    const ws = new HeliosVentilation(heliosHost, heliosPort, logger);
    const ack = await ws.open() as VentilationAck;
    assert.equal(ack.message, 'OPENED');

    const info = await ws.send(VentilationCommand.GetStatus) as VentilationInfo;
    assert.equal(info.deviceModel, 'KWL 300 W L');
    assert.equal(info.deviceType, '40050-002');
  });

  it('set boost', async () => {
    const ws = new HeliosVentilation(heliosHost, heliosPort, logger);
    let ack = await ws.open() as VentilationAck;
    assert.equal(ack.message, 'OPENED');

    ack = await ws.send(VentilationCommand.SetBoost) as VentilationAck;
    assert.equal(ack.message, 'ACK');

    const info = await ws.send(VentilationCommand.GetStatus) as VentilationInfo;
    assert.equal(info.deviceState, VentilationStatus.Boost);
  });
});
