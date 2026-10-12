import { getDisplayName } from "./koreanCatalog";

export type ToolbarEntityType =
  | "aircraft"
  | "airbase"
  | "facility"
  | "ship"
  | "referencePoint"
  | "groundMarker"
  | "weapon"
  | "circle"
  | "drone"
  | "tank"
  | "other";

const DRONE_AIRCRAFT_PATTERN =
  /\b(drone|uav|uas|ucav|fpv|vtol|loitering|munition|suicide|one-way|kamikaze|robin|pandion|canister|sword|mq-|rq-|global hawk|predator|reaper|bayraktar|wing loong|heron)\b|자폭|드론|무인기|배회/i;

const TANK_FACILITY_PATTERN =
  /\b(tank|mbt|abrams|leopard|k1|k2|k9|k21|ifv|infantry fighting vehicle|apc|afv|armored|armoured|ugv|unmanned ground vehicle|humvee|hmmwv|km900|m113(?:a\d+)?|m577|stryker|bradley|bmp|btr|lav|aavp|k808|kaav|m-atv|matv|oshkosh|rcws|m1150|abv|miclic|obstacle breacher)\b/i;

const PRIORITY_AIRCRAFT_CLASS_NAMES = [
  "P-8A Poseidon",
  "KF-21 Boramae",
  "FA-50 Fighting Eagle",
];

const PRIORITY_TANK_FACILITY_CLASS_NAMES = [
  "K2 Black Panther",
  "K21 Infantry Fighting Vehicle",
  "K808 Wheeled Armored Vehicle",
  "KAAV Amphibious Assault Vehicle",
];

const FIRES_FACILITY_PATTERN =
  /\b(biho|chunmoo|kooryong|k136|mortar|ksm|surface to surface|artillery|howitzer|mlrs|rocket|launcher|hyunmoo|himars|paladin|k9|k55)\b/i;

const SUPPORT_AIRCRAFT_PATTERN =
  /\b(kc-|kc-330|mrtt|mrt|c-\d+|e-3|e-7|e-737|aew|aew&c|rc-|p-8|tanker|transport|awacs)\b/i;

const OTHER_FACILITY_PATTERN =
  /\b(soldier|rifle team|infantry team|mannequin|target dummy|target cluster|dummy target|quadruped|ground robot|robot dog|unitree|command post tent|command container)\b/i;

export function isDroneAircraftClassName(className?: string | null): boolean {
  return !!className && DRONE_AIRCRAFT_PATTERN.test(className);
}

export function isTankFacilityClassName(className?: string | null): boolean {
  return !!className && TANK_FACILITY_PATTERN.test(className);
}

export function isFiresFacilityClassName(className?: string | null): boolean {
  return !!className && FIRES_FACILITY_PATTERN.test(className);
}

export function isSupportAircraftClassName(className?: string | null): boolean {
  return !!className && SUPPORT_AIRCRAFT_PATTERN.test(className);
}

export function isOtherFacilityClassName(className?: string | null): boolean {
  return !!className && OTHER_FACILITY_PATTERN.test(className);
}

export function compareAircraftClassNames(
  leftClassName?: string | null,
  rightClassName?: string | null
): number {
  const leftPriority = PRIORITY_AIRCRAFT_CLASS_NAMES.indexOf(
    leftClassName ?? ""
  );
  const rightPriority = PRIORITY_AIRCRAFT_CLASS_NAMES.indexOf(
    rightClassName ?? ""
  );

  if (leftPriority !== -1 || rightPriority !== -1) {
    if (leftPriority === -1) return 1;
    if (rightPriority === -1) return -1;
    return leftPriority - rightPriority;
  }

  return getDisplayName(leftClassName).localeCompare(
    getDisplayName(rightClassName),
    "ko"
  );
}

export function compareTankFacilityClassNames(
  leftClassName?: string | null,
  rightClassName?: string | null
): number {
  const leftPriority = PRIORITY_TANK_FACILITY_CLASS_NAMES.indexOf(
    leftClassName ?? ""
  );
  const rightPriority = PRIORITY_TANK_FACILITY_CLASS_NAMES.indexOf(
    rightClassName ?? ""
  );

  if (leftPriority !== -1 || rightPriority !== -1) {
    if (leftPriority === -1) return 1;
    if (rightPriority === -1) return -1;
    return leftPriority - rightPriority;
  }

  return getDisplayName(leftClassName).localeCompare(
    getDisplayName(rightClassName),
    "ko"
  );
}
