// gra.js — prosty manager paneli i funkcja rzutu kośćmi
document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.toolbar .tab');
    const panels = document.querySelectorAll('.panel');

    function showPanel(id) {
        panels.forEach(p => p.classList.toggle('active', p.id === id));
        tabs.forEach(t => t.classList.toggle('active', t.dataset.panel === id));
        // zapisz ostatni widok
        try { localStorage.setItem('ttrpg_last_panel', id); } catch (e) {}
    }

    tabs.forEach(t => {
        t.addEventListener('click', function () {
            showPanel(this.dataset.panel);
        });
    });

    // pokaż ostatnio otwarty panel lub domyślny
    const last = localStorage.getItem('ttrpg_last_panel') || 'charSheet';
    showPanel(last);

    // Rzuty kośćmi
    const rollBtn = document.getElementById('rollBtn');
    const diceType = document.getElementById('diceType');
    const diceCount = document.getElementById('diceCount');
    const diceResult = document.getElementById('diceResult');

    function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

    if (rollBtn) {
        rollBtn.addEventListener('click', function () {
            const sides = parseInt(diceType.value, 10) || 6;
            const count = Math.max(1, parseInt(diceCount.value, 10) || 1);
            const rolls = [];
            for (let i = 0; i < count; i++) rolls.push(rollDie(sides));
            // apply selected stat modifier and flat modifier
            const diceModSelect = document.getElementById('diceModSelect');
            const diceFlatMod = document.getElementById('diceFlatMod');
            let modValue = 0;
            let modLabel = '';
            if (diceModSelect && diceModSelect.value){
                const statEl = document.getElementById(diceModSelect.value);
                const statVal = statEl ? (parseInt(statEl.value,10)||0) : 0;
                modValue += calcMod(statVal);
                modLabel = diceModSelect.value;
            }
            if (diceFlatMod){ modValue += (parseInt(diceFlatMod.value,10) || 0); }
            const sumRolls = rolls.reduce((a,b)=>a+b,0);
            const total = sumRolls + modValue;
            diceResult.textContent = 'Wynik: ' + rolls.join(', ') + '  (suma: ' + sumRolls + (modValue?(' + ' + modValue + ' = ' + total):'') + ')' + (modLabel?(' ['+modLabel+']'):'');
        });
    }

    // Wczytaj aktualną sesję (jeśli istnieje) i podstaw nazwę postaci
    try {
        const sessRaw = localStorage.getItem('ttrpg_current');
        if (sessRaw) {
            const sess = JSON.parse(sessRaw);
            const nameEl = document.getElementById('charName');
            if (nameEl) nameEl.textContent = sess.character || '-';
            // if logged in as GM, hide character tabs
            if (sess.role === 'gm'){
                document.querySelectorAll('.toolbar .tab').forEach(t=>{
                    if (t.dataset.panel === 'charSheet' || t.dataset.panel === 'stats') t.style.display = 'none';
                });
                // ensure a GM-friendly panel is shown
                showPanel('library');
            }
        }
    } catch (e) { console.warn('Nie udało się wczytać sesji', e); }

    // --- Character sheet load/save ---
    const saveBtn = document.getElementById('saveCharBtn');
    const loadBtn = document.getElementById('loadCharBtn');

    function getCharsStorage() {
        try { return JSON.parse(localStorage.getItem('ttrpg_chars') || '{}'); } catch (e) { return {}; }
    }
    function saveCharsStorage(obj) { localStorage.setItem('ttrpg_chars', JSON.stringify(obj)); }

    function getCurrentSession() {
        try { return JSON.parse(localStorage.getItem('ttrpg_current') || 'null'); } catch (e) { return null; }
    }

    function calcMod(stat){
        const v = parseInt(stat,10) || 0;
        return Math.floor((v - 10) / 2);
    }

    function formatMod(n){
        return (n>=0?'+':'')+n;
    }

    function loadCharacterToForm() {
        const sess = getCurrentSession();
        if (!sess) return;
        const user = sess.user, char = sess.character;
        const chars = getCharsStorage();
        const data = (chars[user] && chars[user][char]) || null;
        if (!data) return;
        // Ensure sensible defaults: attributes default to 10, health defaults to 10/10
        ['str','dex','con','int','wis','cha'].forEach(k=>{ if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = 10; });
        if (data.health_current === undefined || data.health_current === null || data.health_current === '') data.health_current = 10;
        if (data.health_max === undefined || data.health_max === null || data.health_max === '') data.health_max = 10;
        // populate editable fields (stats panel inputs are prefixed with edit_)
        ['edit_health_current','edit_health_max','kp','initiative','speed','str','dex','con','int','wis','cha','experience'].forEach(id=>{
            const el = document.getElementById(id);
            if(el) {
                // when reading edit_ inputs, map to data keys without prefix
                if (id.startsWith('edit_')) {
                    const key = id.replace('edit_','');
                    el.value = data[key] ?? '';
                } else {
                    el.value = data[id] ?? '';
                }
            }
        });

        // meta: name/class/race/level
        if (data.char_name) document.getElementById('charName').textContent = data.char_name;
        if (data.class) document.getElementById('displayClass').textContent = 'Klasa: ' + (data.class || '-');
        if (data.race) document.getElementById('displayRace').textContent = 'Rasa: ' + (data.race || '-');
        if (data.level) document.getElementById('displayLevel').textContent = 'Poziom: ' + (data.level || '-');
        if (document.getElementById('displayExperience')) document.getElementById('displayExperience').textContent = 'XP: ' + (data.experience || '-');

        // update charSheet stat displays and modifiers
        [['str','Siła'],['dex','Zręczność'],['con','Kondycja'],['int','Inteligencja'],['wis','Mądrość'],['cha','Charyzma']].forEach(([id,label])=>{
            const val = data[id] ?? '';
            const disp = document.getElementById('disp_' + id);
            const modEl = document.getElementById('mod_' + id);
            if (disp) disp.textContent = val === '' ? '-' : val;
            if (modEl) modEl.textContent = '(' + formatMod(calcMod(val)) + ')';
        });

        // health/KP/initiative/speed displays (display spans)
        if (document.getElementById('health_current')) document.getElementById('health_current').textContent = (data.health_current !== undefined && data.health_current !== null) ? data.health_current : '-';
        if (document.getElementById('health_max')) document.getElementById('health_max').textContent = (data.health_max !== undefined && data.health_max !== null) ? data.health_max : '-';
        if (document.getElementById('kp_display')) document.getElementById('kp_display').textContent = data.kp || '-';
        if (document.getElementById('initiative_display')) document.getElementById('initiative_display').textContent = data.initiative || '-';
        if (document.getElementById('speed_display')) document.getElementById('speed_display').textContent = data.speed || '-';
        // weapons: editable fields (in stats panel) and display fields in charSheet
        const w1n = document.getElementById('weapon1_name'); if (w1n) w1n.value = data.weapon1_name || '';
        const w1die = document.getElementById('weapon1_die'); if (w1die) w1die.value = data.weapon1_die || '20';
        const w1count = document.getElementById('weapon1_count'); if (w1count) w1count.value = data.weapon1_count || 1;
        const w1mod = document.getElementById('weapon1_mod'); if (w1mod) w1mod.value = data.weapon1_mod || '';
        // display
        if (document.getElementById('weapon1_name_disp')) document.getElementById('weapon1_name_disp').textContent = data.weapon1_name || '-';
        if (document.getElementById('weapon1_desc_disp')) {
            let desc = `${data.weapon1_count||1}x d${data.weapon1_die||20}`;
            if (data.weapon1_mod) {
                const statVal = parseInt(data[data.weapon1_mod]||0,10) || 0;
                desc += ` + ${data.weapon1_mod}(${formatMod(calcMod(statVal))})`;
            }
            document.getElementById('weapon1_desc_disp').textContent = desc;
        }

        const w2n = document.getElementById('weapon2_name'); if (w2n) w2n.value = data.weapon2_name || '';
        const w2die = document.getElementById('weapon2_die'); if (w2die) w2die.value = data.weapon2_die || '20';
        const w2count = document.getElementById('weapon2_count'); if (w2count) w2count.value = data.weapon2_count || 1;
        const w2mod = document.getElementById('weapon2_mod'); if (w2mod) w2mod.value = data.weapon2_mod || '';
        if (document.getElementById('weapon2_name_disp')) document.getElementById('weapon2_name_disp').textContent = data.weapon2_name || '-';
        if (document.getElementById('weapon2_desc_disp')) {
            let desc2 = `${data.weapon2_count||1}x d${data.weapon2_die||20}`;
            if (data.weapon2_mod) {
                const statVal2 = parseInt(data[data.weapon2_mod]||0,10) || 0;
                desc2 += ` + ${data.weapon2_mod}(${formatMod(calcMod(statVal2))})`;
            }
            document.getElementById('weapon2_desc_disp').textContent = desc2;
        }

        // render skills in stats panel and in charSheet display
        const skills = data.skills || [];
        renderSkills(skills);
        // inventory
        renderInventory(data.inventory || []);
        const skillsDisplay = document.getElementById('skillsDisplay');
        if (skillsDisplay) {
            if (!skills.length) skillsDisplay.textContent = 'Brak';
            else skillsDisplay.innerHTML = skills.map(s=>{
                const modInfo = s.mod ? ` + ${s.mod}(${formatMod(calcMod(parseInt(data[s.mod]||0,10)||0))})` : '';
                const dmg = s.damage ? ` [${s.damage}]` : '';
                return `<div><strong>${escapeHtml(s.name)}</strong>${dmg}${modInfo}<div class="skill-desc">${escapeHtml(s.desc||'')}</div></div>`;
            }).join('');
        }
    }

    function escapeHtml(str){
        return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // Skills UI: render list of skill objects {name,desc,damage,mod}
    function renderSkills(skills){
        const container = document.getElementById('skillsContainer');
        if (!container) return;
        container.innerHTML = '';
        (skills||[]).forEach((s, idx)=>{
            const el = createSkillElement(s, idx);
            container.appendChild(el);
        });
        // ensure mod selects are populated
        populateModifierSelects();
    }

    function createSkillElement(s, idx){
        const wrap = document.createElement('div'); wrap.className = 'skill-entry';
        const col1 = document.createElement('div'); col1.className='col';
        const col2 = document.createElement('div'); col2.className='col';
        const nameIn = document.createElement('input'); nameIn.type='text'; nameIn.placeholder='Nazwa'; nameIn.value = s.name || '';
        const descIn = document.createElement('textarea'); descIn.rows=2; descIn.placeholder='Opis'; descIn.value = s.desc || '';
        const dmgIn = document.createElement('input'); dmgIn.type='text'; dmgIn.placeholder='Obrażenia (np. 1d6)'; dmgIn.value = s.damage || '';
        const modSel = document.createElement('select'); modSel.className = 'mod-select'; modSel.value = s.mod || '';
        const removeBtn = document.createElement('button'); removeBtn.type='button'; removeBtn.className='btn btn-sm btn-outline-danger remove-skill'; removeBtn.textContent='Usuń';
        removeBtn.addEventListener('click', ()=>{ wrap.remove(); });
        col1.appendChild(nameIn); col1.appendChild(descIn);
        col2.appendChild(dmgIn); col2.appendChild(modSel);
        wrap.appendChild(col1); wrap.appendChild(col2); wrap.appendChild(removeBtn);
        return wrap;
    }

    // gather skills from DOM into array of objects
    function gatherSkillsFromDOM(){
        const container = document.getElementById('skillsContainer');
        if (!container) return [];
        const out = [];
        container.querySelectorAll('.skill-entry').forEach(entry=>{
            const inputs = entry.querySelectorAll('input, textarea, select');
            const name = (inputs[0] && inputs[0].value) || '';
            const desc = (inputs[1] && inputs[1].value) || '';
            const damage = (inputs[2] && inputs[2].value) || '';
            const mod = (inputs[3] && inputs[3].value) || '';
            if (name.trim()) out.push({name: name.trim(), desc: desc.trim(), damage: damage.trim(), mod: mod});
        });
        return out;
    }

    function saveCharacterFromForm() {
        const sess = getCurrentSession();
        if (!sess) { alert('Brak aktywnej sesji — wybierz postać w Logowanie.'); return; }
        const user = sess.user, char = sess.character;
        const chars = getCharsStorage();
        chars[user] = chars[user] || {};
        const data = {};
        // meta editable fields in stats panel
        data.char_name = (document.getElementById('edit_char_name')||{}).value || '';
        data.race = (document.getElementById('edit_char_race')||{}).value || '';
        data.class = (document.getElementById('edit_char_class')||{}).value || '';
        data.level = (document.getElementById('edit_char_level')||{}).value || '';
        ['edit_health_current','edit_health_max','kp','initiative','speed','str','dex','con','int','wis','cha','experience'].forEach(id=>{
            const el = document.getElementById(id);
            if (el) {
                if (id.startsWith('edit_')) {
                    const key = id.replace('edit_','');
                    data[key] = el.value;
                } else {
                    data[id] = el.value;
                }
            } else {
                data[id] = '';
            }
        });
        data.weapon1_name = (document.getElementById('weapon1_name')||{}).value || '';
        data.weapon1_die = (document.getElementById('weapon1_die')||{}).value || '20';
        data.weapon1_count = (document.getElementById('weapon1_count')||{}).value || 1;
        data.weapon1_mod = (document.getElementById('weapon1_mod')||{}).value || '';

        data.weapon2_name = (document.getElementById('weapon2_name')||{}).value || '';
        data.weapon2_die = (document.getElementById('weapon2_die')||{}).value || '20';
        data.weapon2_count = (document.getElementById('weapon2_count')||{}).value || 1;
        data.weapon2_mod = (document.getElementById('weapon2_mod')||{}).value || '';

        // gather skills from the dynamic skills UI
        data.skills = gatherSkillsFromDOM();
        // gather inventory
        data.inventory = gatherInventoryFromDOM();
        // ensure we store weapon config
        data.weapon1_name = (document.getElementById('weapon1_name')||{}).value || '';
        data.weapon1_die = (document.getElementById('weapon1_die')||{}).value || '20';
        data.weapon1_count = (document.getElementById('weapon1_count')||{}).value || 1;
        data.weapon1_mod = (document.getElementById('weapon1_mod')||{}).value || '';
        data.weapon2_name = (document.getElementById('weapon2_name')||{}).value || '';
        data.weapon2_die = (document.getElementById('weapon2_die')||{}).value || '20';
        data.weapon2_count = (document.getElementById('weapon2_count')||{}).value || 1;
        data.weapon2_mod = (document.getElementById('weapon2_mod')||{}).value || '';
        chars[user][char] = data;
        saveCharsStorage(chars);
        // krótka informacja (znacznik czasu)
        try { localStorage.setItem('ttrpg_current_char_saved', Date.now().toString()); } catch(e){}
        // odśwież widok karty
        loadCharacterToForm();
    }

    if (loadBtn) loadBtn.addEventListener('click', loadCharacterToForm);
    if (saveBtn) saveBtn.addEventListener('click', saveCharacterFromForm);

    // populate modifier selects based on stat names
    function populateModifierSelects() {
        const statNames = [ ['str','Siła'], ['dex','Zręczność'], ['con','Kondycja'], ['int','Inteligencja'], ['wis','Mądrość'], ['cha','Charyzma'] ];
        const selects = document.querySelectorAll('.mod-select');
        selects.forEach(sel => {
            const curr = sel.value || '';
            sel.innerHTML = '';
            const empty = document.createElement('option'); empty.value = ''; empty.textContent = '-- modyfikator --'; sel.appendChild(empty);
            statNames.forEach(([id,label])=>{
                const opt = document.createElement('option'); opt.value = id; opt.textContent = label; sel.appendChild(opt);
            });
            if (curr) sel.value = curr;
        });
    }

    // roll weapon damage for attack index 1 or 2 (uses D&D-like modifier)
    function rollWeapon(index) {
        const die = document.getElementById(`weapon${index}_die`);
        const count = document.getElementById(`weapon${index}_count`);
        const mod = document.getElementById(`weapon${index}_mod`);
        const name = document.getElementById(`weapon${index}_name`);
        if (!die || !count || !mod) return;
        const sides = parseInt(die.value,10) || 6;
        const cnt = Math.max(1, parseInt(count.value,10) || 1);
        const rolls = [];
        for (let i=0;i<cnt;i++) rolls.push(rollDie(sides));
        // modifier value: compute D&D-like modifier from chosen stat
        let modValue = 0;
        let modName = '';
        if (mod.value) {
            const statEl = document.getElementById(mod.value);
            const statVal = statEl ? (parseInt(statEl.value,10)||0) : 0;
            modValue = calcMod(statVal);
            modName = mod.value;
        }
        const sum = rolls.reduce((a,b)=>a+b,0) + modValue;
        // show result next to button
        const btn = document.querySelector(`button[data-roll="${index}"]`);
        let out = btn.nextElementSibling;
        if (!out || !out.classList || !out.classList.contains('roll-result')) {
            out = document.createElement('span'); out.className = 'roll-result'; out.style.marginLeft='8px';
            btn.parentNode.insertBefore(out, btn.nextSibling);
        }
        out.textContent = `${name ? name.value : 'Atak'}: [${rolls.join(', ')}] + ${modValue} = ${sum}` + (modName ? ` (${modName})` : '');
    }

    // wire roll buttons
    document.querySelectorAll('button[data-roll]').forEach(b=>{
        b.addEventListener('click', function(){ rollWeapon(this.getAttribute('data-roll')); });
    });

    // populate modifier selects on load
    populateModifierSelects();

    // wire add-skill button
    const addSkillBtn = document.getElementById('addSkillBtn');
    if (addSkillBtn) addSkillBtn.addEventListener('click', function(){
        const container = document.getElementById('skillsContainer');
        if (!container) return;
        const el = createSkillElement({name:'',desc:'',damage:'',mod:''}, Date.now());
        container.appendChild(el);
        populateModifierSelects();
    });

    // auto-load on panel show if charSheet active
    if (last === 'charSheet') loadCharacterToForm();

        // --- Inventory: dynamic list ---
        function renderInventory(items){
            const container = document.getElementById('inventoryContainer');
            if (!container) return;
            container.innerHTML = '';
            (items||[]).forEach((it, idx)=>{
                const row = document.createElement('div'); row.className='inventory-entry';
                const name = document.createElement('input'); name.type='text'; name.value = it.name || ''; name.placeholder='Nazwa';
                const desc = document.createElement('input'); desc.type='text'; desc.value = it.desc || ''; desc.placeholder='Opis';
                const qty = document.createElement('input'); qty.type='number'; qty.value = it.qty || 1; qty.style.width='80px';
                const remove = document.createElement('button'); remove.type='button'; remove.className='btn btn-sm btn-outline-danger remove-item'; remove.textContent='Usuń';
                remove.addEventListener('click', ()=>{ row.remove(); });
                row.appendChild(name); row.appendChild(desc); row.appendChild(qty); row.appendChild(remove);
                container.appendChild(row);
            });
        }

        function gatherInventoryFromDOM(){
            const container = document.getElementById('inventoryContainer');
            if (!container) return [];
            const out = [];
            container.querySelectorAll('.inventory-entry').forEach(row=>{
                const inputs = row.querySelectorAll('input');
                const name = (inputs[0] && inputs[0].value) || '';
                const desc = (inputs[1] && inputs[1].value) || '';
                const qty = parseInt((inputs[2] && inputs[2].value) || 1,10) || 1;
                if (name.trim()) out.push({name:name.trim(), desc:desc.trim(), qty:qty});
            });
            return out;
        }

        const addInventoryBtn = document.getElementById('addInventoryBtn');
        if (addInventoryBtn) addInventoryBtn.addEventListener('click', ()=>{
            const container = document.getElementById('inventoryContainer');
            if (!container) return;
            const row = document.createElement('div'); row.className='inventory-entry';
            const name = document.createElement('input'); name.type='text'; name.placeholder='Nazwa';
            const desc = document.createElement('input'); desc.type='text'; desc.placeholder='Opis';
            const qty = document.createElement('input'); qty.type='number'; qty.value=1; qty.style.width='80px';
            const remove = document.createElement('button'); remove.type='button'; remove.className='btn btn-sm btn-outline-danger remove-item'; remove.textContent='Usuń';
            remove.addEventListener('click', ()=>{ row.remove(); });
            row.appendChild(name); row.appendChild(desc); row.appendChild(qty); row.appendChild(remove);
            container.appendChild(row);
        });

        // --- Library: upload and manage backgrounds ---
        function getLibrary(){ try { return JSON.parse(localStorage.getItem('ttrpg_library')||'[]'); } catch(e){return [];} }
        function saveLibrary(arr){ localStorage.setItem('ttrpg_library', JSON.stringify(arr)); }

        function handleLibUpload(file, folderId){
            const reader = new FileReader();
            reader.onload = function(e){
                const data = e.target.result;
                const lib = getLibrary();
                const id = 'lib_' + Date.now();
                const type = file.type.match('pdf') ? 'pdf' : (file.type.startsWith('image/') ? 'image' : 'other');
                lib.push({id:id, name:file.name, type:type, data:data, folder: folderId || ''});
                saveLibrary(lib);
                renderLibrary();
            };
            if (file.type === 'application/pdf') reader.readAsDataURL(file);
            else if (file.type.startsWith('image/')) reader.readAsDataURL(file);
            else alert('Nieobsługiwany typ pliku');
        }

        function renderLibrary(){
            const list = document.getElementById('libraryList');
            if (!list) return;
            const lib = getLibrary();
            const folders = (function(){ try { return JSON.parse(localStorage.getItem('ttrpg_lib_folders')||'[]'); } catch(e){ return []; } })();
            list.innerHTML = '';
            // group by folder
            const byFolder = {};
            lib.forEach(item=>{ const f = item.folder || ''; byFolder[f] = byFolder[f] || []; byFolder[f].push(item); });
            const renderGroup = (title, items)=>{
                const h = document.createElement('div'); h.className='library-group'; const head = document.createElement('h5'); head.textContent = title; h.appendChild(head);
                items.forEach(item=>{
                    const el = document.createElement('div'); el.className='library-item';
                    if (item.type === 'image') { const img = document.createElement('img'); img.src = item.data; img.className='thumb'; el.appendChild(img); }
                    else if (item.type === 'pdf') { const span = document.createElement('div'); span.className='thumb'; span.textContent='PDF'; el.appendChild(span); }
                    const meta = document.createElement('div'); meta.className='meta'; meta.innerHTML = `<strong>${item.name}</strong><div style="font-size:12px;color:#666">${item.type}${item.folder?(' — '+(folders.find(f=>f.id===item.folder)||{name:'?'}).name):''}</div>`;
                    const btnSetBattle = document.createElement('button'); btnSetBattle.type='button'; btnSetBattle.className='btn btn-sm btn-outline-primary'; btnSetBattle.textContent='Ustaw jako tło (bitwa)'; btnSetBattle.addEventListener('click', ()=> setBattleBackground(item.id));
                    const btnSetWorld = document.createElement('button'); btnSetWorld.type='button'; btnSetWorld.className='btn btn-sm btn-outline-secondary'; btnSetWorld.textContent='Ustaw jako tło (świat)'; btnSetWorld.addEventListener('click', ()=> setWorldBackground(item.id));
                    const btnDel = document.createElement('button'); btnDel.type='button'; btnDel.className='btn btn-sm btn-outline-danger'; btnDel.textContent='Usuń'; btnDel.addEventListener('click', ()=>{ const arr = getLibrary().filter(i=>i.id!==item.id); saveLibrary(arr); renderLibrary(); });
                    el.appendChild(meta); el.appendChild(btnSetBattle); el.appendChild(btnSetWorld); el.appendChild(btnDel);
                    h.appendChild(el);
                });
                list.appendChild(h);
            };
            if (byFolder[''] && byFolder[''].length) renderGroup('Bez folderu', byFolder['']);
            folders.forEach(f=>{ if (byFolder[f.id] && byFolder[f.id].length) renderGroup(f.name, byFolder[f.id]); });
        }

        // Library folders: simple list stored in localStorage under 'ttrpg_lib_folders'
        function getLibFolders(){ try { return JSON.parse(localStorage.getItem('ttrpg_lib_folders')||'[]'); } catch(e){ return []; } }
        function saveLibFolders(arr){ localStorage.setItem('ttrpg_lib_folders', JSON.stringify(arr)); }
        function renderLibFolderSelect(){ const sel = document.getElementById('libFolderSelect'); if (!sel) return; const folders = getLibFolders(); sel.innerHTML = '<option value="">Bez folderu</option>'; folders.forEach(f=>{ const o = document.createElement('option'); o.value = f.id; o.textContent = f.name; sel.appendChild(o); }); }
        const createLibFolderBtn = document.getElementById('createLibFolderBtn');
        if (createLibFolderBtn) createLibFolderBtn.addEventListener('click', ()=>{ const name = prompt('Nazwa folderu:','Nowy folder'); if (!name) return; const folders = getLibFolders(); const id = 'fld_' + Date.now(); folders.push({id:id, name: name}); saveLibFolders(folders); renderLibFolderSelect(); });

        const libUpload = document.getElementById('libUpload');
        if (libUpload) libUpload.addEventListener('change', function(){ if (this.files && this.files[0]){ const folder = (document.getElementById('libFolderSelect')||{}).value || ''; handleLibUpload(this.files[0], folder); } this.value=''; });
        renderLibFolderSelect();
        renderLibrary();

        function setBattleBackground(id){
            const lib = getLibrary();
            const item = lib.find(i=>i.id===id);
            if (!item) return;
            const area = document.getElementById('battleMapArea');
            const embed = document.getElementById('mapEmbed');
            if (!area) return;
            // clear embed
            embed.innerHTML = '';
            area.style.backgroundImage = '';
            if (item.type === 'image'){
                area.style.backgroundImage = `url(${item.data})`;
                area.style.backgroundSize = 'cover';
                area.style.backgroundPosition = 'center';
            } else if (item.type === 'pdf'){
                const obj = document.createElement('embed'); obj.src = item.data; obj.type = 'application/pdf'; obj.style.width='100%'; obj.style.height='100%'; embed.appendChild(obj);
            }
        }

        function setWorldBackground(id){
            const lib = getLibrary();
            const item = lib.find(i=>i.id===id);
            if (!item) return;
            const area = document.getElementById('worldMapArea');
            const embed = document.getElementById('worldMapEmbed');
            if (!area) return;
            embed.innerHTML = '';
            area.style.backgroundImage = '';
            if (item.type === 'image'){
                area.style.backgroundImage = `url(${item.data})`;
                area.style.backgroundSize = 'cover';
                area.style.backgroundPosition = 'center';
            } else if (item.type === 'pdf'){
                const obj = document.createElement('embed'); obj.src = item.data; obj.type = 'application/pdf'; obj.style.width='100%'; obj.style.height='100%'; embed.appendChild(obj);
            }
        }

        // --- Tokens on battle map ---
        function getTokens(){ try { return JSON.parse(localStorage.getItem('ttrpg_tokens')||'[]'); } catch(e){return [];} }
        function saveTokens(arr){ localStorage.setItem('ttrpg_tokens', JSON.stringify(arr)); }

        function renderTokens(){
            const layer = document.getElementById('tokenLayer'); if (!layer) return; layer.innerHTML='';
            const tokens = getTokens();
            tokens.forEach(t=>{
                const el = document.createElement('div'); el.className='token'; el.dataset.id = t.id; el.style.left = (t.x||50) + 'px'; el.style.top = (t.y||50) + 'px';
                el.style.background = t.color || '#fff';
                el.style.cursor = 'grab';
                // image overlay if present
                if (t.img) {
                    const ol = document.createElement('div'); ol.className = 'img-overlay'; ol.style.backgroundImage = `url(${t.img})`;
                    el.appendChild(ol);
                }
                // display label under token
                const lab = document.createElement('div'); lab.className='label'; lab.textContent = t.label || '';
                el.appendChild(lab);

                // controls: edit / delete
                const controls = document.createElement('div'); controls.className = 'controls';
                const btnEdit = document.createElement('button'); btnEdit.type='button'; btnEdit.textContent='✎'; btnEdit.title='Edytuj token'; btnEdit.dataset.id = t.id;
                const btnDel = document.createElement('button'); btnDel.type='button'; btnDel.textContent='Usuń'; btnDel.title='Usuń token'; btnDel.dataset.id = t.id;
                controls.appendChild(btnEdit); controls.appendChild(btnDel);
                el.appendChild(controls);

                layer.appendChild(el);
                makeTokenDraggable(el, t.id, 'battle');

                // edit handler (use data-id for robustness)
                btnEdit.addEventListener('click', (ev)=>{
                    ev.stopPropagation(); ev.preventDefault();
                    const id = ev.currentTarget.dataset.id;
                    const arr = getTokens(); const tok = arr.find(x=>x.id===id);
                    if (!tok) return;
                    editingTokenId = id;
                    console.debug('set editingTokenId (battle)', id);
                    try{ showToast('Edycja tokena: ' + id, 900); }catch(e){}
                    tokenNameInput.value = tok.label || '';
                    tokenImageData.value = tok.img || '';
                    tokenImagePreview.style.backgroundImage = tok.img ? `url(${tok.img})` : '';
                    openTokenModal('battle', tok.label || '');
                });

                // per-token delete button (battle) — immediate deletion without confirmation
                btnDel.addEventListener('click', (ev)=>{
                    ev.stopPropagation(); ev.preventDefault();
                    const id = ev.currentTarget && ev.currentTarget.dataset ? ev.currentTarget.dataset.id : null;
                    if (!id) { console.warn('battle: delete called but no id found on the button'); return; }
                    const before = getTokens();
                    const tokensArr = before.filter(tt=>tt.id!==id);
                    saveTokens(tokensArr);
                    renderTokens();
                });
            });
        }

        function makeTokenDraggable(el, id, scope){
            // choose storage based on scope
            const getter = (scope === 'world') ? getWorldTokens : getTokens;
            const saver = (scope === 'world') ? saveWorldTokens : saveTokens;
            let dragging = false;
            let startX = 0, startY = 0, origX = 0, origY = 0, pointerId = null;

            function onPointerMove(e){
                if (!dragging) return;
                // debug log for pointermove
                console.log('token move', {id: el.dataset.id, clientX: e.clientX, clientY: e.clientY, dragging});
                const dx = e.clientX - startX; const dy = e.clientY - startY;
                el.style.left = (origX + dx) + 'px'; el.style.top = (origX + dx ? (origY + dy) + 'px' : (origY + dy) + 'px');
            }

            function onPointerUp(e){
                if (!dragging) return;
                dragging = false;
                try { if (pointerId !== null) el.releasePointerCapture(pointerId); } catch (err) {}
                el.style.cursor = 'grab';
                // save new pos
                const nid = el.dataset.id; const x = parseInt(el.style.left||0,10); const y = parseInt(el.style.top||0,10);
                const tokens = getter(); const t = tokens.find(tt=>tt.id===nid);
                if (t){ t.x = x; t.y = y; saver(tokens); }
                // cleanup listeners
                el.removeEventListener('pointermove', onPointerMove);
                el.removeEventListener('pointerup', onPointerUp);
                el.removeEventListener('pointercancel', onPointerUp);
                pointerId = null;
            }

            el.addEventListener('pointerdown', (e)=>{
                // if the pointerdown originated from token controls (edit/delete), ignore to allow buttons to handle it
                try {
                    if (e.target && e.target.closest && e.target.closest('.controls')) {
                        return;
                    }
                } catch (err) {}
                // permission check: only owner or GM may drag
                const sess = getCurrentSession();
                const tokens = getter();
                const tkn = tokens.find(tt=>tt.id===el.dataset.id);
                const owner = tkn ? tkn.owner : '';
                const allowed = sess && (sess.role === 'gm' || sess.user === owner);
                console.log('pointerdown', {id: el.dataset.id, owner, sessionUser: sess?sess.user:null, sessionRole: sess?sess.role:null, allowed});
                if (!allowed) { el.style.cursor = 'not-allowed';
                    // flash red border to indicate denied
                    const prev = el.style.boxShadow;
                    el.style.boxShadow = '0 0 0 3px rgba(255,0,0,0.5)';
                    setTimeout(()=>{ el.style.boxShadow = prev; }, 600);
                    return; }
                // start dragging
                pointerId = e.pointerId;
                try { el.setPointerCapture(pointerId); } catch (err) {}
                dragging = true; startX = e.clientX; startY = e.clientY;
                origX = parseInt(el.style.left||0,10) || 0; origY = parseInt(el.style.top||0,10) || 0;
                el.style.cursor = 'grabbing';
                // attach move/up handlers to element for reliability
                console.log('start drag', {id: el.dataset.id, startX, startY, origX, origY});
                el.addEventListener('pointermove', onPointerMove);
                el.addEventListener('pointerup', onPointerUp);
                el.addEventListener('pointercancel', onPointerUp);
            });
        }

        // Token modal workflow (uses Bootstrap modal when available)
        const tokenModalEl = document.getElementById('tokenModal');
        const tokenForm = document.getElementById('tokenForm');
        const tokenNameInput = document.getElementById('tokenName');
        const tokenImageFileInput = document.getElementById('tokenImageFile');
        const tokenImagePreview = document.getElementById('tokenImagePreview');
        const tokenImageData = document.getElementById('tokenImageData');
        let tokenModalScope = 'battle';
        let editingTokenId = null;

        function openTokenModal(scope, defaultLabel){
            tokenModalScope = scope || 'battle';
            tokenNameInput.value = defaultLabel || '';
            tokenImageFileInput.value = '';
            tokenImagePreview.style.backgroundImage = '';
            tokenImageData.value = '';
            const delBtn = document.getElementById('tokenDeleteBtn');
            if (delBtn){
                if (editingTokenId) delBtn.classList.remove('d-none'); else delBtn.classList.add('d-none');
            }
            if (typeof bootstrap !== 'undefined'){
                const bs = new bootstrap.Modal(tokenModalEl);
                tokenModalEl._bsModal = bs; bs.show();
            } else { tokenModalEl.style.display = 'block'; tokenModalEl.classList.add('show'); }
        }

        // file -> dataURL preview helper
        function fileToDataURL(file, cb){ const r = new FileReader(); r.onload = (ev)=>cb(ev.target.result); r.readAsDataURL(file); }

        if (tokenImageFileInput) tokenImageFileInput.addEventListener('change', function(){ if (!this.files || !this.files[0]) return; fileToDataURL(this.files[0], (d)=>{ tokenImageData.value = d; tokenImagePreview.style.backgroundImage = `url(${d})`; }); });

        // paste image into modal
        if (tokenModalEl) tokenModalEl.addEventListener('paste', function(e){ try{ const items = (e.clipboardData||e.originalEvent.clipboardData).items; for (let i=0;i<items.length;i++){ const it = items[i]; if (it.type && it.type.indexOf('image') !== -1){ const file = it.getAsFile(); fileToDataURL(file, (d)=>{ tokenImageData.value = d; tokenImagePreview.style.backgroundImage = `url(${d})`; }); e.preventDefault(); break; } } }catch(err){}
        });

        if (tokenForm) tokenForm.addEventListener('submit', function(e){
            e.preventDefault();
            const name = tokenNameInput.value || 'Token';
            const img = tokenImageData.value || null;
            const sess = getCurrentSession(); const owner = sess ? (sess.user || '') : '';
            if (editingTokenId){
                // update existing
                if (editingTokenId.startsWith('tok_')){
                    const arr = getTokens(); const idx = arr.findIndex(tt=>tt.id===editingTokenId);
                    if (idx>=0){ arr[idx].label = name; arr[idx].img = img || null; saveTokens(arr); }
                    renderTokens();
                } else if (editingTokenId.startsWith('wtok_')){
                    const arr = getWorldTokens(); const idx = arr.findIndex(tt=>tt.id===editingTokenId);
                    if (idx>=0){ arr[idx].label = name; arr[idx].img = img || null; saveWorldTokens(arr); }
                    renderWorldTokens();
                }
                editingTokenId = null;
            } else {
                if (tokenModalScope === 'battle'){
                    const tokens = getTokens(); tokens.push({id:'tok_'+Date.now(), label: name, owner: owner, x:60, y:60, color:'#ffd54f', img: img}); saveTokens(tokens); renderTokens();
                } else {
                    const tokens = getWorldTokens(); tokens.push({id:'wtok_'+Date.now(), label: name, owner: owner, x:60, y:60, color:'#b9f6ca', img: img}); saveWorldTokens(tokens); renderWorldTokens();
                }
            }
            if (tokenModalEl && tokenModalEl._bsModal) tokenModalEl._bsModal.hide(); else if (tokenModalEl){ tokenModalEl.style.display='none'; tokenModalEl.classList.remove('show'); }
        });

        // helper: show a small toast message on screen for quick feedback
        function showToast(msg, timeout=2500){
            try{
                let t = document.getElementById('debugToast');
                if (!t){ t = document.createElement('div'); t.id='debugToast'; t.style.position='fixed'; t.style.right='12px'; t.style.bottom='12px'; t.style.background='rgba(0,0,0,0.8)'; t.style.color='#fff'; t.style.padding='8px 12px'; t.style.borderRadius='6px'; t.style.zIndex=9999; document.body.appendChild(t); }
                t.textContent = msg;
                t.style.opacity = '1';
                setTimeout(()=>{ try{ t.style.opacity='0'; }catch(e){} }, timeout);
            }catch(e){ console.debug('toast failed', e); }
        }

        // DICE: parse and roll expressions like "2d6+1d8+3". Returns {total, parts: [{term, rolls, subtotal}], mod}
        function parseAndRollDiceExpression(expr){
            if (!expr || !expr.trim()) return null;
            const s = expr.replace(/\s+/g,'');
            const termRe = /([+-]?\d*d\d+)|([+-]?\d+)/gi;
            let m; const parts = []; let total = 0; let mod = 0;
            while ((m = termRe.exec(s)) !== null){
                const term = m[0];
                if (term.toLowerCase().indexOf('d') !== -1){
                    const partsD = term.split(/d/i);
                    let cnt = parseInt(partsD[0],10);
                    let sign = 1;
                    if (isNaN(cnt)) { // could be like +d6 or -d6 or d6
                        if (partsD[0] && partsD[0].startsWith('-')) sign = -1; else sign = 1;
                        cnt = 1;
                    } else {
                        if (String(partsD[0]).startsWith('-')) sign = -1;
                    }
                    const sides = parseInt(partsD[1],10);
                    const rolls = [];
                    for (let i=0;i<Math.abs(cnt);i++){ rolls.push(Math.floor(Math.random()*sides)+1); }
                    const subtotal = rolls.reduce((a,b)=>a+b,0) * sign;
                    parts.push({term, rolls, subtotal});
                    total += subtotal;
                } else {
                    // plain integer modifier
                    const v = parseInt(term,10) || 0;
                    parts.push({term, rolls:[], subtotal:v});
                    total += v; mod += v;
                }
            }
            return { total, parts, mod };
        }

        // wire the new dice expression roll button
        const rollExprBtn = document.getElementById('rollExprBtn');
        const diceExprInput = document.getElementById('diceExpr');
        const diceResultEl = document.getElementById('diceResult');
        if (rollExprBtn && diceExprInput){
            rollExprBtn.addEventListener('click', function(){
                const expr = diceExprInput.value || '';
                const out = parseAndRollDiceExpression(expr);
                if (!out){ diceResultEl.textContent = 'Nieprawidłowe wyrażenie.'; return; }
                // build readable output
                const partsStr = out.parts.map(p=>{
                    if (p.rolls && p.rolls.length) return `${p.term}: [${p.rolls.join(', ')}] = ${p.subtotal}`;
                    return `${p.term}`;
                }).join(' | ');
                diceResultEl.textContent = `Wynik: ${out.total} (${partsStr})`;
            });
        }

        // also add some extra logging when editing tokens to help diagnose deletion issues
        const originalOpenEditLog = function(id){ console.debug('editingToken set to', id); showToast('Edycja tokena: ' + id, 1200); };
        // patch points where editingTokenId is set earlier (we already set editingTokenId in handlers) -- add small log via monkey-patch below
        const _origBtnEditHandlers = [];

        // modal delete button (remove the token being edited)
        const tokenDeleteBtn = document.getElementById('tokenDeleteBtn');
        if (tokenDeleteBtn){
            tokenDeleteBtn.addEventListener('click', function(e){
                e.preventDefault();
                if (!editingTokenId) return;
                if (editingTokenId.startsWith('tok_')){
                    const arr = getTokens().filter(t=>t.id!==editingTokenId);
                    saveTokens(arr); renderTokens();
                } else if (editingTokenId.startsWith('wtok_')){
                    const arr = getWorldTokens().filter(t=>t.id!==editingTokenId);
                    saveWorldTokens(arr); renderWorldTokens();
                }
                editingTokenId = null;
                if (tokenModalEl && tokenModalEl._bsModal) tokenModalEl._bsModal.hide(); else if (tokenModalEl){ tokenModalEl.style.display='none'; tokenModalEl.classList.remove('show'); }
            });
        }

        const addTokenBtn = document.getElementById('addTokenBtn');
        if (addTokenBtn) addTokenBtn.addEventListener('click', ()=>{ const sess = getCurrentSession(); const defaultLabel = sess && sess.character ? sess.character : ''; editingTokenId = null; openTokenModal('battle', defaultLabel); });

        const clearTokensBtn = document.getElementById('clearTokensBtn');
        if (clearTokensBtn) clearTokensBtn.addEventListener('click', ()=>{ if (!confirm('Usunąć wszystkie tokeny?')) return; saveTokens([]); renderTokens(); });

        // init battle map grid toggle
        const gridToggle = document.getElementById('gridToggle');
        const gridSizeInput = document.getElementById('gridSize');
        function updateGrid(){ const area = document.getElementById('battleMapArea'); if (!area) return; const size = parseInt(gridSizeInput.value,10) || 48; if (gridToggle.checked) { area.classList.add('grid-on'); area.style.backgroundSize = size + 'px ' + size + 'px'; } else { area.classList.remove('grid-on'); area.style.backgroundSize = ''; } }
        if (gridToggle && gridSizeInput){ gridToggle.addEventListener('change', updateGrid); gridSizeInput.addEventListener('change', updateGrid); updateGrid(); }

        // render existing tokens on load
        renderTokens();

        // --- World map tokens (separate storage) ---
        function getWorldTokens(){ try { return JSON.parse(localStorage.getItem('ttrpg_world_tokens')||'[]'); } catch(e){return [];} }
        function saveWorldTokens(arr){ localStorage.setItem('ttrpg_world_tokens', JSON.stringify(arr)); }

        function renderWorldTokens(){
            const layer = document.getElementById('worldTokenLayer'); if (!layer) return; layer.innerHTML='';
            const tokens = getWorldTokens();
            tokens.forEach(t=>{
                const el = document.createElement('div'); el.className='token'; el.dataset.id = t.id; el.style.left = (t.x||50) + 'px'; el.style.top = (t.y||50) + 'px';
                el.style.background = t.color || '#fff'; el.style.cursor = 'grab';
                if (t.img) { const ol = document.createElement('div'); ol.className='img-overlay'; ol.style.backgroundImage = `url(${t.img})`; el.appendChild(ol); }
                const lab = document.createElement('div'); lab.className='label'; lab.textContent = t.label || ''; el.appendChild(lab);
                const controls = document.createElement('div'); controls.className = 'controls';
                const btnEdit = document.createElement('button'); btnEdit.type='button'; btnEdit.textContent='✎'; btnEdit.title='Edytuj token'; btnEdit.dataset.id = t.id;
                const btnDel = document.createElement('button'); btnDel.type='button'; btnDel.textContent='Usuń'; btnDel.title='Usuń token'; btnDel.dataset.id = t.id;
                controls.appendChild(btnEdit); controls.appendChild(btnDel); el.appendChild(controls);
                layer.appendChild(el);
                makeTokenDraggable(el, t.id, 'world');

                btnEdit.addEventListener('click', (ev)=>{
                    ev.stopPropagation(); ev.preventDefault();
                    const id = ev.currentTarget && ev.currentTarget.dataset ? ev.currentTarget.dataset.id : null;
                    if (!id) return;
                    const arr = getWorldTokens(); const tok = arr.find(x=>x.id===id); if (!tok) return;
                    editingTokenId = id;
                    console.debug('set editingTokenId (world)', id);
                    try{ showToast('Edycja tokena: ' + id, 900); }catch(e){}
                    tokenNameInput.value = tok.label || '';
                    tokenImageData.value = tok.img || '';
                    tokenImagePreview.style.backgroundImage = tok.img ? `url(${tok.img})` : '';
                    openTokenModal('world', tok.label || '');
                });
                // per-token delete button (world) — immediate deletion without confirmation
                btnDel.addEventListener('click', (ev)=>{
                    ev.stopPropagation(); ev.preventDefault();
                    const id = ev.currentTarget && ev.currentTarget.dataset ? ev.currentTarget.dataset.id : null;
                    if (!id) { console.warn('world: delete called but no id found on the button'); return; }
                    const before = getWorldTokens();
                    const tokensArr = before.filter(tt=>tt.id!==id);
                    saveWorldTokens(tokensArr);
                    renderWorldTokens();
                });
            });
            // finished rendering world tokens
        }

        const addWorldTokenBtn = document.getElementById('addWorldTokenBtn') || document.getElementById('addWorldTokenBtn');
        const addWorldBtn = document.getElementById('addWorldTokenBtn') || document.getElementById('addWorldTokenBtn');
        const addWorld = document.getElementById('addWorldTokenBtn');
        const addWorldBtn2 = document.getElementById('addWorldTokenBtn');
        const addWorldButton = document.getElementById('addWorldTokenBtn');
        const addWorldTokenButton = document.getElementById('addWorldTokenBtn');
        const addWorldToken = document.getElementById('addWorldTokenBtn');

        const addWorldTokenReal = document.getElementById('addWorldTokenBtn') || document.getElementById('addWorldTokenBtn');

        const addWorldTokenActual = document.getElementById('addWorldTokenBtn') || document.getElementById('addWorldTokenBtn');

        const addWorldTokenBtnRef = document.getElementById('addWorldTokenBtn');
        if (addWorldTokenBtnRef) addWorldTokenBtnRef.addEventListener('click', ()=>{
            const sess = getCurrentSession();
            const defaultLabel = sess && sess.character ? sess.character : '';
            editingTokenId = null;
            openTokenModal('world', defaultLabel);
        });

        const clearWorldTokensBtn = document.getElementById('clearWorldTokensBtn');
        if (clearWorldTokensBtn) clearWorldTokensBtn.addEventListener('click', ()=>{ if (!confirm('Usunąć wszystkie tokeny świata?')) return; saveWorldTokens([]); renderWorldTokens(); });

        renderWorldTokens();
        // ensure players have a default token and populate inventory/skills
        function ensurePlayerToken(){
            const sess = getCurrentSession(); if (!sess || sess.role==='gm') return;
            const tokens = getTokens();
            const found = tokens.find(t => t.owner === sess.user && t.label === sess.character);
            if (!found){ const id='tok_'+Date.now(); tokens.push({id:id,label:sess.character||'Token',owner:sess.user,x:60,y:60,color:'#a3d5ff'}); saveTokens(tokens); renderTokens(); }
        }
        ensurePlayerToken();

        // ensure inventory and skills are populated for current char on load
        loadCharacterToForm();
});
