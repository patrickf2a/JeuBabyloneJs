import { AxesViewer, ActionManager, Color3, MeshBuilder, Quaternion, Scalar, Scene, SceneLoader, StandardMaterial, TransformNode, Vector3,PhysicsImpostor, ExecuteCodeAction } from '@babylonjs/core';
import { GlobalManager } from './globalmanager';

import playerMeshUrl from "../assets/models/knight1.glb";

const SPEED = 7.0;
const TURN_SPEED = 4*Math.PI;
const OBSTACLE_HEIGHT = 2;

class Player {

    transform;
    mesh;

    axes;

    spawnPoint;
    arena;

    //Vecteur d'input
    moveInput = new Vector3(0, 0, 0);

    //Vecteur de deplacement
    moveDirection = new Vector3(0, 0, 0);

    frontVector = new Vector3(0, 0, 0);


    lookDirectionQuaternion = Quaternion.Identity();

    constructor(spawnPoint,arena) {
        this.spawnPoint = spawnPoint;
        this.arena = arena;
        this.isJumping = false;
        this.jumpHeight = 5.0;
        this.currentJumpSpeed = 0;
        this.gravity = -9.81;
        this.velocity = new Vector3(0,0,0);
        this.canFire = true; // Peut tirer
        this.fireRate = 500;

        this.canFireCannonBalls = true;
        this.fireRateCannonBalls = 0.1;



    }

    async init() {
        /*this.mesh = MeshBuilder.CreateBox('playerMesh', {size: 2});
        this.mesh.material = new StandardMaterial("playerMat", GlobalManager.scene);
        this.mesh.material.diffuseColor = new Color3(1, 0, 0);
        this.mesh.visibility = 0.6;*/

        this.transform = new TransformNode("player", GlobalManager.scene);
        this.transform.position = this.spawnPoint.clone();

        const result = await SceneLoader.ImportMeshAsync("", "", playerMeshUrl, GlobalManager.scene);
        this.mesh = result.meshes[0];
        this.mesh.name = "knight";
        this.mesh.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI / 2, 0);
        this.mesh.scaling.set(.2, .2, .2);
        this.mesh.parent = this.transform;

