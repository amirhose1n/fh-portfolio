export interface Position3D {
  position: [number, number, number];
}

export interface Area {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  component: string;
  componentPosition: [number, number, number];
  minPolarAngle?: number;
  maxPolarAngle?: number;
}
