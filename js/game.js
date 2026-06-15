// ?????????????????????????
class UndergroundRadioGame {
    constructor() {
        this.gameState = null;
        this.init();
    }

    init() {
        this.loadGame();
        this.setupEventListeners();
        this.renderAll();
    }

    getDefaultState() {
        return {
            day: 1,
            status: {
                power: 100,
                noise: 0,
                rumor: 0,
                fatigue: 0,
                morale: 50
            },
            thresholds: {
                power: 20,
                noise: 70,
                rumor: 70,
                fatigue: 70,
                morale: 30
            },
            resources: {
                food: 20,
                battery: 10,
                parts: 5,
                medicine: 3
            },
            survivors: this.generateSurvivors(),
            equipment: JSON.parse(JSON.stringify(GameData.equipmentList)),
            districts: JSON.parse(JSON.stringify(GameData.districts)),
            schedule: {
                morning: null,
                afternoon: null,
                evening: null
            },
            selectedBroadcast: null,
            currentQuestion: null,
            answeredQuestions: [],
            rumors: [],
            settlementHistory: [],
            todayActions: {
                broadcastDone: false,
                qaDone: 0,
                repairDone: [],
                rumorSuppressDone: []
            },
            gameOver: false
        };
    }

    generateSurvivors() {
        const survivors = [];
        const count = 4 + Math.floor(Math.random() * 3);
        const shuffledNames = [...GameData.survivorNames].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < count; i++) {
            survivors.push({
                id: 'survivor_' + i,
                name: shuffledNames[i],
                skill: GameData.survivorSkills[Math.floor(Math.random() * GameData.survivorSkills.length)],
                fatigue: Math.floor(Math.random() * 20),
                health: 80 + Math.floor(Math.random() * 20),
                task: null
            });
        }
        return survivors;
    }

    generateRumor() {
        const rumorTemplates = [
            { title: '水源污染谣言', desc: '有人说自来水厂被污染了，不能喝水。', severity: 15 },
            { title: '怪物出没传闻', desc: '传言夜间有怪物在街道游荡。', severity: 20 },
            { title: '食物短缺恐慌', desc: '据说储备物资只够维持一周了。', severity: 18 },
            { title: '政府阴谋论', desc: '有人说这一切都是政府的阴谋。', severity: 12 },
            { title: '传染病扩散', desc: '听说新的传染病正在蔓延。', severity: 22 },
            { title: '救援队骗局', desc: '传言救援队根本不存在。', severity: 15 },
            { title: '核泄漏消息', desc: '据说远处的核电站发生了泄漏。', severity: 25 },
            { title: '暴动计划', desc: '有人在策划抢夺物资的暴动。', severity: 20 }
        ];
        
        const template = rumorTemplates[Math.floor(Math.random() * rumorTemplates.length)];
        return {
            id: 'rumor_' + Date.now() + '_' + Math.random(),
            ...template,
            dayStarted: this.gameState.day
        };
    }

    saveGame() {
        localStorage.setItem('undergroundRadioSave', JSON.stringify(this.gameState));
        this.showEvent('游戏已保存', '你的游戏进度已保存到本地存储。', []);
    }

    loadGame() {
        const saved = localStorage.getItem('undergroundRadioSave');
        if (saved) {
            try {
                this.gameState = JSON.parse(saved);
                this.showEvent('读取存档', '成功读取游戏存档！', []);
            } catch (e) {
                this.gameState = this.getDefaultState();
            }
        } else {
            this.gameState = this.getDefaultState();
            this.generateDailyRumors();
        }
    }

    resetGame() {
        if (confirm('确定要重新开始吗？所有进度将会丢失。')) {
            localStorage.removeItem('undergroundRadioSave');
            this.gameState = this.getDefaultState();
            this.generateDailyRumors();
            this.renderAll();
            this.showEvent('新游戏开始', '欢迎来到地下广播站！你的任务是维持广播运营，安抚民心，管理物资和幸存者。', []);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('endDayBtn').addEventListener('click', () => this.endDay());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveGame());
        document.getElementById('loadBtn').addEventListener('click', () => { this.loadGame(); this.renderAll(); });
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());

        document.getElementById('doBroadcastBtn').addEventListener('click', () => this.doBroadcast());
        document.getElementById('doRepairBtn').addEventListener('click', () => this.doRepair());
        document.getElementById('suppressRumorBtn').addEventListener('click', () => this.suppressRumor());

        ['power', 'noise', 'rumor', 'fatigue', 'morale'].forEach(stat => {
            const slider = document.getElementById(stat + 'ThresholdSlider');
            const valSpan = document.getElementById(stat + 'ThresholdVal');
            slider.addEventListener('input', (e) => {
                this.gameState.thresholds[stat] = parseInt(e.target.value);
                valSpan.textContent = e.target.value;
                this.renderStatus();
            });
        });

        document.getElementById('modalCloseBtn').addEventListener('click', () => this.closeModal());
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        if (tabName === 'qa' && !this.gameState.currentQuestion) {
            this.generateQuestion();
        }
    }

    renderAll() {
        this.renderStatus();
        this.renderResources();
        this.renderSurvivors();
        this.renderDistrictTrust();
        this.renderSchedule();
        this.renderBroadcasts();
        this.renderEquipment();
        this.renderRumors();
        this.renderSettlements();
        this.renderThresholds();
    }

    renderStatus() {
        const { status, thresholds } = this.gameState;
        
        ['power', 'noise', 'rumor', 'fatigue', 'morale'].forEach(stat => {
            const value = Math.max(0, Math.min(100, status[stat]));
            const fill = document.getElementById(stat + 'Fill');
            const val = document.getElementById(stat + 'Value');
            const thresholdDisplay = document.getElementById(stat + 'Threshold');
            
            fill.style.width = value + '%';
            val.textContent = Math.round(value);
            
            const isWarning = (stat === 'power' || stat === 'morale') 
                ? value <= thresholds[stat] 
                : value >= thresholds[stat];
            
            fill.classList.toggle('warning', isWarning);
            thresholdDisplay.textContent = thresholds[stat];
            
            const slider = document.getElementById(stat + 'ThresholdSlider');
            const valSpan = document.getElementById(stat + 'ThresholdVal');
            if (slider) slider.value = thresholds[stat];
            if (valSpan) valSpan.textContent = thresholds[stat];
        });

        document.getElementById('dayCount').textContent = this.gameState.day;
    }

    renderThresholds() {
        Object.keys(this.gameState.thresholds).forEach(stat => {
            document.getElementById(stat + 'Threshold').textContent = this.gameState.thresholds[stat];
        });
    }

    renderResources() {
        const { resources } = this.gameState;
        document.getElementById('foodCount').textContent = resources.food;
        document.getElementById('batteryCount').textContent = resources.battery;
        document.getElementById('partsCount').textContent = resources.parts;
        document.getElementById('medicineCount').textContent = resources.medicine;
    }

    renderSurvivors() {
        const container = document.getElementById('survivorList');
        const repairSelect = document.getElementById('repairSurvivor');
        
        container.innerHTML = '';
        repairSelect.innerHTML = '';

        this.gameState.survivors.forEach(survivor => {
            const card = document.createElement('div');
            card.className = 'survivor-card';
            if (survivor.fatigue >= 70) card.classList.add('exhausted');
            else if (survivor.fatigue >= 40) card.classList.add('tired');

            card.innerHTML = `
                <div class="survivor-name">${survivor.name} <small style="color:#888">[${survivor.skill}]</small></div>
                <div class="survivor-stats">
                    <span>❤️ ${survivor.health}%</span>
                    <span>😴 ${survivor.fatigue}%</span>
                </div>
                ${survivor.task ? `<div class="survivor-task">${survivor.task}</div>` : ''}
            `;
            container.appendChild(card);

            if (!survivor.task) {
                const option = document.createElement('option');
                option.value = survivor.id;
                option.textContent = `${survivor.name} (${survivor.skill})`;
                repairSelect.appendChild(option);
            }
        });
    }

    renderDistrictTrust() {
        const container = document.getElementById('districtTrust');
        container.innerHTML = '';

        this.gameState.districts.forEach(district => {
            const item = document.createElement('div');
            item.className = 'district-item';
            item.innerHTML = `
                <div class="district-name">
                    <span>${district.name}</span>
                    <span style="color:#3498db">${district.trust}%</span>
                </div>
                <div class="district-bar">
                    <div class="district-bar-fill" style="width:${district.trust}%"></div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderSchedule() {
        ['morning', 'afternoon', 'evening'].forEach(slot => {
            const optionsContainer = document.getElementById(slot + 'Options');
            const slotDisplay = document.getElementById('slot' + slot.charAt(0).toUpperCase() + slot.slice(1));
            
            optionsContainer.innerHTML = '';
            
            GameData.programTypes.forEach(program => {
                const btn = document.createElement('button');
                btn.className = 'program-btn';
                if (this.gameState.schedule[slot] === program.id) {
                    btn.classList.add('selected');
                }
                
                const effectsText = Object.entries(program.effects)
                    .map(([k, v]) => `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`)
                    .join(', ');
                
                btn.innerHTML = `
                    <div>${program.name}</div>
                    <div class="program-effects">${effectsText} | ⚡${program.power}</div>
                `;
                
                btn.addEventListener('click', () => this.selectProgram(slot, program.id));
                optionsContainer.appendChild(btn);
            });

            const current = this.gameState.schedule[slot];
            if (current) {
                const program = GameData.programTypes.find(p => p.id === current);
                slotDisplay.textContent = program ? program.name : '未安排';
            } else {
                slotDisplay.textContent = '未安排';
            }
        });
    }

    renderBroadcasts() {
        const container = document.getElementById('broadcastList');
        container.innerHTML = '';

        GameData.broadcastMessages.forEach(msg => {
            const item = document.createElement('div');
            item.className = 'broadcast-item';
            if (this.gameState.selectedBroadcast === msg.id) {
                item.classList.add('selected');
            }
            
            item.innerHTML = `
                <div class="broadcast-title">${msg.title}</div>
                <div class="broadcast-desc">${msg.content}</div>
            `;
            
            item.addEventListener('click', () => this.selectBroadcast(msg.id));
            container.appendChild(item);
        });

        document.getElementById('doBroadcastBtn').disabled = 
            !this.gameState.selectedBroadcast || this.gameState.todayActions.broadcastDone;
    }

    renderEquipment() {
        const container = document.getElementById('equipmentList');
        const select = document.getElementById('repairEquipment');
        
        container.innerHTML = '';
        select.innerHTML = '';

        this.gameState.equipment.forEach(eq => {
            const item = document.createElement('div');
            item.className = 'equipment-item';
            
            let conditionClass = 'condition-good';
            if (eq.condition <= 30) conditionClass = 'condition-bad';
            else if (eq.condition <= 60) conditionClass = 'condition-warn';

            let barColor = '#2ecc71';
            if (eq.condition <= 30) barColor = '#e74c3c';
            else if (eq.condition <= 60) barColor = '#f39c12';

            item.innerHTML = `
                <div class="equipment-header">
                    <span class="equipment-name">${eq.name}</span>
                    <span class="equipment-condition ${conditionClass}">${eq.condition}%</span>
                </div>
                <div class="equipment-bar">
                    <div class="equipment-bar-fill" style="width:${eq.condition}%; background:${barColor}"></div>
                </div>
                <div style="font-size:11px; color:#888; margin-top:5px">
                    影响: ${eq.effect} | 维修: 🔧${eq.repairCost}零件 | 修复: +${25}%
                </div>
            `;
            container.appendChild(item);

            if (eq.condition < 100 && !this.gameState.todayActions.repairDone.includes(eq.id)) {
                const option = document.createElement('option');
                option.value = eq.id;
                option.textContent = `${eq.name} (${eq.condition}%)`;
                select.appendChild(option);
            }
        });
    }

    renderRumors() {
        const container = document.getElementById('rumorList');
        const select = document.getElementById('rumorToSuppress');
        
        container.innerHTML = '';
        select.innerHTML = '';

        if (this.gameState.rumors.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center; padding:20px">暂无活跃谣言</p>';
            return;
        }

        this.gameState.rumors.forEach(rumor => {
            const item = document.createElement('div');
            item.className = 'rumor-item';
            item.innerHTML = `
                <div class="rumor-title">${rumor.title}</div>
                <div class="rumor-desc">${rumor.desc}</div>
                <div class="rumor-severity">
                    <span>严重程度</span>
                    <div class="rumor-severity-bar">
                        <div class="rumor-severity-fill" style="width:${rumor.severity}%"></div>
                    </div>
                    <span>${rumor.severity}%</span>
                </div>
            `;
            container.appendChild(item);

            if (!this.gameState.todayActions.rumorSuppressDone.includes(rumor.id)) {
                const option = document.createElement('option');
                option.value = rumor.id;
                option.textContent = `${rumor.title} (${rumor.severity}%)`;
                select.appendChild(option);
            }
        });

        document.getElementById('suppressRumorBtn').disabled = select.options.length === 0;
    }

    renderSettlements() {
        const container = document.getElementById('settlementList');
        container.innerHTML = '';

        if (this.gameState.settlementHistory.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center; padding:40px">暂无结算记录</p>';
            return;
        }

        this.gameState.settlementHistory.slice().reverse().forEach(settlement => {
            const item = document.createElement('div');
            item.className = 'settlement-item';
            
            let statsHtml = '';
            Object.entries(settlement.effects).forEach(([stat, value]) => {
                if (value !== 0) {
                    const className = value > 0 ? 'positive' : 'negative';
                    const sign = value > 0 ? '+' : '';
                    statsHtml += `<div class="settlement-stat ${className}"><span>${this.getStatName(stat)}</span><span>${sign}${value}</span></div>`;
                }
            });

            item.innerHTML = `
                <div class="settlement-header">
                    <span>第 ${settlement.day} 天结算</span>
                    <span style="font-size:12px; color:#888">${settlement.summary}</span>
                </div>
                <div class="settlement-stats">${statsHtml}</div>
            `;
            container.appendChild(item);
        });
    }

    renderQuestion() {
        const question = this.gameState.currentQuestion;
        const questionText = document.getElementById('questionText');
        const optionsContainer = document.getElementById('answerOptions');
        const historyContainer = document.getElementById('historyList');

        if (!question) {
            questionText.textContent = '今日问答次数已用完，请明日再来。';
            optionsContainer.innerHTML = '';
        } else {
            questionText.textContent = question.question;
            optionsContainer.innerHTML = '';

            question.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = option.text;
                btn.addEventListener('click', () => this.answerQuestion(index));
                optionsContainer.appendChild(btn);
            });
        }

        historyContainer.innerHTML = '';
        this.gameState.answeredQuestions.slice().reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item ' + (item.correct ? 'correct' : 'wrong');
            div.innerHTML = `<strong>${item.question}</strong><br><small>${item.correct ? '✓ 回答正确' : '✗ 回答错误'}: ${item.answer}</small>`;
            historyContainer.appendChild(div);
        });
    }

    getStatName(stat) {
        const names = {
            power: '⚡电量',
            noise: '🔊噪声',
            rumor: '🗣️谣言',
            fatigue: '😴疲劳',
            morale: '❤️民心',
            trust: '🤝信任',
            food: '🍞食物',
            battery: '🔋电池',
            parts: '🔧零件'
        };
        return names[stat] || stat;
    }

    selectProgram(slot, programId) {
        this.gameState.schedule[slot] = programId;
        this.renderSchedule();
    }

    selectBroadcast(broadcastId) {
        this.gameState.selectedBroadcast = broadcastId;
        
        const msg = GameData.broadcastMessages.find(m => m.id === broadcastId);
        const preview = document.getElementById('broadcastPreview');
        
        const effectsText = Object.entries(msg.effects)
            .map(([k, v]) => `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`)
            .join(' | ');
        
        preview.innerHTML = `
            <h4 style="color:#e94560; margin-bottom:10px">${msg.title}</h4>
            <p>${msg.content}</p>
            <p style="color:#888; font-size:12px; margin-top:10px">效果: ${effectsText} | 耗电: ⚡${msg.power}</p>
        `;
        
        this.renderBroadcasts();
    }

    doBroadcast() {
        const msg = GameData.broadcastMessages.find(m => m.id === this.gameState.selectedBroadcast);
        if (!msg || this.gameState.todayActions.broadcastDone) return;

        if (this.gameState.status.power < msg.power) {
            this.showEvent('电力不足', '电量不足，无法进行播报！', [{ text: '⚡电量不足', type: 'negative' }]);
            return;
        }

        this.applyEffects(msg.effects);
        this.gameState.status.power -= msg.power;
        this.gameState.todayActions.broadcastDone = true;

        const effectTags = Object.entries(msg.effects)
            .filter(([_, v]) => v !== 0)
            .map(([k, v]) => ({
                text: `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`,
                type: v > 0 ? 'positive' : 'negative'
            }));

        this.showEvent('播报完成', `已播报：${msg.title}`, effectTags);
        this.renderAll();
    }

    generateQuestion() {
        if (this.gameState.todayActions.qaDone >= 3) {
            this.gameState.currentQuestion = null;
        } else {
            const available = GameData.questionBank.filter(q => 
                !this.gameState.answeredQuestions.some(a => a.question === q.question)
            );
            
            if (available.length > 0) {
                this.gameState.currentQuestion = available[Math.floor(Math.random() * available.length)];
            } else {
                this.gameState.currentQuestion = GameData.questionBank[Math.floor(Math.random() * GameData.questionBank.length)];
            }
        }
        this.renderQuestion();
    }

    answerQuestion(optionIndex) {
        const question = this.gameState.currentQuestion;
        if (!question) return;

        const option = question.options[optionIndex];
        this.applyEffects(option.effects);
        this.gameState.todayActions.qaDone++;

        this.gameState.answeredQuestions.push({
            question: question.question,
            answer: option.text,
            correct: option.correct,
            day: this.gameState.day
        });

        const effectTags = Object.entries(option.effects)
            .filter(([_, v]) => v !== 0)
            .map(([k, v]) => ({
                text: `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`,
                type: v > 0 ? 'positive' : 'negative'
            }));

        const title = option.correct ? '回答正确！' : '回答不佳...';
        this.showEvent(title, option.text, effectTags);

        this.generateQuestion();
        this.renderStatus();
    }

    doRepair() {
        const eqId = document.getElementById('repairEquipment').value;
        const survivorId = document.getElementById('repairSurvivor').value;
        
        if (!eqId || !survivorId) return;

        const equipment = this.gameState.equipment.find(e => e.id === eqId);
        const survivor = this.gameState.survivors.find(s => s.id === survivorId);
        
        if (!equipment || !survivor) return;

        if (this.gameState.resources.parts < equipment.repairCost) {
            this.showEvent('零件不足', '没有足够的零件进行维修！', [{ text: '🔧零件不足', type: 'negative' }]);
            return;
        }

        this.gameState.resources.parts -= equipment.repairCost;
        
        const repairBonus = survivor.skill === '维修' ? 15 : 0;
        const repairAmount = 25 + repairBonus;
        equipment.condition = Math.min(100, equipment.condition + repairAmount);
        
        survivor.fatigue += 20;
        survivor.task = `维修 ${equipment.name}`;
        
        this.gameState.todayActions.repairDone.push(eqId);

        this.showEvent('维修完成', `${survivor.name} 完成了 ${equipment.name} 的维修工作！`, [
            { text: `🔧 ${equipment.name} +${repairAmount}%`, type: 'positive' },
            { text: `😴 ${survivor.name} 疲劳 +20`, type: 'negative' }
        ]);

        this.renderAll();
    }

    suppressRumor() {
        const rumorId = document.getElementById('rumorToSuppress').value;
        if (!rumorId) return;

        const rumor = this.gameState.rumors.find(r => r.id === rumorId);
        if (!rumor) return;

        if (this.gameState.status.power < 8) {
            this.showEvent('电力不足', '电量不足，无法发布澄清广播！', [{ text: '⚡电量不足', type: 'negative' }]);
            return;
        }

        this.gameState.status.power -= 8;
        rumor.severity -= 40;
        this.gameState.status.rumor -= 15;
        this.gameState.status.fatigue += 10;
        this.gameState.todayActions.rumorSuppressDone.push(rumorId);

        let effectTags = [
            { text: `🗣️ 谣言 -40%`, type: 'positive' },
            { text: `😴 疲劳 +10`, type: 'negative' }
        ];

        if (rumor.severity <= 0) {
            this.gameState.rumors = this.gameState.rumors.filter(r => r.id !== rumorId);
            this.gameState.status.morale += 10;
            effectTags.push({ text: '✅ 谣言已平息', type: 'positive' });
            effectTags.push({ text: '❤️ 民心 +10', type: 'positive' });
        }

        this.showEvent('发布澄清', `针对"${rumor.title}"发布了官方澄清消息。`, effectTags);
        this.renderAll();
    }

    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            if (key === 'trust') {
                this.gameState.districts.forEach(d => {
                    d.trust = Math.max(0, Math.min(100, d.trust + value));
                });
            } else if (this.gameState.status[key] !== undefined) {
                this.gameState.status[key] = Math.max(0, Math.min(100, this.gameState.status[key] + value));
            } else if (this.gameState.resources[key] !== undefined) {
                this.gameState.resources[key] = Math.max(0, this.gameState.resources[key] + value);
            }
        });
    }

    generateDailyRumors() {
        if (Math.random() < 0.6) {
            this.gameState.rumors.push(this.generateRumor());
        }
        if (this.gameState.day > 3 && Math.random() < 0.4) {
            this.gameState.rumors.push(this.generateRumor());
        }
    }

    endDay() {
        const dayEffects = {
            power: 0,
            noise: 0,
            rumor: 0,
            fatigue: 0,
            morale: 0,
            food: 0
        };

        let totalPowerUsed = 0;
        ['morning', 'afternoon', 'evening'].forEach(slot => {
            const programId = this.gameState.schedule[slot];
            if (programId) {
                const program = GameData.programTypes.find(p => p.id === programId);
                if (program) {
                    totalPowerUsed += program.power;
                    Object.entries(program.effects).forEach(([k, v]) => {
                        if (dayEffects[k] !== undefined) {
                            dayEffects[k] += v;
                        }
                    });
                }
            }
        });

        dayEffects.power -= totalPowerUsed;

        const survivorCount = this.gameState.survivors.length;
        dayEffects.food -= survivorCount;
        this.gameState.resources.food += dayEffects.food;

        this.gameState.survivors.forEach(s => {
            if (s.fatigue > 0) {
                s.fatigue = Math.max(0, s.fatigue - 30);
            }
            if (s.task) {
                s.task = null;
            }
        });

        this.gameState.rumors.forEach(rumor => {
            rumor.severity += 10;
            dayEffects.rumor += 5;
        });

        this.gameState.rumors = this.gameState.rumors.filter(r => r.severity <= 100);
        this.gameState.rumors.forEach(r => {
            if (r.severity >= 80) {
                dayEffects.morale -= 8;
            }
        });

        if (this.gameState.status.power <= this.gameState.thresholds.power) {
            dayEffects.morale -= 10;
        }
        if (this.gameState.status.noise >= this.gameState.thresholds.noise) {
            dayEffects.morale -= 5;
            dayEffects.fatigue += 10;
        }
        if (this.gameState.status.rumor >= this.gameState.thresholds.rumor) {
            dayEffects.morale -= 15;
        }
        if (this.gameState.status.fatigue >= this.gameState.thresholds.fatigue) {
            dayEffects.morale -= 5;
        }
        if (this.gameState.status.morale <= this.gameState.thresholds.morale) {
            this.gameState.districts.forEach(d => {
                d.trust = Math.max(0, d.trust - 5);
            });
        }

        if (this.gameState.resources.food < 0) {
            dayEffects.morale -= 20;
            this.gameState.resources.food = 0;
            this.gameState.survivors.forEach(s => {
                s.health -= 10;
            });
        }

        Object.entries(dayEffects).forEach(([k, v]) => {
            if (k !== 'food' && this.gameState.status[k] !== undefined) {
                this.gameState.status[k] = Math.max(0, Math.min(100, this.gameState.status[k] + v));
            }
        });

        let summary = '正常';
        if (this.gameState.status.morale <= 20) summary = '危急';
        else if (this.gameState.status.morale <= 40) summary = '堪忧';
        else if (this.gameState.status.morale >= 80) summary = '良好';

        this.gameState.settlementHistory.push({
            day: this.gameState.day,
            effects: dayEffects,
            summary: summary
        });

        this.showSettlementModal(dayEffects, summary);

        this.gameState.day++;
        this.gameState.schedule = { morning: null, afternoon: null, evening: null };
        this.gameState.selectedBroadcast = null;
        this.gameState.currentQuestion = null;
        this.gameState.todayActions = {
            broadcastDone: false,
            qaDone: 0,
            repairDone: [],
            rumorSuppressDone: []
        };

        this.generateDailyRumors();

        this.gameState.equipment.forEach(eq => {
            eq.condition = Math.max(0, eq.condition - 3);
        });

        if (Math.random() < 0.3) {
            this.gameState.resources.parts += Math.floor(Math.random() * 3) + 1;
        }
        if (Math.random() < 0.3) {
            this.gameState.resources.battery += Math.floor(Math.random() * 2) + 1;
        }
        if (Math.random() < 0.2) {
            this.gameState.resources.food += Math.floor(Math.random() * 5) + 2;
        }

        if (this.gameState.status.morale <= 0) {
            this.gameOver('民心崩溃', '广播站失去了所有听众的信任，人们不再相信你了...');
            return;
        }
        if (this.gameState.status.power <= 0 && this.gameState.resources.battery <= 0) {
            this.gameOver('电力耗尽', '所有电力来源都已耗尽，广播站陷入了黑暗...');
            return;
        }

        this.renderAll();
    }

    showSettlementModal(effects, summary) {
        let effectsHtml = '';
        Object.entries(effects).forEach(([stat, value]) => {
            if (value !== 0) {
                const className = value > 0 ? 'positive' : 'negative';
                const sign = value > 0 ? '+' : '';
                effectsHtml += `<span class="effect-tag ${className}">${this.getStatName(stat)} ${sign}${value}</span>`;
            }
        });

        document.getElementById('modalTitle').textContent = `第 ${this.gameState.day} 天结算 - ${summary}`;
        document.getElementById('modalText').textContent = '今日运营已结束，以下是今日总结：';
        document.getElementById('modalEffects').innerHTML = effectsHtml;
        document.getElementById('eventModal').classList.add('active');
    }

    showEvent(title, text, effects) {
        let effectsHtml = '';
        effects.forEach(e => {
            effectsHtml += `<span class="effect-tag ${e.type}">${e.text}</span>`;
        });

        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').textContent = text;
        document.getElementById('modalEffects').innerHTML = effectsHtml;
        document.getElementById('eventModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('eventModal').classList.remove('active');
    }

    gameOver(title, message) {
        this.gameState.gameOver = true;
        this.showEvent(`游戏结束 - ${title}`, message + `\n你坚持了 ${this.gameState.day} 天。`, []);
        document.getElementById('endDayBtn').disabled = true;
    }
}
