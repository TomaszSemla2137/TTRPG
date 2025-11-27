// ================================================================================
// GAMESCENE - Główna scena gry z systemem zakładek
// ================================================================================
// Obsługuje:
// - Wyświetlanie karty postaci (atrybuty, statystyki, ekwipunek)
// - Edycję statystyk postaci (STR, DEX, CON, INT, WIS, CHA, AC, HP, inicjatywa, prędkość)
// - Zarządzanie ekwipunkiem (3 sloty: 2x broń, 1x zbroja + pole tekstowe na dodatkowe przedmioty)
// - System rzutów kością (d4, d6, d8, d10, d12, d20, d100) z modyfikatorami atrybutów
// - Bibliotekę plików (PDF, mapy, tła, tokeny) z podglądem i zarządzaniem
// ================================================================================

export default class GameScene extends Phaser.Scene {
	// --------------------------------------------------------------------------------
	// KONSTRUKTOR
	// --------------------------------------------------------------------------------
	constructor(){
		super({ key: 'GameScene' });
	}

	// --------------------------------------------------------------------------------
	// PRELOAD - Ładowanie zasobów graficznych
	// --------------------------------------------------------------------------------
	preload(){
		// Grafiki smoków do dekoracji
		this.load.image('smok1', 'assets/smok1.png');
		this.load.image('smok2', 'assets/smok2.png');
		
		// Grafiki kostek do gry (d4 - d100)
		this.load.image('d4', 'assets/D4.png');
		this.load.image('d6', 'assets/d6.png');
		this.load.image('d8', 'assets/d8.png');
		this.load.image('d10', 'assets/d10.png');
		this.load.image('d12', 'assets/d12.png');
		this.load.image('d20', 'assets/d20.png');
		this.load.image('d100', 'assets/d100.png');
	}

	// --------------------------------------------------------------------------------
	// CREATE - Inicjalizacja sceny i interfejsu użytkownika
	// --------------------------------------------------------------------------------
	create(){
		const w = this.cameras.main.width;
		const h = this.cameras.main.height;

		// Load or initialize character data
		const saved = localStorage.getItem('charData');
		this.charData = saved ? JSON.parse(saved) : {
			name: 'Tharion', classLevel: 'Fighter 3', background: 'Soldier', player: 'Tomas', race: 'Human', alignment: 'Neutral Good', xp: 0,
			AC: 17, initiative: 2, speed: 30, hpCurrent: 28, hpMax: 28, hitDice: '3d10',
			attributes: { STR:16, DEX:14, CON:14, INT:10, WIS:12, CHA:8 },
			proficiency: 2,
			skills: ['Perception +3','Athletics +5','Acrobatics +2'],
			equipment: ['Longsword','Shield','Chain Mail']
		};

		this.saveCharData = ()=>{ localStorage.setItem('charData', JSON.stringify(this.charData)); };

		// Ensure weapon/armor slots and misc equipment text exist
		this.charData.weapon1 = this.charData.weapon1 || null;
		this.charData.weapon2 = this.charData.weapon2 || null;
		this.charData.armor = this.charData.armor || null;
		this.charData.miscEquipText = this.charData.miscEquipText || '';

		// Library for PDFs, maps, backgrounds and tokens
		this.library = JSON.parse(localStorage.getItem('gameLibrary') || 'null') || { pdfs: [], maps: [], backgrounds: [], tokens: [] };
		this.saveLibrary = ()=>{ localStorage.setItem('gameLibrary', JSON.stringify(this.library)); };

		// Górny pasek
		const topBarHeight = 84;
		const topBar = this.add.rectangle(w/2, topBarHeight/2 + 8, w - 40, topBarHeight, 0x222233).setOrigin(0.5).setDepth(0);

		// Decorative dragons on left and right of the top bar
		try{
			if (this.textures.exists('smok2')){
				this.add.image(40, topBar.y, 'smok2').setDisplaySize(88,88).setOrigin(0,0.5).setDepth(1);
			}
			if (this.textures.exists('smok1')){
				this.add.image(w - 40, topBar.y, 'smok1').setDisplaySize(88,88).setOrigin(1,0.5).setDepth(1);
			}
		}catch(e){ /* ignore if something goes wrong placing decorations */ }

		// Zakładki
		const tabs = ['Karta postaci', 'Statystyki', 'Ekwipunek', 'Mapa', 'Siatka bitewna', 'Rzuty kostką', 'Biblioteka'];
		const tabGap = 8;
		// Najpierw oblicz pozycje ikon (używane też do ustalenia granic dla zakładek)
		const iconSize = 56;
		const iconPadding = 22;
		const leftX = 40 + iconPadding + iconSize/2; // left margin + padding
		const rightX = w - 40 - iconPadding - iconSize/2; // right margin - padding

		const leftBoundary = leftX + iconSize/2 + 12; // niewielki odstęp od lewej ikonki
		const rightBoundary = rightX - iconSize/2 - 12; // odstęp od prawej ikonki
		const availableWidth = Math.max(100, rightBoundary - leftBoundary);

		const tabWidth = Math.min(160, Math.floor((availableWidth - (tabs.length - 1) * tabGap) / tabs.length));
		const totalTabsWidth = tabs.length * tabWidth + (tabs.length - 1) * tabGap;
		const centerTabsX = (leftBoundary + rightBoundary) / 2;
		let startX = centerTabsX - totalTabsWidth/2 + tabWidth/2;

		this.activeTabIndex = 0;
		this.tabItems = [];

		for (let i = 0; i < tabs.length; i++){
			const x = startX + i * (tabWidth + tabGap);
			const y = topBar.y;
			const bg = this.add.rectangle(x, y, tabWidth, topBarHeight - 20, i === this.activeTabIndex ? 0x4466aa : 0x445566)
				.setStrokeStyle(2, 0xffffff)
				.setOrigin(0.5)
				.setInteractive({ useHandCursor: true })
				.setDepth(1);

			const label = this.add.text(x, y, tabs[i], { font: '14px Arial', fill: '#fff', align: 'center', wordWrap: { width: tabWidth - 12 } }).setOrigin(0.5).setDepth(2);
			bg.on('pointerdown', ()=> this.selectTab(i));
			// Hover: change color/scale on over (only if not active)
			bg.on('pointerover', ()=>{
				if (this.activeTabIndex !== i){
					bg.fillColor = 0x5b82b0;
					bg.setScale(1.03);
				}
			});
			bg.on('pointerout', ()=>{
				if (this.activeTabIndex !== i){
					bg.fillColor = 0x445566;
					bg.setScale(1);
				}
			});
			this.tabItems.push({ bg, label });
		}

		// Central panel (main content area)
		this.centerWidth = w - 80;
		this.centerHeight = h - topBarHeight - 60;
		this.centerBg = this.add.rectangle(w/2, topBarHeight + 12 + this.centerHeight/2, this.centerWidth, this.centerHeight, 0x15151a).setOrigin(0.5).setDepth(0);

		// Initially show the active tab
		this.showTabContent(this.activeTabIndex);
	}

