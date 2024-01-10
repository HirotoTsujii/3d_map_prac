// import { useRef, useState, useEffect } from "react";
// import mapboxgl from "mapbox-gl";
// import MapboxLanguage from "@mapbox/mapbox-gl-language";
// import "mapbox-gl/dist/mapbox-gl.css";
// import "./App.css";
// import { droneLayer } from "./dragon";

// const App = () => {
//   mapboxgl.accessToken =
//     "pk.eyJ1IjoiMmdnYXZ5IiwiYSI6ImNscW5mNmtqcjNjaDcycm11aDBoanU2MG8ifQ.0hdTySbIZn211Zh0djDsUw";
//   const mapContainer = useRef<HTMLDivElement>(null);
//   const map = useRef<mapboxgl.Map | null>(null);
//   const [lng, setLng] = useState(135.649);
//   const [lat, setLat] = useState(34.923);
//   const [zoom, setZoom] = useState(18);
//   const exaggeration = 1.5;

//   useEffect(() => {
//     // マップの初期セットアップ
//     if (map.current) return;
//     map.current = new mapboxgl.Map({
//       container: mapContainer.current as HTMLElement,
//       style: "mapbox://styles/mapbox/streets-v11",
//       center: [lng, lat],
//       zoom: zoom,
//       pitch: 60,
//       bearing: -18.6,
//       antialias: true,
//     });
//     // 言語変更設定
//     const language = new MapboxLanguage();
//     map.current.addControl(language);
//     if (map.current !== undefined) {
//     }
//   }, []);

//   useEffect(() => {
//     // マップ読み込み後
//     if (!map.current) return;
//     map.current.on("move", () => {
//       if (map.current) {
//         setLng(Number(map.current.getCenter().lng.toFixed(4)));
//         setLat(Number(map.current.getCenter().lat.toFixed(4)));
//         setZoom(Number(map.current.getZoom().toFixed(2)));
//       }
//     });

//     map.current.on("load", () => {
//       // map.current?.addSource("mapbox-dem2", {
//       //   type: "raster-dem",
//       //   url: "mapbox://mapbox.terrain-rgb",
//       //   tileSize: 512,
//       //   maxzoom: 14,
//       // });

//       // Insert the layer beneath any symbol layer.
//       const layers = map.current?.getStyle().layers;
//       if (layers === undefined) return;
//       const labelLayerId = layers.find(
//         (layer) =>
//           layer.type === "symbol" && layer.layout && layer.layout["text-field"]
//       )?.id;

//       // モデルを描画する
//       if (map.current) {
//         console.log("test");
//         if (map.current.getLayer("drone-model")) {
//           return;
//         }
//         map.current.addLayer(droneLayer);
//       }

//       // map.current?.addLayer(
//       //   {
//       //     id: "add-3d-buildings",
//       //     source: "composite",
//       //     "source-layer": "building",
//       //     filter: ["==", "extrude", "true"],
//       //     type: "fill-extrusion",
//       //     minzoom: 15,
//       //     paint: {
//       //       "fill-extrusion-color": "#aaa",

//       //       // Use an 'interpolate' expression to
//       //       // add a smooth transition effect to
//       //       // the buildings as the user zooms in.
//       //       "fill-extrusion-height": [
//       //         "interpolate",
//       //         ["linear"],
//       //         ["zoom"],
//       //         15,
//       //         0,
//       //         15.05,
//       //         ["get", "height"],
//       //       ],
//       //       "fill-extrusion-base": [
//       //         "interpolate",
//       //         ["linear"],
//       //         ["zoom"],
//       //         15,
//       //         0,
//       //         15.05,
//       //         ["get", "min_height"],
//       //       ],
//       //       "fill-extrusion-opacity": 0.6,
//       //     },
//       //   },
//       //   labelLayerId
//       // );

//       // map.current?.setTerrain({ source: "mapbox-dem2", exaggeration });
//     });
//     // map.current.moveLayer("drone-model");
//   });

//   return (
//     <div>
//       <div style={{ position: "relative" }}>
//         <div className="sidebar">
//           Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
//         </div>
//         <div ref={mapContainer} className="map-container" />
//       </div>
//     </div>
//   );
// };

// export default App;

