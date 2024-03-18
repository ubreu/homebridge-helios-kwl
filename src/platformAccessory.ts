import { Service, PlatformAccessory } from 'homebridge';

import { HeliosVentilationPlatform } from './platform';
import { VentilationCommand, VentilationInfo, VentilationStatus } from './helios/ventilation';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HeliosVentilationPlatformAccessory {
  private service: Service;

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

    /**
     * Updating characteristics values asynchronously.
     */
    setInterval(() => {
      this.platform.hv.send(VentilationCommand.GetStatus).then(message => {
        const info = message as VentilationInfo;
        this.platform.log.debug('updating characteristic with current device info', info);
        const active = this.isActive(info);
        const speed = this.getRotationSpeed(info);
        this.platform.log.debug('active characteristic: %s', active);
        this.platform.log.debug('rotation speed characteristic: %d', speed);
        this.state.active = active;
        this.state.speed = speed;

        this.service.updateCharacteristic(this.platform.Characteristic.Active, active);
        this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, speed);

        return this.isActive(info);
      }, error => {
        this.platform.log.error('failed to update characteristic with the current status', error);
      });
    }, 15000);

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

  private isActive(info: VentilationInfo) {
    if(info.deviceState === VentilationStatus.Home || info.deviceState === VentilationStatus.Boost) {
      return this.platform.Characteristic.Active.ACTIVE;
    }
    return this.platform.Characteristic.Active.INACTIVE;
  }

  private getRotationSpeed(info: VentilationInfo) {
    return info.deviceState === VentilationStatus.Boost ? 100 : info.deviceState === VentilationStatus.Home ? 50 : 0;
  }
}
