import assert from 'assert';
import { Accessory, Characteristic, Service, uuid } from '@homebridge/hap-nodejs';
import { PlatformAccessory } from 'homebridge';

import { HeliosVentilationPlatform } from './platform';
import { HeliosVentilationPlatformAccessory } from './platformAccessory';
import { VentilationCommand, VentilationMessage, VentilationStatus } from './helios/ventilation';

const silentLog = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

/** Unit stand-in: records commands and reports `deviceState` on GetStatus. */
class FakeUnit {
  sent: VentilationCommand[] = [];

  deviceState: VentilationStatus;

  constructor(deviceState: VentilationStatus) {
    this.deviceState = deviceState;
  }

  async send(command: VentilationCommand): Promise<VentilationMessage> {
    if (command === VentilationCommand.GetStatus) {
      return { deviceModel: 'KWL 300 W L', deviceType: 'x', serialNumber: '1', deviceState: this.deviceState };
    }
    this.sent.push(command);
    return { message: 'ACK' };
  }
}

const flush = () => new Promise(resolve => setImmediate(resolve));

function createAccessory(unit: FakeUnit, accessory?: Accessory) {
  const hapAccessory = accessory ?? new Accessory('KWL', uuid.generate('helios-test'));
  const platformAccessory = hapAccessory as unknown as PlatformAccessory;
  platformAccessory.context = { info: { deviceModel: 'KWL 300 W L', serialNumber: '1' } };
  const platform = { Service, Characteristic, log: silentLog, hv: unit } as unknown as HeliosVentilationPlatform;
  new HeliosVentilationPlatformAccessory(platform, platformAccessory);
  return hapAccessory;
}

const modeSwitch = (accessory: Accessory, subtype: string) => accessory.getServiceById(Service.Switch, subtype)!;
const fan = (accessory: Accessory) => accessory.getService(Service.Fanv2)!;

describe('Platform accessory switches', () => {
  const realSetInterval = global.setInterval;

  beforeEach(() => {
    // the 15 s status poll is not under test; keep it from holding mocha open
    global.setInterval = (() => 0) as unknown as typeof setInterval;
  });

  afterEach(() => {
    global.setInterval = realSetInterval;
  });

  it('restores cached switches without duplicating them', async () => {
    const unit = new FakeUnit(VentilationStatus.Home);
    const accessory = createAccessory(unit);
    createAccessory(unit, accessory);
    assert.equal(accessory.services.filter(s => s.UUID === Service.Switch.UUID).length, 2);
  });

  it('names the switches for the Home app', () => {
    const accessory = createAccessory(new FakeUnit(VentilationStatus.Home));
    assert.equal(modeSwitch(accessory, 'fireplace').getCharacteristic(Characteristic.ConfiguredName).value, 'Fireplace');
    assert.equal(modeSwitch(accessory, 'boost').getCharacteristic(Characteristic.ConfiguredName).value, 'Boost');
  });

  it('reads the unit state right at startup', async () => {
    const accessory = createAccessory(new FakeUnit(VentilationStatus.Fireplace));
    await flush();
    assert.equal(modeSwitch(accessory, 'fireplace').getCharacteristic(Characteristic.On).value, true);
    assert.equal(fan(accessory).getCharacteristic(Characteristic.Active).value, Characteristic.Active.ACTIVE);
  });

  it('turning fireplace off right after startup returns the unit to home', async () => {
    const unit = new FakeUnit(VentilationStatus.Fireplace);
    const accessory = createAccessory(unit);
    await flush();
    await modeSwitch(accessory, 'fireplace').getCharacteristic(Characteristic.On).handleSetRequest(false);
    assert.deepEqual(unit.sent, [VentilationCommand.SetHome]);
  });

  it('turning fireplace on from away updates the fan tile immediately', async () => {
    const unit = new FakeUnit(VentilationStatus.Away);
    const accessory = createAccessory(unit);
    await flush();
    await modeSwitch(accessory, 'fireplace').getCharacteristic(Characteristic.On).handleSetRequest(true);
    assert.deepEqual(unit.sent, [VentilationCommand.SetFireplace]);
    assert.equal(fan(accessory).getCharacteristic(Characteristic.Active).value, Characteristic.Active.ACTIVE);
    assert.equal(fan(accessory).getCharacteristic(Characteristic.RotationSpeed).value, 50);
  });

  it('turning boost on sets the fan to 100 and switches fireplace off', async () => {
    const unit = new FakeUnit(VentilationStatus.Fireplace);
    const accessory = createAccessory(unit);
    await flush();
    await modeSwitch(accessory, 'boost').getCharacteristic(Characteristic.On).handleSetRequest(true);
    assert.deepEqual(unit.sent, [VentilationCommand.SetBoost]);
    assert.equal(modeSwitch(accessory, 'fireplace').getCharacteristic(Characteristic.On).value, false);
    assert.equal(fan(accessory).getCharacteristic(Characteristic.RotationSpeed).value, 100);
  });

  it('does not resend a mode that is already running', async () => {
    const unit = new FakeUnit(VentilationStatus.Boost);
    const accessory = createAccessory(unit);
    await flush();
    await modeSwitch(accessory, 'boost').getCharacteristic(Characteristic.On).handleSetRequest(true);
    assert.deepEqual(unit.sent, []);
  });
});
