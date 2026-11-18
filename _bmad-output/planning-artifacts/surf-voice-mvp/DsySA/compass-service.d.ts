/**
 * Typings for DsySA Compass Service (Mobile Sensors & Real-time Live Compass)
 */

export type CompassStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unsupported'
  | 'insecure_context'
  | 'error';

export interface CompassState {
  isActive: boolean;
  status: CompassStatus;
  errorMessage: string | null;
  heading: number; // 0 to 359 smoothed & normalized
  rawHeading: number;
  cardinal: string; // 'N', 'NE', 'ESE', etc.
  dialRotation: number; // Continuous smoothed rotation in degrees (-heading)
  isSupported: boolean;
  isSecure: boolean;
}

export interface CompassServiceOptions {
  smoothingFactor?: number; // Default: 0.18 (Low-pass EMA alpha)
}

export declare class CompassService {
  constructor(options?: CompassServiceOptions);
  smoothingFactor: number;
  isActive: boolean;
  status: CompassStatus;
  errorMessage: string | null;
  currentHeading: number;
  rawHeading: number;
  cardinalPoint: string;
  filteredDialRotation: number;

  isSupported(): boolean;
  start(): Promise<boolean>;
  stop(): void;
  toggle(): Promise<boolean>;
  subscribe(callback: (state: CompassState) => void): () => void;
  attachElement(element: SVGElement | HTMLElement): void;
  detachElement(element: SVGElement | HTMLElement): void;
  getState(): CompassState;
}

export declare const compass: CompassService;

export declare function useCompass(
  callback?: (state: CompassState) => void
): CompassService | (() => void);

export declare function getCardinalDirection(degrees: number): string;
export declare function isSecureContext(): boolean;

declare global {
  interface Window {
    DsySACompass?: {
      CompassService: typeof CompassService;
      compass: CompassService;
      useCompass: typeof useCompass;
      getCardinalDirection: typeof getCardinalDirection;
      isSecureContext: typeof isSecureContext;
    };
  }
}
