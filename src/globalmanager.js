

class GlobalManager {

    engine;
    canvas;
    scene;
    camera;
    lights = [];


    shadowGenerators = [];

    deltaTime;

    constructor() {

    }

    static get instance() {
        return (globalThis[Symbol.for(`PF_${GlobalManager.name}`)] || new this());
    }

    init(canvas, engine) {

        this.canvas = canvas;
        this.engine = engine;
    }

    update() {
        this.deltaTime = this.engine.getDeltaTime() / 1000.0;
    }

    addLight(light) {
        this.lights.push(light);
    }
    addShadowGenerator(shadowGen) {
        this.shadowGenerators.push(shadowGen);
    }

    addShadowCaster(object, bChilds) {
        bChilds = bChilds || false;
        for (let shad of this.shadowGenerators) {
            shad.addShadowCaster(object, bChilds);
        }
    }
}

const { instance } = GlobalManager;
export { instance as GlobalManager };