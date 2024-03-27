import { PlatformConfig } from 'homebridge';

export interface HeliosVentilationPlatformConfig extends PlatformConfig {
    heliosHost: string;
    heliosPort: number;
}

export function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0;
}

export function isPositiveInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) > 0;
}