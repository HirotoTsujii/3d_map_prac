import mapboxgl from "mapbox-gl";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

let camera: THREE.Camera;
let scene: THREE.Scene;
let layermap: mapboxgl.Map;
let renderer: THREE.WebGLRenderer;
let modelTransform: {
  translateX: number;
  translateY: number;
  translateZ: number | undefined;
  rotateX: any;
  rotateY: any;
  rotateZ: any;
  scale: number;
};
// モデルが配置されるmap上の座標
let modelOrigin: mapboxgl.LngLatLike = [135.7588, 35.004];
let modelAltitude = 0;
let modelRotate = [Math.PI / 2, 0, 0];

interface CustomLayer {
  updateLngLat: ({
    latLng,

    altitude,
  }: {
    latLng?: mapboxgl.LngLatLike;

    altitude?: number;
  }) => void;
}

export const droneLayer: mapboxgl.AnyLayer & CustomLayer = {
  id: "drone-model",
  renderingMode: "3d",
  type: "custom",

  // レイヤーがマップに追加されたときに呼び出されるオプションのメソッド
  onAdd: (map, gl) => {
    const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
      modelOrigin,
      modelAltitude
    );
    modelTransform = {
      translateX: modelAsMercatorCoordinate.x,
      translateY: modelAsMercatorCoordinate.y,
      translateZ: modelAsMercatorCoordinate.z,
      rotateX: modelRotate[0],
      rotateY: modelRotate[1],
      rotateZ: modelRotate[2],
      scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits(),
    };

    // ピュアなThree.jsだと色々引数の設定をしていたが、
    // 視点などはmapbox側での視点になるのでインスタンスだけ生成する
    camera = new THREE.Camera();
    scene = new THREE.Scene();

    // ライトの設定
    const ambientLight = new THREE.AmbientLight();
    ambientLight.color.set(0xffffff);
    ambientLight.intensity = 0.5;
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(1.0, 0.55, 5);
    scene.add(directionalLight);

    // オブジェクトの設定をしていく
    const fbxLoader = new FBXLoader();
    fbxLoader.setResourcePath(
      "/models/iphone/textures/iphone-x-screens-status-bar.jpg"
    );
    fbxLoader.load(
      "/models/iphone/Iphone seceond version finished.fbx",
      (obj) => {
        // モデルが大きすぎるので縮小
        obj.scale.set(0.15, 0.15, 0.15);

        // 地面からちょっと浮いているように見せるためにY軸から＋方向に少し上げる

        obj.position.y = 20;

        scene.add(obj);
      }
    );

    layermap = map;

    // threeJsで描画したオブジェクトをmapboxにマッピングする
    renderer = new THREE.WebGLRenderer({
      // 描画対象のcanvasをmapboxと指定している
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });

    renderer.autoClear = false;
  },
  // レンダー フレーム中に呼び出され、レイヤが GL コンテキストに描画できるようにします
  render: (gl, matrix) => {
    // マップにマッピングしたときの座標を求める
    const rotateX = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(1, 0, 0),
      modelTransform.rotateX
    );
    const rotateY = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 1, 0),
      modelTransform.rotateY
    );
    const rotateZ = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 0, 1),
      modelTransform.rotateZ
    );
    const m = new THREE.Matrix4().fromArray(matrix);
    const l = new THREE.Matrix4()
      .makeTranslation(
        modelTransform.translateX,
        modelTransform.translateY,
        modelTransform.translateZ || 0
      )
      .scale(
        new THREE.Vector3(
          modelTransform.scale,
          -modelTransform.scale,
          modelTransform.scale
        )
      )
      .multiply(rotateX)
      .multiply(rotateY)
      .multiply(rotateZ);

    // mapboxの座標ベースでレンダリングをする
    camera.projectionMatrix.elements = matrix;
    camera.projectionMatrix = m.multiply(l);
    renderer.state.reset();
    renderer.render(scene, camera);
    layermap.triggerRepaint();
  },

  // 座標,高さの更新

  updateLngLat: ({
    latLng,

    altitude,
  }: {
    latLng?: mapboxgl.LngLatLike;

    altitude?: number;
  }) => {
    if (latLng) {
      modelOrigin = latLng;
    }

    if (altitude) {
      modelAltitude = altitude;
    }

    const updateMercator = mapboxgl.MercatorCoordinate.fromLngLat(
      modelOrigin,

      modelAltitude
    );

    modelTransform.translateX = updateMercator.x;

    modelTransform.translateY = updateMercator.y;

    modelTransform.translateZ = updateMercator.z;
  },
};
