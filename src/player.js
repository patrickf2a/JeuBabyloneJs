import { AxesViewer, ActionManager, Color3, MeshBuilder, Quaternion, Scalar, Scene, SceneLoader, StandardMaterial, TransformNode, Vector3,PhysicsImpostor, ExecuteCodeAction, Animation} from '@babylonjs/core';
import { GlobalManager } from './globalmanager';

import playerMeshUrl from "../assets/models/knight1.glb";

const SPEED = 7.0;
const TURN_SPEED = 4*Math.PI;
const OBSTACLE_HEIGHT = 0.5;

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

    frontVector = new Vector3(0, 0, 1);

    lookDirectionQuaternion = Quaternion.Identity();

    constructor(spawnPoint,arena) {
        this.spawnPoint = spawnPoint;
        this.arena = arena;
        this.isJumping = false;
        this.jumpHeight = 5.0;
        this.currentJumpSpeed = 0;
        this.gravity = -9.81;

        this.canFire = true; // Peut tirer
        this.fireAfter = 0.3;



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
        this.mesh.scaling.set(0.1, 0.1, 0.1);
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

        /*
        if (inputMap["Space"]) {
            this.fireProjectile();
        }
*/
    }

    getInputs(inputMap, actions) {
        this.moveInput.set(0, 0, 0);

        // Déplacement horizontal avec A, D, et les flèches gauche et droite
        if (inputMap["KeyA"] || inputMap["ArrowLeft"]) {
            this.moveInput.x = -1;
        } else if (inputMap["KeyD"] || inputMap["ArrowRight"]) {
            this.moveInput.x = 1;
        }

        // Déplacement vertical avec W, S, et les flèches haut et bas
        if (inputMap["KeyW"] || inputMap["ArrowUp"]) {
            this.moveInput.z = 1;
        } else if (inputMap["KeyS"] || inputMap["ArrowDown"]) {
            this.moveInput.z = -1;
        }

        // Saut avec la touche Espace
        if (inputMap["Space"] && !this.isJumping) {
            this.isJumping = true;
            this.currentJumpSpeed = this.jumpHeight; // Initialise la vitesse de saut
        }

        // Action spécifique avec la touche R
        if (inputMap["KeyR"]) {
            console.log("R key pressed");
            this.fireProjectile();
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

            // Limite les déplacements aux bords du terrain
            newPosition.x = Math.max(0.5, Math.min(this.arena.width - 0.5, newPosition.x));
            newPosition.z = Math.max(0.5, Math.min(this.arena.height - 0.5, newPosition.z));

            // Vérifie si la nouvelle position est bloquée par un 'W' ou un 'P'
            if (!this.isPositionBlocked(newPosition)) {
                // Si non bloquée, met à jour la position du joueur
                this.transform.position = newPosition;
            } else {
                // Tente de permettre un mouvement partiel si possible
                let alternativeX = this.transform.position.add(new Vector3(deltaPosition.x, 0, 0));
                let alternativeZ = this.transform.position.add(new Vector3(0, 0, deltaPosition.z));

                if (!this.isPositionBlocked(alternativeX)) {
                    this.transform.position.x += deltaPosition.x;
                }
                if (!this.isPositionBlocked(alternativeZ)) {
                    this.transform.position.z += deltaPosition.z;
                }
            }

            // Rotation du joueur vers la direction du mouvement
            let adjustedDirection = this.moveDirection.negate(); // Ceci inverse le vecteur de direction
            Quaternion.FromLookDirectionLHToRef(adjustedDirection, Vector3.UpReadOnly, this.lookDirectionQuaternion);
            Quaternion.SlerpToRef(this.mesh.rotationQuaternion, this.lookDirectionQuaternion, TURN_SPEED * GlobalManager.deltaTime, this.mesh.rotationQuaternion);
        }

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
        let gridZ = Math.round(newPosition.z);

        // Obtenir le caractère à la position cible
        let targetCell = this.arena.levelRows[gridZ] && this.arena.levelRows[gridZ][gridX];

        // Vérifie si la cible est un mur ('W') ou une plate-forme ('P')
        if (targetCell === 'W' || targetCell === 'P') {
            // Si le joueur est au-dessus de la hauteur de l'obstacle, il peut passer
            if (this.transform.position.y > OBSTACLE_HEIGHT) {
                return false; // Pas bloqué
            }
            return true; // Bloqué
        }

        return false; // Pas bloqué si l'espace est vide
    }

    fireProjectile() {
        if (!this.canFire) return;

        this.canFire = false;
        setTimeout(() => {
            this.canFire = true;
        }, 1000 * this.fireAfter);

        // Création du projectile
        const projectile = MeshBuilder.CreateSphere('projectile', { diameter: 0.5 }, GlobalManager.scene);
        projectile.material = new StandardMaterial("projectileMat", GlobalManager.scene);
        projectile.material.diffuseColor = new Color3(1, 0, 0);

        // Positionne le projectile à la position initiale du joueur
        projectile.position = this.transform.position.clone().add(new Vector3(0, 1, 0));

        // Orientation selon le joueur
        let aimDirection = this.frontVector.negate().normalize();

        // Initialise l'animation de lancement
        let start = projectile.position.clone();
        let end = start.add(aimDirection.scale(10));

        // Animation de déplacement initial
        let anim = new Animation("launchAnim", "position", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        let keys = [];
        keys.push({ frame: 0, value: start });
        keys.push({ frame: 10, value: end });
        anim.setKeys(keys);

        projectile.animations = [];
        projectile.animations.push(anim);


        GlobalManager.scene.beginAnimation(projectile, 0, 10, false, 1, () => {
            // Calcul de la force de l'impulsion avec une composante verticale après l'animation initiale
            const powerOfFire = 100; // Puissance du tir
            let azimuth = 0.01; // Ajustement vertical
            let aimForceVector = new Vector3(this.frontVector.x*powerOfFire, (this.frontVector.y+azimuth)*powerOfFire,this.frontVector.z*powerOfFire);

            // Création d'un imposteur de physique pour le projectile
            projectile.physicsImpostor = new PhysicsImpostor(projectile, PhysicsImpostor.SphereImpostor, { mass: 1 }, GlobalManager.scene);

            // Applique la force au projectile
            projectile.physicsImpostor.applyImpulse(aimForceVector, projectile.getAbsolutePosition());
        });


        // Gestion de la collision du projectile


        // Nettoyage du projectile après quelques secondes
        setTimeout(() => {
            projectile.dispose();
        }, 3000);
    }

}

export default Player;