import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Vertex from "./shaders/vertex.glsl";
import Fragment from "./shaders/fragment.glsl";
import VertexTubes from "./shaderTubes/vertex.glsl";
import FragmentTubes from "./shaderTubes/fragment.glsl";
import { createNoise3D } from "simplex-noise";

const noise3D = createNoise3D();

function computeCurl(x, y, z) {
  var eps = 0.0001;

  var curl = new THREE.Vector3();

  //Find rate of change in YZ plane
  var n1 = noise3D(x, y + eps, z);
  var n2 = noise3D(x, y - eps, z);
  //Average to find approximate derivative
  var a = (n1 - n2) / (2 * eps);
  var n1 = noise3D(x, y, z + eps);
  var n2 = noise3D(x, y, z - eps);
  //Average to find approximate derivative
  var b = (n1 - n2) / (2 * eps);
  curl.x = a - b;

  //Find rate of change in XZ plane
  n1 = noise3D(x, y, z + eps);
  n2 = noise3D(x, y, z - eps);
  a = (n1 - n2) / (2 * eps);
  n1 = noise3D(x + eps, y, z);
  n2 = noise3D(x - eps, y, z);
  b = (n1 - n2) / (2 * eps);
  curl.y = a - b;

  //Find rate of change in XY plane
  n1 = noise3D(x + eps, y, z);
  n2 = noise3D(x - eps, y, z);
  a = (n1 - n2) / (2 * eps);
  n1 = noise3D(x, y + eps, z);
  n2 = noise3D(x, y - eps, z);
  b = (n1 - n2) / (2 * eps);
  curl.z = a - b;

  return curl;
}

export default class Sketch {
  constructor(options) {
    this.container = options.domElement;
    this.height = this.container.offsetHeight;
    this.width = this.container.offsetWidth;
    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      0.01,
      10
    );
    this.camera.position.z = 1.5;

    this.scene = new THREE.Scene();
    this.scene1 = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.autoClear = false;
    this.container.appendChild(this.renderer.domElement);
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.eMouse = new THREE.Vector2();
    this.oldMouse = new THREE.Vector2(0, 0);
    this.elasticMouse = new THREE.Vector2(0, 0);
    this.temp = new THREE.Vector2(0, 0);
    this.elasticMouseVel = new THREE.Vector2(0, 0);

    this.clock = new THREE.Clock();

    this.count = 600;

    this.resize();
    this.addObject();
    this.raycast();
    this.render();
    this.setUpResize();
  }

  raycast() {
    this.raycasterPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      this.material
    );

    this.light = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xa8e6cf })
    );
    this.scene1.add(this.raycasterPlane);
    this.scene.add(this.light);

    this.container.addEventListener("mousemove", (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      this.eMouse.x = event.clientX;
      this.eMouse.y = event.clientY;

      this.camera.lookAt(this.mouse.x / 10, this.mouse.y / 10, 0);

      const intersects = this.raycaster.intersectObjects([this.raycasterPlane]);
      if (intersects.length > 0) {
        let point = intersects[0].point;
        this.eMouse.x = point.x;
        this.eMouse.y = point.y;
      }
    });
  }

  getCurve(start) {
    let points = [];
    const scale = 2;

    points.push(start);
    let currentPoint = start.clone();

    for (let i = 0; i < this.count; i++) {
      let velocity = computeCurl(
        currentPoint.x / scale,
        currentPoint.y / scale,
        currentPoint.z / scale
      );
      currentPoint.addScaledVector(velocity, 0.001);
      points.push(currentPoint.clone());
    }
    return points;
  }

  addObject() {
    const scale2 = 2;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 1.0 },
        uLight: { value: new THREE.Vector3(0, 0, 0) },
        uResolution: { value: new THREE.Vector2() },
      },
      vertexShader: Vertex,
      fragmentShader: Fragment,
      side: THREE.DoubleSide,
    });

    this.materialTubes = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 1.0 },
        uLight: { value: new THREE.Vector3(0, 0, 0) },
        uResolution: { value: new THREE.Vector2() },
      },
      vertexShader: VertexTubes,
      fragmentShader: FragmentTubes,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 300; i++) {
      const path = new THREE.CatmullRomCurve3(
        this.getCurve(
          new THREE.Vector3(
            (Math.random() - 0.5) * scale2,
            (Math.random() - 0.5) * scale2,
            (Math.random() - 0.5) * scale2
          )
        )
      );
      const geometry = new THREE.TubeGeometry(
        path,
        this.count,
        0.005,
        8,
        false
      );

      const curve = new THREE.Mesh(geometry, this.materialTubes);
      this.scene.add(curve);
    }
  }

  render() {
    this.elapsedTime = this.clock.getElapsedTime();
    this.material.uniforms.uTime.value = this.elapsedTime;
    this.materialTubes.uniforms.uTime.value = this.elapsedTime;

    this.temp.copy(this.eMouse).sub(this.elasticMouse).multiplyScalar(0.15);
    this.elasticMouseVel.add(this.temp);
    this.elasticMouseVel.multiplyScalar(0.8);
    this.elasticMouse.add(this.elasticMouseVel);

    this.light.position.x = this.elasticMouse.x;
    this.light.position.y = this.elasticMouse.y;

    this.material.uniforms.uLight.value = this.light.position;
    this.materialTubes.uniforms.uLight.value = this.light.position;

    requestAnimationFrame(this.render.bind(this));

    this.renderer.clear();
    this.renderer.render(this.scene1, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
  }

  setUpResize() {
    addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }
}

new Sketch({
  domElement: document.getElementById("container"),
});
