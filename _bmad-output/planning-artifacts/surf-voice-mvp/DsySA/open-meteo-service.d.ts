export type Cardinal16 =
  | 'N' | 'NNE' | 'NE' | 'ENE' | 'E' | 'ESE' | 'SE' | 'SSE'
  | 'S' | 'SSW' | 'SW' | 'WSW' | 'W' | 'WNW' | 'NW' | 'NNW';

export type TideType = 'HIGH' | 'LOW' | null;

export interface SwellComponent {
  heightM: number | null;
  periodS: number | null;
  directionDeg: number | null;
  directionCardinal: Cardinal16 | null;
}

export interface SwellData {
  totalHeightM: number | null;
  primary: SwellComponent;
  secondary: SwellComponent;
  energyIndex: number;
}

export interface WindData {
  speedKnots: number | null;
  gustsKnots: number | null;
  directionDeg: number | null;
  directionCardinal: Cardinal16 | null;
}

export interface TideData {
  heightM: number | null;
  type: TideType;
}

export interface HourlyForecastPoint {
  timestamp: string;
  swell: SwellData;
  wind: WindData;
  tide: TideData;
  waterTempC: number | null;
}

export interface SpotLocation {
  lat: number;
  lon: number;
  timezone: string;
}

export interface NormalizedSurfForecast {
  spot: SpotLocation;
  timeline: HourlyForecastPoint[];
}

export interface FetchSurfForecastOptions {
  lat: number;
  lon: number;
  timezone?: string;
  forecastDays?: number;
}

export function degreesToCardinal(degrees: number | null | undefined): Cardinal16 | null;
export function calculateSwellEnergyIndex(heightM: number | null, periodS: number | null): number;
export function detectTideExtrema(heights: (number | null)[]): TideType[];
export function fetchSurfForecast(options: FetchSurfForecastOptions): Promise<NormalizedSurfForecast>;
