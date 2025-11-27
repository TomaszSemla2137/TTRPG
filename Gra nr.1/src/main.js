// Importujemy wszystkie sceny z folderu scenes
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import OptionScene from './scenes/OptionScene.js';

// Konfiguracja gry Phaser
const config = {
    type: Phaser.AUTO,       // Phaser wybierze WebGL lub Canvas automatycznie
    width: 800,              // szerokość okna gry
    height: 600,             // wysokość okna gry
    backgroundColor: '#000', // kolor tła jeśli brak obrazu
    physics: {
        default: 'arcade',   // używamy prostego silnika fizyki Arcade
        arcade: {
            debug: false     // true pokaże granice kolizji, przydatne w trakcie tworzenia
        }
    },
    scene: [MenuScene, GameScene, OptionScene] // Lista scen w grze
};

// Tworzymy nową instancję gry
const game = new Phaser.Game(config);