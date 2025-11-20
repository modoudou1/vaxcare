declare module "react-simple-maps" {
  import { Feature, FeatureCollection } from "geojson";
  import * as React from "react";

  export interface GeographyProps {
    geography: Feature;
    fill?: string;
    stroke?: string;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
  }

  export interface GeographiesProps {
    geography: string | FeatureCollection;
    children: (params: { geographies: Feature[] }) => React.ReactNode;
  }

  export const ComposableMap: React.FC<any>;
  export const Geography: React.FC<GeographyProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const ZoomableGroup: React.FC<any>;
}
