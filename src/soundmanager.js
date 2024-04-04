

class SoundManager {

    Musics = Object.freeze({

        START_MUSIC: 0,
        MENU_MUSIC: 1,
        GAME_MUSIC: 2,
        GAME_OVER_MUSIC: 3,
        //....
    });

    musics = [];
    sounds = [];

    previousMusic;

    static get instance() {
        return (globalThis[Symbol.for(`PF_${SoundManager.name}`)] || new this());
    }
    
    constructor() {
        this.previousMusic = -1;
    }

    async init() {
        return this.loadAssets();
    }

    update() {

    }

    playMusic(musicIndex) {
        if (this.previousMusic != -1) {
            this.musics[this.previousMusic].stop();
            this.previousMusic = -1;
        }
        if (musicIndex >= 0 && musicIndex < this.musics.length) {
            this.musics[musicIndex].play();
            this.previousMusic = musicIndex
        }
        return (this.previousMusic != -1);
    }

    playSound(soundIndex, bLoop) {
        if (soundIndex >= 0 && soundIndex < this.sounds.length) {
            //TODO : updateOptions ?
            this.sounds[soundIndex].play();
        }
    }

    loadAssets() {
        //TODO...load musics and sounds
    }
}

const { instance } = SoundManager;
export { instance as SoundManager };