	update(){
	}

	selectTab(index){
		if (this.activeTabIndex === index) return;
		this.tabItems.forEach((it, i)=>{
			it.bg.fillColor = i === index ? 0x4466aa : 0x445566;
		});
		this.activeTabIndex = index;
		this.showTabContent(index);
	}

	showTabContent(index){
		// clear center panel before redrawing
		if (this._centerChildren){
			this._centerChildren.forEach(obj=>{ if(obj && obj.destroy) obj.destroy(); });
		}
		this._centerChildren = [];

		// remove any DOM overlays used by tabs
		if (this.removeEquipmentForm) this.removeEquipmentForm();
		if (this.removeCardEditForm) this.removeCardEditForm();
		if (this.removeDiceControls) this.removeDiceControls();
		if (this.removeLibraryPanel) this.removeLibraryPanel();
		if (this.removeMiscEquipTextarea) this.removeMiscEquipTextarea();

		const names = ['Karta postaci', 'Statystyki', 'Ekwipunek', 'Mapa', 'Siatka bitewna', 'Rzuty kostką', 'Biblioteka'];
		if (index === 0){
			this.renderCharacterSheet();
		} else if (index === 1){
			this.renderStatsTab();
		} else if (index === 2){
			this.renderEquipmentTab();
		} else if (index === 5){
			this.renderDiceTab();
		} else if (index === 6){
			this.renderLibraryTab();
		} else {
			this._centerChildren.push(this.add.text(this.centerBg.x, this.centerBg.y, names[index], { font: '24px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2));
		}
	}

	renderCharacterSheet(){
		const cx = this.centerBg.x;
		const cy = this.centerBg.y;
		const cw = this.centerWidth;
		const ch = this.centerHeight;

		// header with name, class/level, player, etc
		const infoY = cy - ch/2 + 28;
		this._centerChildren.push(this.add.text(cx, infoY, this.charData.name, { font: 'bold 24px Arial', fill: '#ffdd55' }).setOrigin(0.5).setDepth(2));
		this._centerChildren.push(this.add.text(cx - cw/2 + 20, infoY + 28, `Class: ${this.charData.classLevel} | Race: ${this.charData.race} | Player: ${this.charData.player}`, { font: '16px Arial', fill: '#fff' }).setOrigin(0,0).setDepth(2));

		// Attributes in two columns (left side)
		const leftX = cx - cw/2 + 40;
		let attrY = infoY + 68;
		const keys = ['STR','DEX','CON','INT','WIS','CHA'];
		keys.forEach((k,i)=>{
			const y = attrY + Math.floor(i/2)*28;
			const x = leftX + (i%2)*140;
			const val = this.charData.attributes[k] || 10;
			const mod = Math.floor((val-10)/2);
			const modStr = mod>=0 ? '+'+mod : String(mod);
			this._centerChildren.push(this.add.text(x, y, `${k}: ${val} (${modStr})`, { font: '16px Arial', fill: '#ddd' }).setOrigin(0).setDepth(2));
		});

		// Stats: AC, HP, Initiative, Speed (below attributes)
		let statsY = attrY + 90;
		const statLeftX = leftX;
		this._centerChildren.push(this.add.text(statLeftX, statsY, `AC: ${this.charData.AC}`, { font: '16px Arial', fill: '#ddd' }).setOrigin(0).setDepth(2));
		this._centerChildren.push(this.add.text(statLeftX + 140, statsY, `HP: ${this.charData.hpCurrent}/${this.charData.hpMax}`, { font: '16px Arial', fill: '#ddd' }).setOrigin(0).setDepth(2));
		statsY += 24;
		this._centerChildren.push(this.add.text(statLeftX, statsY, `Initiative: ${this.charData.initiative>=0? '+'+this.charData.initiative : this.charData.initiative}`, { font: '16px Arial', fill: '#ddd' }).setOrigin(0).setDepth(2));
		this._centerChildren.push(this.add.text(statLeftX + 140, statsY, `Speed: ${this.charData.speed}`, { font: '16px Arial', fill: '#ddd' }).setOrigin(0).setDepth(2));

		// Skills list (middle area)
		const skillX = cx;
		let skillY = attrY;
		this._centerChildren.push(this.add.text(skillX, skillY, 'Skills:', { font: 'bold 16px Arial', fill: '#aaf' }).setOrigin(0.5,0).setDepth(2));
		skillY += 24;
		if (this.charData.skills && this.charData.skills.length > 0){
			this.charData.skills.forEach(sk=>{
				this._centerChildren.push(this.add.text(skillX, skillY, '• '+sk, { font: '15px Arial', fill: '#ddd' }).setOrigin(0.5,0).setDepth(2));
				skillY += 22;
			});
		} else {
			this._centerChildren.push(this.add.text(skillX, skillY, '(none)', { font: '15px Arial', fill: '#888' }).setOrigin(0.5,0).setDepth(2));
		}

		// Equipment slots summary (right area)
		const eqX = cx + cw/2 - 200;
		let eqY = attrY;
		this._centerChildren.push(this.add.text(eqX, eqY, 'Equipment:', { font: 'bold 16px Arial', fill: '#aaf' }).setOrigin(0,0).setDepth(2));
		eqY += 24;
		const slots = {weapon1:'Weapon 1',weapon2:'Weapon 2',armor:'Armor'};
		for (const slot in slots){
			const content = this.charData[slot];
			let label = slots[slot]+': ';
			if (content){
				if (typeof content === 'string') label += content;
				else if (content.type === 'armor') label += `${content.name} (OB ${content.ac}${typeof content.defenseMod !== 'undefined' ? ' +'+content.defenseMod : ''}${content.armorClass ? ', ' + content.armorClass : ''})`;
				else if (content.type === 'weapon') label += `${content.name} (${content.rolls}×${content.die})${typeof content.attackMod !== 'undefined' ? ' atk:'+content.attackMod : ''}${typeof content.damageMod !== 'undefined' ? ' dmg:'+content.damageMod : ''}`;
				else label += content.name || JSON.stringify(content);
			} else {
				label += '—';
			}
			this._centerChildren.push(this.add.text(eqX, eqY, label, { font: '15px Arial', fill: '#ddd', wordWrap: { width: 180 } }).setOrigin(0,0).setDepth(2));
			eqY += 40;
		}

		// Buttons: Save, Import, New
		const buttonY = cy + ch/2 - 48;
		const bw = 120;
		const saveBg = this.add.rectangle(cx - bw - 16, buttonY, bw, 36, 0x228844).setInteractive({ useHandCursor: true }).setDepth(1);
		const saveText = this.add.text(cx - bw - 16, buttonY, 'Zapisz kartę', { font: '16px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2);
		saveBg.on('pointerdown', ()=>{ this.downloadCardFile(); });
		this._centerChildren.push(saveBg, saveText);

		const loadBg = this.add.rectangle(cx, buttonY, bw, 36, 0x447799).setInteractive({ useHandCursor: true }).setDepth(1);
		const loadText = this.add.text(cx, buttonY, 'Import', { font: '16px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2);
		loadBg.on('pointerdown', ()=>{ this.importCard(); });
		this._centerChildren.push(loadBg, loadText);

		const newBg = this.add.rectangle(cx + bw + 16, buttonY, bw, 36, 0xaa5533).setInteractive({ useHandCursor: true }).setDepth(1);
		const newText = this.add.text(cx + bw + 16, buttonY, 'Nowa karta', { font: '16px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2);
		newBg.on('pointerdown', ()=>{ this.showEditCardForm(); });
		this._centerChildren.push(newBg, newText);
	}

	renderStatsTab(){
		const cx = this.centerBg.x;
		const cy = this.centerBg.y;
		const cw = this.centerWidth;
		const headerY = cy - cw/2 + 20;

		this._centerChildren.push(this.add.text(cx, cy - this.centerHeight/2 + 30, 'Statystyki (kliknij wartość, by edytować)', { font: '18px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2));

		const keys = ['STR','DEX','CON','INT','WIS','CHA'];
		const leftX = cx - cw/2 + 120;
		let attrY = cy - this.centerHeight/2 + 80;
		keys.forEach((k,i)=>{
			const y = attrY + i*44;
			this._centerChildren.push(this.add.text(leftX - 60, y, k, { font: '16px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2));
			const minus = this.add.text(leftX - 20, y, '−', { font: '20px Arial', fill: '#ff6666' }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });
			minus.on('pointerdown', ()=>{ this.charData.attributes[k] = Math.max(1, (this.charData.attributes[k]||10)-1); this.saveCharData(); this.showTabContent(1); });
			const valText = this.add.text(leftX + 12, y, String(this.charData.attributes[k]||10), { font: '18px Arial', fill: '#ffdd55' }).setOrigin(0.5).setDepth(2);
			const plus = this.add.text(leftX + 44, y, '+', { font: '18px Arial', fill: '#88ff88' }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });
			plus.on('pointerdown', ()=>{ this.charData.attributes[k] = (this.charData.attributes[k]||10)+1; this.saveCharData(); this.showTabContent(1); });
			this._centerChildren.push(minus, valText, plus);
		});

		// Editable AC / HP / Initiative / Speed with +/- controls
		const centerX = cx + 60;
		let statY = cy - this.centerHeight/2 + 80;
		// AC
		this._centerChildren.push(this.add.text(centerX - 48, statY, 'AC', { font: '14px Arial', fill: '#fff' }).setOrigin(0,0).setDepth(2));
		const acMinus = this.add.text(centerX - 8, statY, '−', { font: '18px Arial', fill: '#ff6666' }).setInteractive({ useHandCursor: true }).setDepth(2);
		acMinus.on('pointerdown', ()=>{ this.charData.AC = Math.max(0,(this.charData.AC||10)-1); this.saveCharData(); this.showTabContent(1); });
		const acVal = this.add.text(centerX + 10, statY, String(this.charData.AC), { font: '16px Arial', fill: '#ffdd55' }).setOrigin(0,0).setDepth(2);
		const acPlus = this.add.text(centerX + 46, statY, '+', { font: '18px Arial', fill: '#88ff88' }).setInteractive({ useHandCursor: true }).setDepth(2);
		acPlus.on('pointerdown', ()=>{ this.charData.AC = (this.charData.AC||10)+1; this.saveCharData(); this.showTabContent(1); });
		this._centerChildren.push(acMinus, acVal, acPlus);

		// HP current / max with +/- for each
		statY += 30;
		this._centerChildren.push(this.add.text(centerX - 80, statY, 'HP:', { font: '14px Arial', fill: '#fff' }).setOrigin(0,0).setDepth(2));
		const hpCurrMinus = this.add.text(centerX - 28, statY, '−', { font: '18px Arial', fill: '#ff6666' }).setInteractive({ useHandCursor: true }).setDepth(2);
		hpCurrMinus.on('pointerdown', ()=>{ this.charData.hpCurrent = Math.max(0,(this.charData.hpCurrent||0)-1); this.saveCharData(); this.showTabContent(1); });
		const hpCurrVal = this.add.text(centerX + 4, statY, String(this.charData.hpCurrent), { font: '16px Arial', fill: '#ffdd55' }).setOrigin(0,0).setDepth(2);
		const hpCurrPlus = this.add.text(centerX + 30, statY, '+', { font: '18px Arial', fill: '#88ff88' }).setInteractive({ useHandCursor: true }).setDepth(2);
		hpCurrPlus.on('pointerdown', ()=>{ this.charData.hpCurrent = (this.charData.hpCurrent||0)+1; if(this.charData.hpCurrent>this.charData.hpMax) this.charData.hpCurrent=this.charData.hpMax; this.saveCharData(); this.showTabContent(1); });
		this._centerChildren.push(hpCurrMinus, hpCurrVal, hpCurrPlus);

		// HP max
		const hpMaxMinus = this.add.text(centerX + 68, statY, '−', { font: '18px Arial', fill: '#ff6666' }).setInteractive({ useHandCursor: true }).setDepth(2);
		hpMaxMinus.on('pointerdown', ()=>{ this.charData.hpMax = Math.max(1,(this.charData.hpMax||1)-1); if(this.charData.hpCurrent>this.charData.hpMax) this.charData.hpCurrent=this.charData.hpMax; this.saveCharData(); this.showTabContent(1); });
		const hpMaxVal = this.add.text(centerX + 92, statY, String(this.charData.hpMax), { font: '16px Arial', fill: '#ffdd55' }).setOrigin(0,0).setDepth(2);
		const hpMaxPlus = this.add.text(centerX + 118, statY, '+', { font: '18px Arial', fill: '#88ff88' }).setInteractive({ useHandCursor: true }).setDepth(2);
		hpMaxPlus.on('pointerdown', ()=>{ this.charData.hpMax = (this.charData.hpMax||1)+1; this.saveCharData(); this.showTabContent(1); });
		this._centerChildren.push(hpMaxMinus, hpMaxVal, hpMaxPlus, hpMaxVal);

		// Initiative
		statY += 30;
		this._centerChildren.push(this.add.text(centerX - 80, statY, 'Inicjatywa', { font: '14px Arial', fill: '#fff' }).setOrigin(0,0).setDepth(2));
		const initMinus = this.add.text(centerX - 8, statY, '−', { font: '18px Arial', fill: '#ff6666' }).setInteractive({ useHandCursor: true }).setDepth(2);
		initMinus.on('pointerdown', ()=>{ this.charData.initiative = (this.charData.initiative||0)-1; this.saveCharData(); this.showTabContent(1); });
		const initVal = this.add.text(centerX + 10, statY, String(this.charData.initiative>=0? '+'+this.charData.initiative : this.charData.initiative), { font: '16px Arial', fill: '#ffdd55' }).setOrigin(0,0).setDepth(2);
		const initPlus = this.add.text(centerX + 46, statY, '+', { font: '18px Arial', fill: '#88ff88' }).setInteractive({ useHandCursor: true }).setDepth(2);
		initPlus.on('pointerdown', ()=>{ this.charData.initiative = (this.charData.initiative||0)+1; this.saveCharData(); this.showTabContent(1); });
		this._centerChildren.push(initMinus, initVal, initPlus);

		// Speed
		statY += 30;
		this._centerChildren.push(this.add.text(centerX - 80, statY, 'Prędkość', { font: '14px Arial', fill: '#fff' }).setOrigin(0,0).setDepth(2));
		const spdMinus = this.add.text(centerX - 8, statY, '−', { font: '18px Arial', fill: '#ff6666' }).setInteractive({ useHandCursor: true }).setDepth(2);
		spdMinus.on('pointerdown', ()=>{ this.charData.speed = Math.max(0,(this.charData.speed||0)-5); this.saveCharData(); this.showTabContent(1); });
		const spdVal = this.add.text(centerX + 10, statY, String(this.charData.speed), { font: '16px Arial', fill: '#ffdd55' }).setOrigin(0,0).setDepth(2);
		const spdPlus = this.add.text(centerX + 46, statY, '+', { font: '18px Arial', fill: '#88ff88' }).setInteractive({ useHandCursor: true }).setDepth(2);
		spdPlus.on('pointerdown', ()=>{ this.charData.speed = (this.charData.speed||0)+5; this.saveCharData(); this.showTabContent(1); });
		this._centerChildren.push(spdMinus, spdVal, spdPlus);
	}

	renderEquipmentTab(){
		const cx = this.centerBg.x;
		const cy = this.centerBg.y;
		const cw = this.centerWidth;

		this._centerChildren.push(this.add.text(cx, cy - this.centerHeight/2 + 30, 'Ekwipunek - Sloty broni i zbroi', { font: '18px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2));

		// three slots: Weapon 1, Weapon 2, Armor
		const slotW = Math.floor((cw - 80) / 3);
		const slotY = cy - this.centerHeight/2 + 90;
		const slots = ['weapon1','weapon2','armor'];
		slots.forEach((slot,i)=>{
			const x = cx - cw/2 + 40 + i*(slotW + 20) + slotW/2;
			const rect = this.add.rectangle(x, slotY + 20, slotW, 180, 0x1b1b25).setStrokeStyle(1,0x444444).setOrigin(0.5).setDepth(1);
			this._centerChildren.push(rect);
			this._centerChildren.push(this.add.text(x, slotY - 10, slot === 'armor' ? 'Zbroja' : `Broń ${i+1}`, { font: '16px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2));
			const content = this.charData[slot];
			if (content){
				// display content depending on type
				let label = '';
				if (typeof content === 'string') label = content;
				else if (content.type === 'armor') label = `${content.name} (OB: ${content.ac}${typeof content.defenseMod !== 'undefined' ? ' +'+content.defenseMod : ''}${content.armorClass ? ', ' + content.armorClass : ''})`;
				else if (content.type === 'weapon') label = `${content.name} (${content.rolls}×${content.die})${typeof content.attackMod !== 'undefined' ? ' atk:'+ (content.attackMod>=0? '+'+content.attackMod:content.attackMod) : ''}${typeof content.damageMod !== 'undefined' ? ' dmg:'+ (content.damageMod>=0? '+'+content.damageMod:content.damageMod) : ''}`;
				else label = content.name || JSON.stringify(content);
				this._centerChildren.push(this.add.text(x, slotY + 10, label, { font: '14px Arial', fill: '#ddd', wordWrap: { width: slotW - 20 } }).setOrigin(0.5).setDepth(2));
				// edit & remove buttons
				const edit = this.add.text(x - 40, slotY + 70, 'Edytuj', { font: '14px Arial', fill: '#88ff88' }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor:true });
				edit.on('pointerdown', ()=>{ this.showSlotEditForm(slot); });
				const del = this.add.text(x + 40, slotY + 70, 'Usuń', { font: '14px Arial', fill: '#ff6666' }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor:true });
				del.on('pointerdown', ()=>{ this.charData[slot] = null; this.saveCharData(); this.showTabContent(2); });
				this._centerChildren.push(edit, del);
			} else {
				this._centerChildren.push(this.add.text(x, slotY + 10, 'Brak', { font: '14px Arial', fill: '#888' }).setOrigin(0.5).setDepth(2));
				const add = this.add.text(x, slotY + 70, 'Ustaw', { font: '14px Arial', fill: '#88ff88' }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor:true });
				add.on('pointerdown', ()=>{ this.showSlotEditForm(slot); });
				this._centerChildren.push(add);
			}
		});

		// Misc equip free-text area (DOM textarea)
		this.createMiscEquipTextarea();

		// (Removed general add-button per user request)
	}

	renderDiceTab(){
		const cx = this.centerBg.x;
		const cy = this.centerBg.y;
		const cw = this.centerWidth;
		const ch = this.centerHeight;

		// Available dice (keys loaded in preload) - layout vertically on the left side
		const dice = ['d4','d6','d8','d10','d12','d20','d100'];
		this.diceHistory = this.diceHistory || [];
		// create controls (how many rolls, which stat modifier)
		this.showDiceControls();

		const leftX = cx - cw/2 + 64; // left column inside center panel
		const startY = cy - ch/2 + 48;
		const imgSize = 96; // bigger graphics per request
		const gapY = 64; // reduced vertical gap to fit
		for (let i=0;i<dice.length;i++){
			const key = dice[i];
			const x = leftX;
			const y = startY + i * gapY;
			if (this.textures.exists(key)){
				const img = this.add.image(x,y,key).setDisplaySize(imgSize,imgSize).setInteractive({ useHandCursor: true }).setDepth(2);
				img.on('pointerdown', ()=>{ this.rollDie(key); });
				this._centerChildren.push(img);
				this._centerChildren.push(this.add.text(x + imgSize/2 + 12, y, key.toUpperCase(), { font: '14px Arial', fill: '#ddd' }).setOrigin(0,0.5).setDepth(2));
			} else {
				this._centerChildren.push(this.add.rectangle(x,y,imgSize,imgSize,0x333333).setOrigin(0.5).setDepth(2));
			}
		}

		// Result display: centered at the top of the center panel
		const resultX = cx;
		const resultY = cy - ch/2 + 18;
		this._diceResultText = this.add.text(resultX, resultY, 'Wynik: —', { font: '18px Arial', fill: '#ffea8a' }).setOrigin(0.5,0).setDepth(2);
		this._centerChildren.push(this._diceResultText);

		// History: centered below the result, stacking downward from top
		this._diceHistoryTexts = [];
		let histStartY = resultY + 28;
		for (let i=0;i<6;i++){
			const t = this.add.text(resultX, histStartY + i*20, '', { font: '14px Arial', fill: '#ccc' }).setOrigin(0.5,0).setDepth(2);
			this._centerChildren.push(t);
			this._diceHistoryTexts.push(t);
		}
	}

	rollDie(key){
		// key like 'd6' or 'd100'
		const sides = parseInt(key.replace(/[^0-9]/g,'')) || 6;

		// read controls (if present)
		let count = 1;
		let modStat = 'none';
		if (typeof document !== 'undefined'){
			const c = document.getElementById('dice-roll-count');
			const m = document.getElementById('dice-modifier');
			if (c) count = parseInt(c.value) || 1;
			if (m) modStat = m.value || 'none';
		}

		const rolls = [];
		for (let r=0;r<count;r++){
			rolls.push(Math.floor(Math.random()*sides) + 1);
		}
		const attrMod = (modStat && modStat !== 'none' && this.charData && this.charData.attributes && typeof this.charData.attributes[modStat] !== 'undefined') ? Math.floor(((this.charData.attributes[modStat]||10)-10)/2) : 0;
		const sum = rolls.reduce((a,b)=>a+b,0) + attrMod;
		const txt = `${key.toUpperCase()} x${count} → [${rolls.join(', ')}]${attrMod!==0 ? ' + ' + (attrMod>=0? '+'+attrMod : attrMod) : ''} = ${sum}`;
		if (this._diceResultText) this._diceResultText.setText('Wynik: '+txt);
		this.diceHistory = this.diceHistory || [];
		this.diceHistory.unshift(txt);
		if (this.diceHistory.length>6) this.diceHistory.pop();
		if (this._diceHistoryTexts){
			for (let i=0;i<this._diceHistoryTexts.length;i++){
				this._diceHistoryTexts[i].setText(this.diceHistory[i] || '');
			}
		}
	}

	renderLibraryTab(){
		const cx = this.centerBg.x;
		const cy = this.centerBg.y;
		this._centerChildren.push(this.add.text(cx, cy - this.centerHeight/2 + 30, 'Biblioteka', { font: '18px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2));
		this.showLibraryPanel();
	}

	// ================================================================================
	// HELPER METHODS
	// ================================================================================

	// Create small DOM controls for dice: number of rolls and attribute modifier selector
	showDiceControls(){
		if (typeof document === 'undefined') return;
		if (document.getElementById('dice-controls')) return;
		const div = document.createElement('div');
		div.id = 'dice-controls';
		div.style.position = 'fixed';
		div.style.background = '#121212';
		div.style.color = '#fff';
		div.style.padding = '8px';
		div.style.border = '1px solid #444';
		div.style.zIndex = 9999;
		div.style.cursor = 'default';
		// compact control: roll count + small modifier selector below
		div.style.width = '160px';
		div.style.fontSize = '13px';
		div.innerHTML = `
			<div style="margin-bottom:4px;font-weight:bold; -webkit-user-select:none;text-align:center">Rzuty</div>
			<div style="margin-bottom:6px;text-align:center">Ilość: <select id="dice-roll-count">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></div>
			<div style="margin-bottom:4px;text-align:center;font-size:12px">Modyfikator:</div>
			<div style="text-align:center"><select id="dice-modifier" style="width:86px"><option value="none">Brak</option>${['STR','DEX','CON','INT','WIS','CHA'].map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div>
		`;
		document.body.appendChild(div);

		// position it at the top-right of the center panel
		try{
			const canvasRect = this.game.canvas.getBoundingClientRect();
			const cx = this.centerBg.x;
			const cw = this.centerWidth;
			// right edge of centerBg in viewport coords
			const rightEdge = Math.round(canvasRect.left + (cx + cw/2));
			const topEdge = Math.round(canvasRect.top + (this.centerBg.y - this.centerHeight/2));
			// small offset
			const offset = 12;
			// set left based on div width (after appended)
			const divW = Math.min(260, Math.max(160, div.offsetWidth || 220));
			div.style.left = (rightEdge - divW - offset) + 'px';
			div.style.top = (topEdge + offset) + 'px';
		}catch(e){
			// fallback to window top-right
			div.style.right = '12px';
			div.style.top = '12px';
		}
	}

	removeDiceControls(){
		if (typeof document === 'undefined') return;
		const d = document.getElementById('dice-controls');
		if (d) d.remove();
	}


	// --- Library UI: upload / preview PDFs and images ---
	renderLibraryTab(){
		const cx = this.centerBg.x;
		const cy = this.centerBg.y;
		this._centerChildren.push(this.add.text(cx, cy - this.centerHeight/2 + 30, 'Biblioteka - Zarządzaj plikami', { font: '18px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2));
		this.showLibraryPanel();
	}

	showLibraryPanel(){
		if (typeof document === 'undefined') return;
		if (document.getElementById('library-panel')) return;
		const div = document.createElement('div');
		div.id = 'library-panel';
		div.style.position = 'absolute';
		div.style.right = '';
		div.style.top = '';
		div.style.width = '360px';
		div.style.maxHeight = '70vh';
		div.style.overflow = 'auto';
		div.style.background = '#111';
		div.style.color = '#fff';
		div.style.padding = '10px';
		div.style.border = '1px solid #444';
		div.style.zIndex = 9999;
		div.innerHTML = `
			<div style="font-weight:bold;margin-bottom:8px">Biblioteka</div>
			<div style="margin-bottom:8px">
				<select id="library-category" style="width:140px;padding:6px">
					<option value="pdfs">PDF</option>
					<option value="maps">Mapa (obraz)</option>
					<option value="backgrounds">Tła (obraz)</option>
					<option value="tokens">Tokeny (obraz)</option>
				</select>
				<input id="library-file" type="file" style="margin-left:8px" />
				<button id="library-upload" style="margin-left:8px">Wgraj</button>
			</div>
			<div id="library-lists"></div>
		`;
		document.body.appendChild(div);

		// position the panel relative to the centerBg (inside the main content area)
		try{
			const canvasRect = this.game.canvas.getBoundingClientRect();
			const cx = this.centerBg.x;
			const cw = this.centerWidth;
			const rightEdge = Math.round(canvasRect.left + (cx + cw/2));
			const topEdge = Math.round(canvasRect.top + (this.centerBg.y - this.centerHeight/2));
			const offset = 12;
			const divW = Math.min(420, Math.max(280, div.offsetWidth || 360));
			div.style.left = (rightEdge - divW - offset) + 'px';
			div.style.top = (topEdge + offset) + 'px';
			div.style.position = 'absolute';
		}catch(e){
			// fallback to fixed position if bounding rect fails
			div.style.position = 'fixed';
			div.style.right = '12px';
			div.style.top = '12px';
		}

		const fileInput = div.querySelector('#library-file');
		const catSel = div.querySelector('#library-category');
		const uploadBtn = div.querySelector('#library-upload');
		const lists = div.querySelector('#library-lists');

		uploadBtn.addEventListener('click', ()=>{
			const f = fileInput.files && fileInput.files[0];
			if (!f){ alert('Wybierz plik do wgrania'); return; }
			const cat = catSel.value || 'pdfs';
			this.addLibraryFile(f, cat).then(()=>{ fileInput.value = ''; this.updateLibraryList(); this.saveLibrary(); this.showTemporaryMessage('Wgrano plik do biblioteki'); }).catch(err=>{ alert('Błąd wgrywania: '+err.message); });
		});

		this.updateLibraryList();
	}

	removeLibraryPanel(){
		if (typeof document === 'undefined') return;
		const p = document.getElementById('library-panel');
		if (p) p.remove();
	}

	addLibraryFile(file, category){
		return new Promise((resolve, reject)=>{
			const reader = new FileReader();
			reader.onload = (e)=>{
				try{
					const dataURL = e.target.result;
					this.library = this.library || { pdfs: [], maps: [], backgrounds: [], tokens: [] };
					this.library[category] = this.library[category] || [];
					this.library[category].push({ name: file.name, dataURL: dataURL, type: file.type });
					resolve();
				}catch(err){ reject(err); }
			};
			reader.onerror = (err)=> reject(err);
			// read as data URL so we can preview inline
			reader.readAsDataURL(file);
		});
	}

	updateLibraryList(){
		const div = document.getElementById('library-panel');
		if (!div) return;
		const lists = div.querySelector('#library-lists');
		if (!lists) return;
		lists.innerHTML = '';
		const categories = [ ['pdfs','PDFy'], ['maps','Mapy'], ['backgrounds','Tła'], ['tokens','Tokeny'] ];
		categories.forEach(([key,label])=>{
			const items = (this.library && this.library[key]) || [];
			const sec = document.createElement('div');
			sec.style.marginBottom = '10px';
			sec.innerHTML = `<div style="font-weight:bold;margin-bottom:6px">${label} (${items.length})</div>`;
			items.forEach((it, idx)=>{
				const row = document.createElement('div');
				row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.marginBottom = '6px';
				if (it.type && it.type.indexOf('image') === 0){
					const img = document.createElement('img'); img.src = it.dataURL; img.style.width='84px'; img.style.height='auto'; img.style.objectFit='cover'; img.style.marginRight='8px'; row.appendChild(img);
				} else if (it.type && it.type.indexOf('pdf')>=0){
					const ico = document.createElement('div'); ico.textContent = 'PDF'; ico.style.width='84px'; ico.style.height='48px'; ico.style.display='flex'; ico.style.alignItems='center'; ico.style.justifyContent='center'; ico.style.background='#222'; ico.style.marginRight='8px'; row.appendChild(ico);
				}
				const meta = document.createElement('div'); meta.style.flex='1'; meta.innerHTML = `<div style="font-size:13px">${it.name}</div>`;
				row.appendChild(meta);
				const btnView = document.createElement('button'); btnView.textContent = 'Podgląd'; btnView.style.marginRight='6px';
				btnView.addEventListener('click', ()=>{ window.open(it.dataURL, '_blank'); });
				row.appendChild(btnView);
				const btnDel = document.createElement('button'); btnDel.textContent = 'Usuń'; btnDel.style.marginRight='6px';
				btnDel.addEventListener('click', ()=>{ this.library[key].splice(idx,1); this.saveLibrary(); this.updateLibraryList(); });
				row.appendChild(btnDel);
				sec.appendChild(row);
			});
			lists.appendChild(sec);
		});
	}

	// DOM overlay form for adding equipment with fields: name, rolls, die
	showEquipmentForm(){
		if (document.getElementById('equip-form')) return;
		const form = document.createElement('div');
		form.id = 'equip-form';
		form.style.position = 'fixed';
		form.style.left = '50%';
		form.style.top = '50%';
		form.style.transform = 'translate(-50%, -50%)';
		form.style.background = '#111' ;
		form.style.color = '#fff';
		form.style.padding = '12px';
		form.style.border = '2px solid #444';
		form.style.zIndex = 9999;
		form.innerHTML = `
			<div style="margin-bottom:8px;font-weight:bold">Dodaj przedmiot / zbroję</div>
			<div style="margin-bottom:6px">
				<select id="equip-type" style="padding:6px">
					<option value="weapon">Broń (z rzutu)</option>
					<option value="armor">Zbroja (wartość obrony)</option>
				</select>
			</div>
			<div style="margin-bottom:6px"><input id="equip-name" placeholder="Nazwa" style="width:260px;padding:6px" /></div>
			<div id="weapon-fields" style="margin-bottom:6px">
				<input id="equip-rolls" placeholder="Ilość rzutów (np. 3)" style="width:120px;padding:6px" />
				<input id="equip-die" placeholder="Jaką kością (np. d6)" style="width:120px;padding:6px;margin-left:8px" />
			</div>
			<div id="armor-fields" style="display:none;margin-bottom:6px">
				<input id="equip-ac" placeholder="Wartość obrony (np. 15)" style="width:120px;padding:6px" />
			</div>
			<div style="margin-bottom:8px;text-align:right"><button id="equip-add">Dodaj</button> <button id="equip-cancel">Anuluj</button></div>
		`;
		document.body.appendChild(form);
		const typeSel = document.getElementById('equip-type');
		const weaponFields = document.getElementById('weapon-fields');
		const armorFields = document.getElementById('armor-fields');
		typeSel.addEventListener('change', ()=>{
			if (typeSel.value === 'armor'){ weaponFields.style.display = 'none'; armorFields.style.display = 'block'; }
			else { weaponFields.style.display = 'block'; armorFields.style.display = 'none'; }
		});

		document.getElementById('equip-add').addEventListener('click', ()=>{
			const type = document.getElementById('equip-type').value;
			const name = document.getElementById('equip-name').value || '';
			if (name.trim().length===0){ alert('Podaj nazwę przedmiotu'); return; }
			this.charData.equipment = this.charData.equipment || [];
			if (type === 'weapon'){
				const rolls = parseInt(document.getElementById('equip-rolls').value) || 0;
				const die = document.getElementById('equip-die').value || '';
				this.charData.equipment.push({ type: 'weapon', name: name.trim(), rolls: rolls, die: die.trim() });
			} else {
				const ac = parseInt(document.getElementById('equip-ac').value) || 0;
				this.charData.equipment.push({ type: 'armor', name: name.trim(), ac: ac });
			}
			this.saveCharData();
			this.removeEquipmentForm();
			this.showTabContent(2);
		});
		document.getElementById('equip-cancel').addEventListener('click', ()=>{ this.removeEquipmentForm(); });
	}

	removeEquipmentForm(){
		const f = document.getElementById('equip-form');
		if (f) f.remove();
	}

	// Slot edit form for weapon1/weapon2/armor
	showSlotEditForm(slot){
		if (document.getElementById('slot-edit-form')) return;
		const existing = this.charData[slot] || {};
			const form = document.createElement('div'); form.id = 'slot-edit-form';
		form.style.position='fixed'; form.style.left='50%'; form.style.top='50%'; form.style.transform='translate(-50%,-50%)';
		form.style.background='#111'; form.style.color='#fff'; form.style.padding='12px'; form.style.border='2px solid #444'; form.style.zIndex=9999;
			form.innerHTML = `
				<div style="font-weight:bold;margin-bottom:8px">Ustaw ${slot === 'armor' ? 'Zbroję' : 'Broń'}</div>
				<div style="margin-bottom:6px"><input id="slot-name" placeholder="Nazwa" value="${existing.name||''}" style="width:320px;padding:6px"/></div>
				<div id="slot-weapon-fields" style="margin-bottom:6px;display:${existing.type==='weapon' || slot !== 'armor' ? 'block':'none'}">
					<input id="slot-rolls" placeholder="Ilość rzutów" value="${existing.rolls||''}" style="width:90px;padding:6px" />
					<input id="slot-die" placeholder="Kość (np. d6)" value="${existing.die||''}" style="width:90px;padding:6px;margin-left:8px" />
					<input id="slot-attack-mod" placeholder="Modyfikator ataku (np. 2)" value="${existing.attackMod||''}" style="width:90px;padding:6px;margin-left:8px" />
					<input id="slot-damage-mod" placeholder="Modyfikator obrażeń (np. 1)" value="${existing.damageMod||''}" style="width:90px;padding:6px;margin-left:8px" />
				</div>
				<div id="slot-armor-fields" style="margin-bottom:6px;display:${existing.type==='armor' || slot === 'armor' ? 'block':'none'}">
					<input id="slot-ac" placeholder="Wartość obrony (AC)" value="${existing.ac||''}" style="width:80px;padding:6px" />
					<input id="slot-defense-mod" placeholder="Modyfikator obrony" value="${existing.defenseMod||''}" style="width:120px;padding:6px;margin-left:8px" />
					<select id="slot-armor-class" style="width:120px;padding:6px;margin-left:8px">
						<option value="Light" ${existing.armorClass==='Light' ? 'selected':''}>Lekka</option>
						<option value="Medium" ${existing.armorClass==='Medium' ? 'selected':''}>Średnia</option>
						<option value="Heavy" ${existing.armorClass==='Heavy' ? 'selected':''}>Ciężka</option>
					</select>
				</div>
				<div style="margin-top:8px;text-align:right"><button id="slot-save">Zapisz</button> <button id="slot-cancel">Anuluj</button></div>
			`;
		document.body.appendChild(form);
		const nameInp = document.getElementById('slot-name');
		const rollsInp = document.getElementById('slot-rolls');
		const dieInp = document.getElementById('slot-die');
		const acInp = document.getElementById('slot-ac');
		const weaponFields = document.getElementById('slot-weapon-fields');
		const armorFields = document.getElementById('slot-armor-fields');

		document.getElementById('slot-save').addEventListener('click', ()=>{
			const name = nameInp.value || '';
			if (slot === 'armor'){
				const ac = parseInt(acInp.value) || 0;
				const defenseMod = parseInt((document.getElementById('slot-defense-mod')||{value:0}).value) || 0;
				const armorClass = document.getElementById('slot-armor-class').value || 'Light';
				this.charData[slot] = { type: 'armor', name: name.trim(), ac: ac, defenseMod: defenseMod, armorClass: armorClass };
				// Apply armor to character AC (base AC overwritten by armor + defense mod)
				this.charData.AC = ac + defenseMod;
				this.showTemporaryMessage('Zapisano zbroję i ustawiono AC');
			} else {
				const rolls = parseInt(rollsInp.value) || 0;
				const die = dieInp.value || '';
				const attackMod = parseInt((document.getElementById('slot-attack-mod')||{value:0}).value) || 0;
				const damageMod = parseInt((document.getElementById('slot-damage-mod')||{value:0}).value) || 0;
				this.charData[slot] = { type: 'weapon', name: name.trim(), rolls: rolls, die: die, attackMod: attackMod, damageMod: damageMod };
			}
			this.saveCharData(); this.removeSlotEditForm(); this.showTabContent(2);
		});
		document.getElementById('slot-cancel').addEventListener('click', ()=>{ this.removeSlotEditForm(); });
	}

	removeSlotEditForm(){ const f = document.getElementById('slot-edit-form'); if (f) f.remove(); }

	// Misc equipment textarea (DOM) to enter arbitrary items
	createMiscEquipTextarea(){
		if (typeof document === 'undefined') return;
		if (document.getElementById('misc-equip-textarea')) return;
		const ta = document.createElement('textarea');
		ta.id = 'misc-equip-textarea';
		ta.style.position = 'absolute';
		ta.style.width = '360px';
		ta.style.height = '160px';
		ta.style.right = '';
		ta.style.top = '';
		ta.style.padding = '8px';
		ta.style.background = '#0f0f0f';
		ta.style.color = '#fff';
		ta.style.border = '1px solid #444';
		ta.style.zIndex = 9998;
		ta.placeholder = 'Wpisz dowolne elementy wyposażenia tutaj...';
		ta.value = this.charData.miscEquipText || '';
		document.body.appendChild(ta);
		// position relative to centerBg
		try{
			const canvasRect = this.game.canvas.getBoundingClientRect();
			const cx = this.centerBg.x; const cw = this.centerWidth; const cy = this.centerBg.y; const ch = this.centerHeight;
			const leftEdge = Math.round(canvasRect.left + (cx - cw/2));
			const topEdge = Math.round(canvasRect.top + (cy + ch/2) - 200); // place near bottom of center
			ta.style.left = (leftEdge + 20) + 'px';
			ta.style.top = (topEdge) + 'px';
			ta.style.position = 'absolute';
		}catch(e){ ta.style.right='12px'; ta.style.top='60px'; ta.style.position='fixed'; }
		ta.addEventListener('blur', ()=>{ this.charData.miscEquipText = ta.value; this.saveCharData(); });
	}

	removeMiscEquipTextarea(){ const t = document.getElementById('misc-equip-textarea'); if (t) t.remove(); }

	// Download current charData as a JSON file
	downloadCardFile(){
		try{
			const data = JSON.stringify(this.charData, null, 2);
			const blob = new Blob([data], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `karta_${(this.charData.name||'postac').replace(/\s+/g,'_')}.json`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			this.showTemporaryMessage('Pobrano plik z kartą');
		}catch(e){ alert('Błąd podczas pobierania pliku: '+e.message); }
	}

	// Import card from a selected JSON file
	importCard(){
		// create hidden file input
		const existing = document.getElementById('import-file-input');
		if (existing){ existing.remove(); }
		const inp = document.createElement('input');
		inp.type = 'file'; inp.accept = '.json,application/json'; inp.id = 'import-file-input';
		inp.style.display = 'none';
		document.body.appendChild(inp);
		inp.addEventListener('change', (ev)=>{
			const f = ev.target.files[0];
			if (!f) return;
			const reader = new FileReader();
			reader.onload = (e)=>{
				try{
					const obj = JSON.parse(e.target.result);
					if (obj && obj.name){
						this.charData = obj;
						this.saveCharData();
						this.showTabContent(0);
						this.showTemporaryMessage('Zaimportowano kartę z pliku');
					} else { alert('Nieprawidłowy format pliku JSON'); }
				}catch(err){ alert('Błąd parsowania pliku: '+err.message); }
			};
			reader.readAsText(f);
		});
		inp.click();
	}

	// Show card editor form; if isNew=true, start with defaults (stats=10)
	showEditCardForm(isNew=false){
		if (document.getElementById('card-edit-form')) return;
		const base = isNew ? {
			name: '', classLevel: '', background: '', player: '', race: '', alignment: '', xp: 0,
			AC: 10, initiative: 0, speed: 30, hpCurrent: 1, hpMax: 1, hitDice: '1d8',
			attributes: { STR:10, DEX:10, CON:10, INT:10, WIS:10, CHA:10 },
			proficiency: 2, skills: [], equipment: []
		} : this.charData;
		const form = document.createElement('div'); form.id = 'card-edit-form';
		form.style.position='fixed'; form.style.left='50%'; form.style.top='50%'; form.style.transform='translate(-50%,-50%)';
		form.style.background='#111'; form.style.color='#fff'; form.style.padding='12px'; form.style.border='2px solid #444'; form.style.zIndex=9999;
		form.innerHTML = `
			<div style="font-weight:bold;margin-bottom:8px">Edycja karty postaci</div>
			<div style="margin-bottom:6px"><input id="card-name" placeholder="Imię" value="${base.name||''}" style="width:320px;padding:6px"/></div>
			<div style="margin-bottom:6px"><input id="card-class" placeholder="Klasa/Poziom" value="${base.classLevel||''}" style="width:320px;padding:6px"/></div>
			<div style="margin-bottom:6px"><input id="card-race" placeholder="Rasa" value="${base.race||''}" style="width:320px;padding:6px"/></div>
			<div style="margin-bottom:6px"><input id="card-player" placeholder="Gracz" value="${base.player||''}" style="width:320px;padding:6px"/></div>
			<div style="margin-bottom:6px"><input id="card-background" placeholder="Tło" value="${base.background||''}" style="width:320px;padding:6px"/></div>
			<div style="margin-bottom:6px"><input id="card-alignment" placeholder="Alignment" value="${base.alignment||''}" style="width:320px;padding:6px"/></div>
			<div style="margin-bottom:6px">Statystyki (edytuj):</div>
			<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">
				${['STR','DEX','CON','INT','WIS','CHA'].map(k=>`<div style="width:90px"><label style="display:block">${k}</label><input id="card-${k}" type="number" value="${(base.attributes&&base.attributes[k])||10}" style="width:70px;padding:4px"/></div>`).join('')}
			</div>
			<div style="margin-bottom:6px"><label>AC</label><input id="card-AC" type="number" value="${base.AC||10}" style="width:90px;padding:4px"/></div>
			<div style="margin-bottom:6px"><label>HP (current/max)</label><input id="card-hp-current" type="number" value="${base.hpCurrent||1}" style="width:90px;padding:4px"/> / <input id="card-hp-max" type="number" value="${base.hpMax||1}" style="width:90px;padding:4px"/></div>
			<div style="margin-top:8px;text-align:right"><button id="card-save">Zapisz</button> <button id="card-cancel">Anuluj</button></div>
		`;
		document.body.appendChild(form);
		document.getElementById('card-save').addEventListener('click', ()=>{
			// collect
			const newCard = {};
			newCard.name = document.getElementById('card-name').value || 'BezImienia';
			newCard.classLevel = document.getElementById('card-class').value || '';
			newCard.race = document.getElementById('card-race').value || '';
			newCard.player = document.getElementById('card-player').value || '';
			newCard.background = document.getElementById('card-background').value || '';
			newCard.alignment = document.getElementById('card-alignment').value || '';
			newCard.AC = parseInt(document.getElementById('card-AC').value)||10;
			newCard.hpCurrent = parseInt(document.getElementById('card-hp-current').value)||1;
			newCard.hpMax = parseInt(document.getElementById('card-hp-max').value)||1;
			newCard.attributes = {};
			['STR','DEX','CON','INT','WIS','CHA'].forEach(k=>{ newCard.attributes[k] = parseInt(document.getElementById('card-'+k).value)||10; });
			newCard.initiative = 0; newCard.speed = base.speed || 30; newCard.hitDice = base.hitDice || '1d8'; newCard.proficiency = base.proficiency || 2; newCard.skills = base.skills || [];
			newCard.equipment = base.equipment || [];
			this.charData = newCard; this.saveCharData(); this.removeCardEditForm(); this.showTabContent(0); this.showTemporaryMessage('Zaktualizowano kartę');
		});
		document.getElementById('card-cancel').addEventListener('click', ()=>{ this.removeCardEditForm(); });
	}

	removeCardEditForm(){ const f = document.getElementById('card-edit-form'); if (f) f.remove(); }



	newCard(){
		this.charData = {
			name: 'Nowy Bohater', classLevel: 'Druid 1', background: '', player: '', race: '', alignment: '', xp: 0,
			AC: 10, initiative: 0, speed: 30, hpCurrent: 1, hpMax: 1, hitDice: '1d8',
			attributes: { STR:10, DEX:10, CON:10, INT:10, WIS:10, CHA:10 },
			proficiency: 2,
			skills: [],
			equipment: []
		};
		this.saveCharData();
	}

	showTemporaryMessage(text, ttl=1400){
		const msgId = 'tmpmsg';
		let el = document.getElementById(msgId);
		if (!el){ el = document.createElement('div'); el.id = msgId; document.body.appendChild(el); }
		el.style.position = 'fixed'; el.style.right = '12px'; el.style.top = '12px'; el.style.background='#222'; el.style.color='#fff'; el.style.padding='8px'; el.style.border='1px solid #444'; el.style.zIndex=9999;
		el.textContent = text;
		setTimeout(()=>{ if (el) el.remove(); }, ttl);
	}

}
