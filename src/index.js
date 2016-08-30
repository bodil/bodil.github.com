import "./screen.css";

import * as Three from "three";
import * as hasWebGL from "detector-webgl";

if (hasWebGL) {
  const scene = new Three.Scene();
  scene.fog = new Three.Fog(0x000000, 1, 1000);
  const camera = new Three.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1100);
  camera.position.z = 20;

  const textureBuffer = document.createElement("canvas");
  textureBuffer.width = 128;
  textureBuffer.height = 128;

  function texture(path) {
    const texture = new Three.Texture(textureBuffer);
    const material = new Three.MeshBasicMaterial({map: texture, overdraw: 0.5});
    const image = new Image();
    image.onload = () => {
      texture.image = image;
      texture.needsUpdate = true;
    };
    image.src = path;
    return material;
  }

  const geometry = new Three.BoxGeometry(300, 300, 300, 7, 7, 7);
  const material = new Three.MultiMaterial([
    texture("milkyway-00.png"),
    texture("milkyway-01.png"),
    texture("milkyway-02.png"),
    texture("milkyway-03.png"),
    texture("milkyway-04.png"),
    texture("milkyway-05.png")
  ]);
  const mesh = new Three.Mesh(geometry, material);
  mesh.scale.x = -1;
  scene.add(mesh);

  const boxGeo = new Three.IcosahedronGeometry(10, 0);
  const boxMat = new Three.MeshPhongMaterial({
    color: 0x2194ce,
    emissive: 0x000000,
    specular: 0x111111,
    shininess: 30,
    transparent: true,
    opacity: 0.8
  });
  const frameGeo = new Three.IcosahedronGeometry(10.01, 0);
  const frameMat = new Three.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    wireframeLinewidth: 6
  });
  const boxMesh = new Three.Mesh(boxGeo, boxMat);
  scene.add(boxMesh);
  const frameMesh = new Three.Mesh(frameGeo, frameMat);
  scene.add(frameMesh);

  const spot = new Three.SpotLight(0xffffff, 1);
  spot.position.set(0, 0, 30);
  spot.angle = Math.PI / 4;
  spot.penumbra = 0.5;
  spot.decay = 2;
  spot.distance = 200;
  scene.add(spot);

  const renderer = new Three.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);



  let lon = 90;
  let lat = 0;
  let llat = 0;
  let ldec = 20;

  function animate() {
    requestAnimationFrame(animate);

    lon += 0.00003;
    lat += 0.0000003;

    const latp = Math.sin(lat) * 75;
    const phi = Three.Math.degToRad(90 - latp);
    const theta = Three.Math.degToRad(lon);

    mesh.rotation.x = 500 * Math.sin(phi) * Math.cos(theta);
    mesh.rotation.y = 500 * Math.cos(phi);
    mesh.rotation.z = 500 * Math.sin(phi) * Math.sin(theta);

    // camera.position.copy(target).negate();
    // camera.lookAt(target);

    boxMesh.rotation.x += 0.0023;
    boxMesh.rotation.y += 0.0011;
    frameMesh.rotation.x = boxMesh.rotation.x;
    frameMesh.rotation.y = boxMesh.rotation.y;

    llat += 0.001;
    ldec = Math.max(4, ldec - 0.04);
    spot.position.x = Math.sin(llat) * 30;
    spot.position.y = Math.cos(llat) * 30;
    spot.decay = ldec;

    /* composer.render();*/
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, false);
}
