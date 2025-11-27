export default class OptionScene extends Phaser.Scene {
	constructor(){
		super({ key: 'OptionScene' });
	}

	preload(){
	}

	create(){
		this.add.text(400, 300, 'Opcje (Option Scene)', { font: '28px Arial', fill: '#ffffff' }).setOrigin(0.5);
		const back = this.add.text(400, 360, 'Powrót', { font: '20px Arial', fill: '#ff0' }).setOrigin(0.5).setInteractive();
		back.on('pointerdown', ()=> this.scene.start('MenuScene'));
	}
}
