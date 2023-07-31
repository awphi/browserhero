import * as THREE from "three";

export class ThreeGuitar {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.Renderer;
  private readonly boundDrawFn: () => void = this.draw.bind(this);

  private highway:
    | THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
    | undefined;

  constructor(private readonly parent: HTMLElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
    parent.appendChild(this.renderer.domElement);

    this.setupScene();
    requestAnimationFrame(this.boundDrawFn);
  }

  private setupScene(): void {
    const highwayLength = 7.7;
    const highwayWidth = 4.5;
    const highwayGeometry = new THREE.PlaneGeometry(
      highwayWidth,
      highwayLength
    );
    highwayGeometry.translate(0, highwayLength / 2, 0);

    const highwayMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.highway = new THREE.Mesh(highwayGeometry, highwayMaterial);
    this.scene.add(this.highway);

    // todo create notes programmatically via their consituent sprites + recolor the band in the middle
    // use a pool for save memory
    const noteTex = new THREE.TextureLoader().load("testnote.png");
    const noteMaterial = new THREE.SpriteMaterial({
      map: noteTex,
    });
    const noteSprite = new THREE.Sprite(noteMaterial);
    console.log(noteSprite);
    noteSprite.geometry.scale(1, 0.5, 1);
    noteSprite.geometry.translate(0, 0.25, 0);
    this.highway.add(noteSprite);
    noteSprite.position.y += 4;

    // sweet spot to align bottom of the highway with bottom of the camera
    this.camera.position.z = 4;
    this.camera.position.y = -0.5;
    this.camera.rotation.x = Math.PI / 4;
  }

  private draw(): void {
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.boundDrawFn);
  }

  destroy(): void {
    this.parent.removeChild(this.renderer.domElement);
  }

  update(seconds: number) {}
}
