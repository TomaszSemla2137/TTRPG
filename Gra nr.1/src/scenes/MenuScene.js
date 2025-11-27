// ================================================================================
// MENUSCENE - Ekran głównego menu
// ================================================================================
export default class MenuScene extends Phaser.Scene {
	// -------------------------------------------------------------------------------
	// KONSTRUKTOR
	// -------------------------------------------------------------------------------
	constructor(){
		super({key: 'MenuScene'});
	}
    preload() {
        // ---------------------------------------------------------------------------
        // PRELOAD - ładowanie zasobów menu
        // ---------------------------------------------------------------------------
        this.load.image('background', 'assets/bg_menu.png');
        this.load.image('buttonStart', 'assets/Button_Start.png');
        this.load.image('buttonOption', 'assets/Button_Option.png');
    }
    create(){
        // ---------------------------------------------------------------------------
        // CREATE - ustawienie tła i przycisków
        // ---------------------------------------------------------------------------
        this.add.image(400, 300, 'background');

        // Pozycje przycisków można łatwo regulować przez te zmienne
        const startY = 260; // początkowa pozycja Y dla pierwszego przycisku (przesunięte w dół)
        const spacing = 150; // odstęp między przyciskami w pikselach

        const startButton = this.add.sprite(400, startY, 'buttonStart').setInteractive({ useHandCursor: true });
        startButton.setScale(0.6);
        startButton.setOrigin(0.5);
        startButton.setDepth(2);
        // Hover effects
        startButton.on('pointerover', ()=> { startButton.setScale(0.66); });
        startButton.on('pointerout', ()=> { startButton.setScale(0.6); });
        const debugMsg = this.add.text(400, startY - 80, '', { font: '18px Arial', fill: '#ff0' }).setOrigin(0.5).setDepth(3);
        startButton.on('pointerdown', ()=> {
            console.log('Start button clicked - attempting to start GameScene');
            debugMsg.setText('Starting...');
            this.time.delayedCall(800, ()=> debugMsg.setText(''));
            try{
                this.scene.start('GameScene');
            } catch (e) {
                console.error('scene.start failed:', e);
                // fallback
                try{ this.scene.manager.start('GameScene'); } catch (e2){ console.error('fallback start failed:', e2); }
            }
        });

        const optionButton = this.add.sprite(400, startY + spacing, 'buttonOption').setInteractive({ useHandCursor: true });
        optionButton.setScale(0.6);
        optionButton.setOrigin(0.5);
        optionButton.setDepth(2);
        // Hover effects
        optionButton.on('pointerover', ()=> { optionButton.setScale(0.66); });
        optionButton.on('pointerout', ()=> { optionButton.setScale(0.6); });
        optionButton.on('pointerdown', ()=> {
            console.log('Option button clicked - attempting to start OptionScene');
            debugMsg.setText('Opening options...');
            this.time.delayedCall(800, ()=> debugMsg.setText(''));
            try{
                this.scene.start('OptionScene');
            } catch (e) {
                console.error('scene.start failed:', e);
                try{ this.scene.manager.start('OptionScene'); } catch (e2){ console.error('fallback start failed:', e2); }
            }
        });

        // ---------------------------------------------------------------------------
        // DEBUG - zdarzenia wejścia
        // ---------------------------------------------------------------------------
        this.input.on('gameobjectdown', (pointer, gameObject) => {
            console.log('gameobjectdown on', gameObject.texture ? gameObject.texture.key : gameObject);
        });
    }
}