import { useRef, useState, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxLanguage from "@mapbox/mapbox-gl-language";
import "./App.css";
import { droneLayer } from "./dragon";
import { getLineInfo, makeLineSeting } from "./functions";
import * as turf from "@turf/turf";

mapboxgl.accessToken =
  "pk.eyJ1IjoiMmdnYXZ5IiwiYSI6ImNscW5mNmtqcjNjaDcycm11aDBoanU2MG8ifQ.0hdTySbIZn211Zh0djDsUw";

const App = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(135.7588);
  const [lat, setLat] = useState(35.004);
  const [zoom, setZoom] = useState(13.85);
  const animationDuration = 20000; // 20秒
  const exaggeration = 1;
  const elevation = 100;
  let startTime = 0;
  let path: any = undefined;
  let pathDistance = 0;
  let dronePosition: mapboxgl.LngLatLike = [135.7588, 35.004];

  // この中でアニメーションを描画していく
  const animation = (frame: number) => {
    if (!map.current) return;

    // ドローンの現在位置の標高を取得

    const terrainElevation =
      Math.floor(
        map.current.queryTerrainElevation(dronePosition, {
          exaggerated: false,
        }) || 0
      ) * exaggeration;

    // 標高データが読み込み完了してからアニメーション開始

    if (!startTime && terrainElevation) {
      startTime = frame;
    }

    if (map.current.getLayer("drone-model")) {
      let droneHeight =
        terrainElevation + elevation + Math.sin(elevation + frame * 0.01) * 0.5;

      const animationPhase = (frame - startTime) / animationDuration;
      if (animationPhase > 1) {
        // まだドローンが移動する時間になっていなければ上下の揺れだけ表現
        droneLayer.updateLngLat({ altitude: droneHeight });

        // 標高データが読み込み完了してからアニメーション開始
      } else if (path && pathDistance && terrainElevation) {
        // ルートを受け取り、線上にある指定された距離の座標を返す。
        const alongPath = turf.along(path, pathDistance * animationPhase)
          .geometry.coordinates;
        const nextDroneLngLat = {
          lng: alongPath[0],
          lat: alongPath[1],
        };
        // ドローンを動かす
        droneLayer.updateLngLat({
          latLng: nextDroneLngLat,
          altitude: droneHeight,
        });
        dronePosition = nextDroneLngLat;
      }

      // 移動したラインの位置まで赤くする
      map.current.setPaintProperty("line", "line-gradient", [
        "step",
        ["line-progress"],
        "red",
        animationPhase,
        "rgba(255, 0, 0, 0)",
      ]);
    }
    requestAnimationFrame(animation);
  };

  useEffect(() => {
    async function init() {
      // マップの初期セットアップ
      if (map.current) return;
      map.current = new mapboxgl.Map({
        container: mapContainer.current as HTMLElement,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [lng, lat],
        zoom: zoom,
        pitch: 76,
        bearing: 150,
        antialias: true,
      });

      // 言語変更設定
      const language = new MapboxLanguage();
      map.current.addControl(language);
      if (map.current !== undefined) {
      }

      // 移動する座標データを取得する
      const [pinRouteGeojson] = await Promise.all([
        fetch(
          "https://docs.mapbox.com/mapbox-gl-js/assets/route-pin.geojson"
        ).then((response) => response.json()),
        // データ取得後、mapのloadアクションを実行する
        map.current.once("load"),
      ]);

      // ルート用のライン追加
      map.current.addSource("route-line", {
        type: "geojson",
        lineMetrics: true,
        data: pinRouteGeojson,
      });
      // ラインを描画
      map.current.addLayer(makeLineSeting("baseLine", "rgba(0,255,0,1)"));
      map.current.addLayer(makeLineSeting("line", "rgba(0,0,0,0)"));

      // ルートの距離を計算する
      const routes = pinRouteGeojson.features[0].geometry.coordinates;
      const lineInfo = getLineInfo(routes);
      path = lineInfo.path;
      pathDistance = lineInfo.pathDistance;

      // ドローンのレイヤーを最上位に移動する
      map.current.moveLayer("drone-model");

      animation(0);
    }
    init();
  }, []);

  useEffect(() => {
    // マップ読み込み後
    if (!map.current) return;
    map.current.on("move", () => {
      if (map.current) {
        setLng(Number(map.current.getCenter().lng.toFixed(4)));
        setLat(Number(map.current.getCenter().lat.toFixed(4)));
        setZoom(Number(map.current.getZoom().toFixed(2)));
      }
    });

    map.current.on("load", () => {
      // モデルを描画する
      if (map.current) {
        if (map.current.getLayer("drone-model")) {
          return;
        }
        map.current.addLayer(droneLayer);
      }

      // 標高データの追加
      map.current?.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.terrain-rgb",
        tileSize: 512,
        maxzoom: 14,
      });
      map.current?.setTerrain({ source: "mapbox-dem", exaggeration });

      const layers = map.current?.getStyle().layers;
      if (layers === undefined) return;
      const labelLayerId = layers.find(
        (layer) =>
          layer.type === "symbol" && layer.layout && layer.layout["text-field"]
      )?.id;

      map.current?.addLayer(
        {
          id: "add-3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",

            // Use an 'interpolate' expression to
            // add a smooth transition effect to
            // the buildings as the user zooms in.
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.6,
          },
        },
        labelLayerId
      );
    });
  }, []);

  return (
    <div>
      <div style={{ position: "relative" }}>
        <div className="sidebar">
          Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
        </div>
        <div ref={mapContainer} className="map-container" />
      </div>
    </div>
  );
};

export default App;
