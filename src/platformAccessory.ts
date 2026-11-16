import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { HeliosVentilationPlatform } from './platform';
import { VentilationCommand, VentilationInfo, VentilationStatus } from './helios/ventilation';
import { isActive, rotationSpeed } from './helios/status';

interface ModeSwitch {
  service: Service;
  mode: VentilationStatus;
  on: boolean;
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HeliosVentilationPlatformAccessory {
  private service: Service;

  private modeSwitches: ModeSwitch[] = [];

  private state = {
    active: this.platform.Characteristic.Active.ACTIVE,
    speed: 0,
  };

  constructor(
    private readonly platform: HeliosVentilationPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.platform.log.info('register accessory', this.accessory.context.info);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Helios')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.info.deviceModel)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.info.serialNumber);

    // get the service if it exists, otherwise create a new Fanv2 service
    this.service = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.info.deviceModel);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Fanv2
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 50,
      })
      .onSet(this.setRotationSpeed.bind(this));

    this.addModeSwitch('fireplace', 'Fireplace', VentilationStatus.Fireplace, VentilationCommand.SetFireplace);
    this.addModeSwitch('boost', 'Boost', VentilationStatus.Boost, VentilationCommand.SetBoost);

    // read the unit right away so the state guards are correct before the first interval
    this.poll();
    setInterval(() => this.poll(), 15000);
  }

  async setActive(value) {
    this.platform.log.debug('setActive: ' + value);
    if (value !== this.state.active) {
      this.state.active = value;
      this.platform.hv.send(value ? VentilationCommand.SetHome: VentilationCommand.SetAway);
    }
  }

  async setRotationSpeed(value) {
    this.platform.log.debug('setRotationSpeed: ' + value);
    if (value !== this.state.speed) {
      this.state.speed = value;
      this.platform.hv.send(value > 50 ? VentilationCommand.SetBoost : VentilationCommand.SetHome);
    }
  }

  private poll() {
    this.platform.hv.send(VentilationCommand.GetStatus).then(message => {
      const info = message as VentilationInfo;
      this.platform.log.debug('updating characteristic with current device info', info);
      this.showState(info.deviceState);
    }, error => {
      this.platform.log.error('failed to update characteristic with the current status', error);
    });
  }

  /** Reflects a ventilation profile on the fan and the mode switches. */
  private showState(state: VentilationStatus) {
    const active = this.toActive(state);
    const speed = rotationSpeed(state);
    this.platform.log.debug('active characteristic: %s', active);
    this.platform.log.debug('rotation speed characteristic: %d', speed);
    this.state.active = active;
    this.state.speed = speed;
    this.service.updateCharacteristic(this.platform.Characteristic.Active, active);
    this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, speed);

    for (const modeSwitch of this.modeSwitches) {
      modeSwitch.on = modeSwitch.mode === state;
      modeSwitch.service.updateCharacteristic(this.platform.Characteristic.On, modeSwitch.on);
    }
  }

  /**
   * Adds (or restores from cache) a switch that starts a ventilation profile when turned on
   * and returns to Home when turned off. Its state is refreshed by the status poll.
   */
  private addModeSwitch(subtype: string, name: string, mode: VentilationStatus, onCommand: VentilationCommand) {
    const service = this.accessory.getServiceById(this.platform.Service.Switch, subtype)
      || this.accessory.addService(this.platform.Service.Switch, name, subtype);
    service.setCharacteristic(this.platform.Characteristic.Name, name);
    // the Home app labels secondary services by ConfiguredName; keep a name the user already set
    service.addOptionalCharacteristic(this.platform.Characteristic.ConfiguredName);
    const configuredName = service.getCharacteristic(this.platform.Characteristic.ConfiguredName);
    if (!configuredName.value) {
      configuredName.updateValue(name);
    }

    const modeSwitch: ModeSwitch = { service, mode, on: false };
    this.modeSwitches.push(modeSwitch);

    service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(async (value: CharacteristicValue) => {
        const on = value as boolean;
        this.platform.log.debug('set %s switch: %s', name, on);
        if (on === modeSwitch.on) {
          return;
        }
        // show the new profile right away (also turns the other switches off); the poll confirms it
        this.showState(on ? mode : VentilationStatus.Home);
        this.platform.hv.send(on ? onCommand : VentilationCommand.SetHome).catch(error => {
          this.platform.log.error('failed to set %s mode', name, error);
        });
      });
  }

  private toActive(state: VentilationStatus) {
    return isActive(state) ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE;
  }
}
