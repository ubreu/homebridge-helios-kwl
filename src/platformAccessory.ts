import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

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
    active: false,
    speed: 0,
  };

  constructor(
    private readonly platform: HeliosVentilationPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
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
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 50,
      })
      .onGet(this.getRotationSpeed.bind(this))
      .onSet(this.setRotationSpeed.bind(this));
  }

  async getActive(): Promise<CharacteristicValue> {
    this.platform.log.debug('getActive');
    return await this.platform.hv.send(VentilationCommand.GetStatus).then(message => {
      const info = message as VentilationInfo;
      this.platform.log.debug('device info:', info);
      return this.isActive(info);
    });
  }

  setActive(value) {
    this.platform.log.debug('setActive' + value);
    this.platform.hv.send(value ? VentilationCommand.SetHome: VentilationCommand.SetAway);
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    this.platform.log.debug('getRotationSpeed');
    return await this.platform.hv.send(VentilationCommand.GetStatus).then(message => {
      const info = message as VentilationInfo;
      this.platform.log.debug('device info:', info);
      return this.determineRotationSpeed(info);
    });
  }

  setRotationSpeed(value) {
    this.platform.log.debug('setRotationSpeed' + value);
    this.platform.hv.send(value > 50 ? VentilationCommand.SetBoost : VentilationCommand.SetHome);
  }

  private isActive(info: VentilationInfo) {
    return info.deviceState === VentilationStatus.Home || info.deviceState === VentilationStatus.Boost;
  }

  private determineRotationSpeed(info: VentilationInfo) {
    return info.deviceState === VentilationStatus.Boost ? 100 : info.deviceState === VentilationStatus.Home ? 50 : 0;
  }
}
