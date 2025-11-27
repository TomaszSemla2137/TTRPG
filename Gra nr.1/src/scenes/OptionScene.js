// ================================================================================
// OPTIONSCENE - Ekran ustawień
// ================================================================================
export default class OptionScene extends Phaser.Scene {
	// -------------------------------------------------------------------------------
	// KONSTRUKTOR
	// -------------------------------------------------------------------------------
	constructor(){
		super({ key: 'OptionScene' });
	}

	// -------------------------------------------------------------------------------
	// PRELOAD - tutaj ładuj zasoby ustawień (jeśli będą)
	// -------------------------------------------------------------------------------
	preload(){
	}

	// -------------------------------------------------------------------------------
	// CREATE - interfejs ustawień
	// -------------------------------------------------------------------------------
	create(){
		this.add.text(400, 300, 'Opcje (Option Scene)', { font: '28px Arial', fill: '#ffffff' }).setOrigin(0.5);
		const back = this.add.text(400, 360, 'Powrót', { font: '20px Arial', fill: '#ff0' }).setOrigin(0.5).setInteractive();
		back.on('pointerdown', ()=> this.scene.start('MenuScene'));
	}
}
