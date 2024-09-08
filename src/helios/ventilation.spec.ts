import { LogLevel, Logger } from 'homebridge';
import { HeliosVentilation, VentilationAck, VentilationCommand, VentilationInfo, VentilationMessage, VentilationStatus } from './ventilation';

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

  success(message: string, ...parameters: any[]): void {
    console.log(message, parameters);
  }
}

const heliosHost = '192.168.3.11';
const heliosPort = 80;
const logger = new TestLogger();

describe('Websocket Tests', () => {

  it('get status', async () => {
    const ws = new HeliosVentilation(heliosHost, heliosPort, logger);

    const info = await ws.send(VentilationCommand.GetStatus) as VentilationInfo;
    assert.equal(info.deviceModel, 'KWL 300 W L');
    assert.equal(info.deviceType, '40050-002');
  });

  it('set boost', async () => {
    const ws = new HeliosVentilation(heliosHost, heliosPort, logger);
    const ack = await ws.send(VentilationCommand.SetBoost) as VentilationAck;
    assert.equal(ack.message, 'ACK');

    const info = await ws.send(VentilationCommand.GetStatus) as VentilationInfo;
    assert.equal(info.deviceState, VentilationStatus.Boost);
  });

  it('correctly handles parallel status requests', async () => {
    const ws1 = new HeliosVentilation(heliosHost, heliosPort, logger);
    const ws2 = new HeliosVentilation(heliosHost, heliosPort, logger);
    const ws3 = new HeliosVentilation(heliosHost, heliosPort, logger);

    const promises:Promise<VentilationMessage>[] = [];
    promises.push(ws1.send(VentilationCommand.GetStatus));
    promises.push(ws2.send(VentilationCommand.GetStatus));
    promises.push(ws3.send(VentilationCommand.GetStatus));

    await Promise.allSettled(promises);
  });

  it('correctly handles parallel set status requests', async () => {
    const ws1 = new HeliosVentilation(heliosHost, heliosPort, logger);
    const ws2 = new HeliosVentilation(heliosHost, heliosPort, logger);
    const ws3 = new HeliosVentilation(heliosHost, heliosPort, logger);

    const promises:Promise<VentilationMessage>[] = [];
    promises.push(ws1.send(VentilationCommand.SetAway));
    promises.push(ws2.send(VentilationCommand.SetBoost));
    promises.push(ws3.send(VentilationCommand.SetHome));

    await Promise.allSettled(promises);
  });

});
