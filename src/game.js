import { Color3, Color4, CubeTexture, DirectionalLight, FreeCamera, HemisphericLight, KeyboardEventTypes, Scene, ShadowGenerator, Sound, Vector3 } from "@babylonjs/core";
import { Inspector } from "@babylonjs/inspector";

import musicUrl from "../assets/musics/Cyberpunk Moonlight Sonata v2.mp3";

import Player from './player';
import Arena from './arena';
import { GlobalManager } from './globalmanager';

import envSpecularUrl from "../assets/env/environmentSpecular.env";

import { levels } from './levels';

class Game {

    engine;
    canvas;
    scene;

    camera;
    light;

    startTimer;

    player;
    arena;

    inputMap = {};
    actions = {};

    bInspector = false;

    currentLevel = 0;

    constructor(engine, canvas) {
        GlobalManager.engine = engine;
        GlobalManager.canvas = canvas;
    }

    async init() {
        
        await this.createScene();
        this.initKeyboard();
        
        GlobalManager.engine.displayLoadingUI();
        
        this.arena = new Arena();
        await this.arena.init();
        await this.arena.loadLevel(levels[this.currentLevel]);

        this.player = new Player(this.arena.getSpawnPoint(), this.arena);
        this.player.arena = this.arena;
        await this.player.init();

        GlobalManager.engine.hideLoadingUI();

        this.arena.drawlevel();
    }

    initKeyboard() {
        GlobalManager.scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                    this.inputMap[kbInfo.event.code] = true;
                    //console.log(`KEY DOWN: ${kbInfo.event.code} / ${kbInfo.event.key}`);
                    break;
                case KeyboardEventTypes.KEYUP:
                    this.inputMap[kbInfo.event.code] = false;
                    this.actions[kbInfo.event.code] = true;
                    //console.log(`KEY UP: ${kbInfo.event.code} / ${kbInfo.event.key}`);
                    break;
            }
        });        
    }

    async start() {

        await this.init();

        
        this.startTimer = 0;
        GlobalManager.engine.runRenderLoop(() => {

                GlobalManager.update();
                

                this.update();

                if (this.actions["KeyN"]) {
                    this.currentLevel++;
                    if (this.currentLevel >= levels.length)
                        this.currentLevel = 0;

                        GlobalManager.engine.displayLoadingUI();
                        this.arena.loadLevel(levels[this.currentLevel]);
                        GlobalManager.engine.hideLoadingUI();

                }

                if (this.actions["KeyI"]) {
                    if (this.bInspector) {
                        Inspector.Hide();
                    }
                    else {
                        Inspector.Show(GlobalManager.scene, {});
                    }
                    this.bInspector = !this.bInspector;
                }
                //Reset actions
                this.actions = {};
                GlobalManager.scene.render();
        });
    }

    update(delta) {
        this.arena.update();
        this.player.update(this.inputMap, this.actions);
        // Mettez à jour la position de la caméra pour suivre le joueur
        // let cameraTargetPosition = this.player.transform.position.clone();
        // // Ajustez la hauteur de la caméra et la distance derrière le joueur
        // let cameraPosition = cameraTargetPosition.add(new Vector3(0, 5, -10));

        // GlobalManager.camera.position = cameraPosition;
        // GlobalManager.camera.setTarget(cameraTargetPosition);

        this.startTimer += delta;
    }


    async createScene() {

        // Crée un objet Scene basique
        GlobalManager.scene = new Scene(GlobalManager.engine);
        GlobalManager.scene.clearColor = new Color3(0.4, 0.4, 1);
        GlobalManager.scene.collisionsEnabled = true;

        // Crée et positionne une caméra libre
        // Positionne la caméra à une hauteur suffisante pour avoir une vue du dessus
        GlobalManager.camera = new FreeCamera("camera1", new Vector3(1,1, -100), GlobalManager.scene); // Ajustez la hauteur au besoin

        // Oriente la caméra pour regarder directement vers le bas
        GlobalManager.camera.rotation.x = 0;

        // Attache la caméra au canvas pour permettre le contrôle par l'utilisateur

        /*
                let envOptions = {
                    createGround: false,
                    createSkybox : false,
                    cameraExposure : 0.4,
                    //environmentTexture : new CubeTexture(envSpecularUrl, GlobalManager.scene),
                };
                GlobalManager.scene.createDefaultEnvironment(envOptions);
                GlobalManager.scene.environmentIntensity = 0.35; */
        
        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        let light = new DirectionalLight("light", new Vector3(1, 10, 0), GlobalManager.scene);
        light.direction = new Vector3(0.45, -0.47, -0.76);
        light.diffuse = Color3.FromHexString("#FFFFFF");
        light.autoCalcShadowZBounds = true;
        light.autoUpdateExtends = true;

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 1.0;
        GlobalManager.addLight(light);

        let shadowGen = new ShadowGenerator(1024, light);
        shadowGen.useBlurCloseExponentialShadowMap = true;
        GlobalManager.addShadowGenerator(shadowGen);

        //new AxesViewer(GlobalManager.scene, 5);

        //TODO : move to sound manager
        this.music = new Sound("music", musicUrl, GlobalManager.scene, undefined, { loop: true, autoplay: false, volume: 0.4 });

    }
}

export default Game;