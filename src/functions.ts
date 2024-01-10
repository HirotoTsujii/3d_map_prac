import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";

export const getLineInfo = (routes: number[][]) => {
  // turfで用いるインスタンスを生成する
  const path = turf.lineString(routes);
  // 線を取り、その長さを指定された単位で測定する
  const pathDistance = turf.lineDistance(path);
  return {
    path,
    pathDistance,
  };
};

export const makeLineSeting = (
  id: string,
  lineColor: string
): mapboxgl.AnyLayer => ({
  type: "line",
  source: "route-line",
  id: id,
  paint: {
    "line-color": lineColor,
    "line-width": 5,
  },
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
});
