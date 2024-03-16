import { PlatformConfig } from 'homebridge';

export interface HeliosVentilationPlatformConfig extends PlatformConfig {
    heliosHost: string;
    heliosPort: number;
}