import { VentilationStatus } from './ventilation';

/** The fan counts as running in every profile except Away. */
export function isActive(state: VentilationStatus): boolean {
  return state !== VentilationStatus.Away;
}

/** HomeKit rotation speed shown for a profile: Boost 100, Home/Fireplace 50, Away 0. */
export function rotationSpeed(state: VentilationStatus): number {
  switch (state) {
    case VentilationStatus.Boost:
      return 100;
    case VentilationStatus.Home:
    case VentilationStatus.Fireplace:
      return 50;
    default:
      return 0;
  }
}
