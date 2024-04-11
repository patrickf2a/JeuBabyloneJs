import { MeshBuilder, SceneLoader, Vector3, StandardMaterial, Texture,Color3, PhysicsImpostor } from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials';
import { GlobalManager } from './globalmanager';


class Arena {

    playerSpawnPoint;
    levelRows;
    width=0;
    height=0;
    groundTexture;
    groundTexture2;
    wallTexture;
    wallTexture2;
    SpawnX;
    SpawnY;

    constructor() {
    }

    async init() {
        this.playerSpawnPoint = new Vector3(0, 0, 0);
    }

    async loadLevel(level){
        this.disposeLevel();
        this.height = level.height;
        this.width = level.width;
        this.groundTexture = level.groundTexture;
        this.groundTexture2 = level.groundTexture2;
        this.wallTexture = level.wallTexture;
        this.wallTexture2 = level.wallTexture2;

        this.levelRows = [];
        for(let y = 0; y < this.height; y++){
            let currentRow = [];
            for(let x = 0; x < this.width; x++){
                let cell = level.rows[(this.height-1)-y].charAt(x);
                currentRow.push(cell);
            }
            this.levelRows.push(currentRow);
        }
        this.SpawnX = level.spawnPlayerX;
        this.SpawnY = level.spawnPlayerY;
        this.playerSpawnPoint = new Vector3(this.SpawnX, 0, this.SpawnY);
    }

    drawlevel() {
        // Création du sol
        this.ground = MeshBuilder.CreateGround('ground', {width: this.width, height: this.height});
        this.ground.position.set(this.width / 2 - 0.5, 0, this.height / 2 - 0.5);
        //this.ground.position.set(0, 0, 0); // Centre le terrain à l'origine

        let groundMat = new StandardMaterial('groundMaterial', GlobalManager.scene);
        groundMat.specularColor = new Color3(0.1, 0.1, 0.1);
        groundMat.diffuseTexture = new Texture(this.groundTexture, GlobalManager.scene);
        groundMat.diffuseTexture.uScale = this.width;
        groundMat.diffuseTexture.vScale = this.height;
        groundMat.bumpTexture = new Texture(this.groundTexture2, GlobalManager.scene);
        this.ground.material = groundMat;

        // Préparation du matériel pour les murs (inchangé)
        let wallMaterial = new StandardMaterial('wallMaterial', GlobalManager.scene);
        wallMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
        wallMaterial.diffuseTexture = new Texture(this.wallTexture, GlobalManager.scene);
        wallMaterial.bumpTexture = new Texture(this.wallTexture2, GlobalManager.scene);

        // Itération sur chaque cellule de la grille du niveau
        for (let y = 0; y < this.height; y++) {
            let currentRow = this.levelRows[y];
            for (let x = 0; x < this.width; x++) {
                let currentCell = currentRow[x];
                switch (currentCell) {
                    case 'W':
                        let brick = MeshBuilder.CreateBox('brick', {size: 1}, GlobalManager.scene);
                        brick.position.set(x, 0.5, y);
                        brick.material = wallMaterial;
                        break;
                    case 'P': // Nouveau cas pour les plates-formes
                        let platform = MeshBuilder.CreateBox('platform', {height: 0.1, width: 1, depth: 1}, GlobalManager.scene);
                        platform.position.set(x, 0.25, y); // Ajustez la position verticale selon vos besoins
                        let platformMaterial = new StandardMaterial('platformMaterial', GlobalManager.scene);
                        platformMaterial.diffuseColor = new Color3(0.76, 0.6, 0.42); // Couleur boisée par exemple
                        platform.material = platformMaterial;

                        platform.physicsImpostor = new PhysicsImpostor(platform, PhysicsImpostor.BoxImpostor, { mass: 1 }, GlobalManager.scene);

                        break;

                    case ' ':
                    default:
                        break;
                }
            }
        }
    }

    disposeLevel() {
        //CLEAN
        this.width = 0;
        this.height = 0;
    }

    getSpawnPoint(playerIndex) {
        return this.playerSpawnPoint.clone();
    }

    update() {

    }

}

export default Arena;