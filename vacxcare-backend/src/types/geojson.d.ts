declare module "geojson" {
  export interface Geometry {
    type: string;
    coordinates: any[];
  }

  export interface Feature {
    type: "Feature";
    geometry: Geometry;
    properties: { [key: string]: any };
  }

  export interface FeatureCollection {
    type: "FeatureCollection";
    features: Feature[];
  }
}