        for (let childMesh of result.meshes) {
            if ((childMesh.name === "Object_3") ||
            (childMesh.name === "Object_5") ||
            (childMesh.name === "Object_4") ||
            (childMesh.name === "Object_11")) {

                childMesh.receiveShadows = true;
                GlobalManager.addShadowCaster(childMesh);
            }
        }
/*
        const poignee = this.mesh.getChildTransformNodes().find( (node) => node.name === 'Object_2');
        let childObj = MeshBuilder.CreateBox("childObj", GlobalManager.scene);
        childObj.setParent(poignee);
        childObj.position.set(0, 0, 0);
        childObj.scaling.set(1, 1, 1)
*/
        //Mesh "Object_11" => Roues
    }

    update(inputMap, actions , delta) {

        this.getInputs(inputMap, actions);

        this.applyCameraToInputs();
        this.move();

        if (this.isJumping) {
            // Applique la vitesse de saut en Y
            this.transform.position.y += this.currentJumpSpeed * GlobalManager.deltaTime;
            // Applique la gravité à la vitesse de saut
            this.currentJumpSpeed += this.gravity * GlobalManager.deltaTime;

            if (this.transform.position.y <= 0) {
                this.transform.position.y = 0;
                this.isJumping = false; // Arrête le saut
                this.currentJumpSpeed = 0; // Réinitialise la vitesse de saut
            }
        }

        if (inputMap["Space"]) {
            this.fireProjectile();
        }

    }

    getInputs(inputMap, actions) {


        this.moveInput.set(0, 0, 0);

        if (inputMap["KeyA"]) {
            this.moveInput.x = -1;
        } else if (inputMap["KeyD"]) {
            this.moveInput.x = 1;
        }


        if (inputMap["KeyW"] && !this.isJumping) {
            this.isJumping = true;
            this.currentJumpSpeed = this.jumpHeight; // Initialise la vitesse de saut
        }


    }


    applyCameraToInputs() {
        this.moveDirection.set(0, 0, 0);

        if (this.moveInput.length() != 0) {
            // Get the forward direction of the camera
            let forward = this.getForwardVector(GlobalManager.camera);
            forward.y = 0;
            forward.normalize();
            forward.scaleInPlace(this.moveInput.z);

            // Get the right direction of the camera
            let right = this.getRightVector(GlobalManager.camera);
            right.y = 0;
            right.normalize();
            right.scaleInPlace(this.moveInput.x);

            // Add the two vectors
            this.moveDirection = right.add(forward);

            // Normalize
            this.moveDirection.normalize();

            // Get the adjusted direction
            let adjustedDirection = this.moveDirection.negate();

            // Update the look direction quaternion
            Quaternion.FromLookDirectionLHToRef(adjustedDirection, Vector3.UpReadOnly, this.lookDirectionQuaternion);

            // Update the front vector
            this.frontVector = adjustedDirection;
        }
    }

    move() {
        if (this.moveDirection.length() != 0) {
            let deltaPosition = this.moveDirection.scale(SPEED * GlobalManager.deltaTime);
            let newPosition = this.transform.position.add(deltaPosition);
            let gridX = Math.round(newPosition.x);
            let gridY = Math.round(newPosition.y);
            let targetCell = this.arena.levelRows[gridY] && this.arena.levelRows[gridY][gridX];
            if (targetCell=='W'||targetCell=='P') {
                if (this.transform.position.y > OBSTACLE_HEIGHT) {
                    this.velocity.y = 0;}
                    else{
                        this.velocity.y -= this.gravity * GlobalManager.deltaTime;
                    }
                    
                }
                else {
                    // Appliquer la gravité
                    this.velocity.y -= this.gravity * GlobalManager.deltaTime;
                }
                
            // Limite les déplacements aux bords du terrain
            newPosition.x = Math.max(0.5, Math.min(this.arena.width - 0.5, newPosition.x));
            newPosition.y = Math.max(0.5, Math.min(this.arena.height - 0.5, newPosition.y));

            // Vérifie si la nouvelle position est bloquée par un 'W' ou un 'P'
            if (!this.isPositionBlocked(newPosition)) {
                // Si non bloquée, met à jour la position du joueur
                this.transform.position = newPosition;
            } else {
                // Tente de permettre un mouvement partiel si possible
                let alternativeX = this.transform.position.add(new Vector3(deltaPosition.x, 0, 0));
                let alternativeY = this.transform.position.add(new Vector3(0, deltaPosition.y,0));

                if (!this.isPositionBlocked(alternativeX)) {
                    this.transform.position.x += deltaPosition.x;
                }
                if (!this.isPositionBlocked(alternativeY)) {
                    this.transform.position.y += deltaPosition.y;
                }
            }

            // Rotation du joueur vers la direction du mouvement
            let adjustedDirection = this.moveDirection.negate(); // Ceci inverse le vecteur de direction
            Quaternion.FromLookDirectionLHToRef(adjustedDirection, Vector3.UpReadOnly, this.lookDirectionQuaternion);
            Quaternion.SlerpToRef(this.mesh.rotationQuaternion, this.lookDirectionQuaternion, TURN_SPEED * GlobalManager.deltaTime, this.mesh.rotationQuaternion);
        }

        if (this.isJumping) {
            // Applique la vitesse de saut en Y
            this.transform.position.y += this.currentJumpSpeed * 20*GlobalManager.deltaTime;
            // Applique la gravité à la vitesse de saut
            this.currentJumpSpeed += this.gravity * GlobalManager.deltaTime;

            if (this.transform.position.y <= 0) {
                this.transform.position.y = 0;
                this.isJumping = false; // Arrête le saut
                this.currentJumpSpeed = 0; // Réinitialise la vitesse de saut
            }
        }



    }


    getUpVector(_mesh) {
        let up_local = _mesh.getDirection(Vector3.UpReadOnly);
        return up_local.normalize();
    }

    getForwardVector(_mesh) {
        
        let forward_local = _mesh.getDirection(Vector3.LeftHandedForwardReadOnly);
        return forward_local.normalize();
    }

    getRightVector(_mesh) {
       
        let right_local = _mesh.getDirection(Vector3.RightReadOnly);
        return right_local.normalize();
    }

    isPositionBlocked(newPosition) {
        // Convertir la position en coordonnées de grille
        let gridX = Math.round(newPosition.x);
        let gridY = Math.round(newPosition.y);

        console.log("grid" + gridX, gridY);
        console.log(newPosition.x, newPosition.y)
        // Obtenir le caractère à la position cible
        let targetCell = this.arena.levelRows[gridY] && this.arena.levelRows[gridY][gridX];
        console.log("targetCell" + targetCell)
        // Vérifie si la cible est un mur ('W') ou une plate-forme ('P')
        if (targetCell === 'W' || targetCell === 'P') {
            console.log("blocked")
            console.log("binbinks"+this.transform.position.y+" "+OBSTACLE_HEIGHT)
            // Si le joueur est au-dessus de la hauteur de l'obstacle, il peut passer
            if (this.transform.position.y > OBSTACLE_HEIGHT) {
                return false; // Pas bloqué

            }
            return true; // Bloqué
        }

        return false; // Pas bloqué si l'espace est vide
    }

    fireProjectile() {
        if (!this.canFireCannonBalls) return;

        this.canFireCannonBalls = false;
        setTimeout(() => {
            this.canFireCannonBalls = true;
        }, 1000 * this.fireRateCannonBalls);

        // Crée le projectile
        const projectile = MeshBuilder.CreateSphere('projectile', { diameter: 0.5 }, GlobalManager.scene);
        projectile.material = new StandardMaterial("projectileMat", GlobalManager.scene);
        projectile.material.diffuseColor = new Color3(1, 0, 0); // Couleur du projectile

        let correctedFrontVector = this.frontVector.normalize().scale(-1);


        projectile.position = this.transform.position.add(correctedFrontVector.scale(2));
        projectile.position.y += 1;


        projectile.physicsImpostor = new PhysicsImpostor(projectile, PhysicsImpostor.SphereImpostor, { mass: 1 }, GlobalManager.scene);


        let powerOfFire = 100; 
        let azimuth = 0.1; 
        let aimForceVector = new Vector3(this.frontVector.x*powerOfFire, (this.frontVector.y+azimuth)*powerOfFire,this.frontVector.z*powerOfFire);
        // Applique l'impulsion pour propulser le projectile
        projectile.physicsImpostor.applyImpulse(aimForceVector, projectile.getAbsolutePosition());

        // Nettoie le projectile après 3 secondes pour ne pas encombrer la scène
        setTimeout(() => {
            projectile.dispose();
        }, 3000);
    }


}

export default Player;