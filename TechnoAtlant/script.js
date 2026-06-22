// ======== СОСТОЯНИЕ СИСТЕМЫ ========
const state = {
    mode: 'standard',
    battery: 85,
    temperature: 24,
    ambientTemp: -15,
    isActive: false,
    isOverheating: false,
    isLowBattery: false,
    throttling: false,
    activeZones: 12,
    powerConsumption: 12,
    tempHistory: Array(50).fill(24),
    simulationRunning: true
};

const modeConfig = {
    eco: { power: 6, maxTemp: 30, batteryDrain: 0.08, zones: 8, label: 'Экономичный' },
    standard: { power: 12, maxTemp: 38, batteryDrain: 0.15, zones: 12, label: 'Стандартный' },
    intense: { power: 24, maxTemp: 50, batteryDrain: 0.35, zones: 12, label: 'Интенсивный' }
};

let chartCtx = null;

// ======== ИНИЦИАЛИЗАЦИЯ ========
function init() {
    createSnowflakes();
    initChart();
    startSimulation();
    updateUI();
}

// Создание снежинок
function createSnowflakes() {
    const container = document.getElementById('snowflakes');
    for (let i = 0; i < 30; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.innerHTML = '❄';
        flake.style.left = Math.random() * 100 + '%';
        flake.style.animationDuration = (Math.random() * 5 + 5) + 's';
        flake.style.animationDelay = Math.random() * 10 + 's';
        flake.style.fontSize = (Math.random() * 0.8 + 0.5) + 'em';
        container.appendChild(flake);
    }
}

// ======== УПРАВЛЕНИЕ РЕЖИМАМИ ========
function setMode(mode) {
    state.mode = mode;

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === mode) btn.classList.add('active');
    });

    state.isOverheating = false;
    state.isLowBattery = false;
    document.querySelectorAll('.scenario-btn').forEach(btn => btn.classList.remove('active'));

    addAlert('info', `Режим переключен на: ${modeConfig[mode].label}`);
    updateUI();
}

// ======== СЦЕНАРИИ ========
function toggleActivity() {
    state.isActive = !state.isActive;
    document.getElementById('activity-toggle').classList.toggle('active', state.isActive);
    document.getElementById('scenario-activity').classList.toggle('active', state.isActive);

    if (state.isActive) {
        addAlert('warning', 'Обнаружена активность пользователя! Дополнительный нагрев в замкнутом пространстве.');
    } else {
        addAlert('info', 'Активность пользователя прекращена. Температура стабилизируется.');
    }
}

function triggerLowBattery() {
    state.isLowBattery = !state.isLowBattery;
    document.getElementById('scenario-lowbat').classList.toggle('active', state.isLowBattery);

    if (state.isLowBattery) {
        state.battery = 15;
        addAlert('danger', 'КРИТИЧЕСКИЙ ЗАРЯД БАТАРЕИ! Переключитесь в экономичный режим.');
    } else {
        state.battery = 85;
        addAlert('info', 'Заряд батареи восстановлен.');
    }
    updateUI();
}

function triggerOverheat() {
    state.isOverheating = !state.isOverheating;
    document.getElementById('scenario-overheat').classList.toggle('active', state.isOverheating);

    if (state.isOverheating) {
        state.temperature = 52;
        addAlert('danger', 'ПЕРЕГРЕВ СИСТЕМЫ! Троттлинг активирован для защиты.');
    } else {
        state.temperature = 24;
        state.throttling = false;
        addAlert('info', 'Перегрев устранён. Система работает нормально.');
    }
    updateUI();
}

// ======== СИМУЛЯЦИЯ ========
function startSimulation() {
    setInterval(() => {
        if (!state.simulationRunning) return;
        simulateStep();
        updateUI();
    }, 1000);
}

function simulateStep() {
    const config = modeConfig[state.mode];

    // Расход батареи
    let drain = config.batteryDrain;
    if (state.isActive) drain *= 1.3;
    if (state.throttling) drain *= 0.5;

    if (!state.isLowBattery) {
        state.battery = Math.max(0, state.battery - drain);
    }

    // Изменение температуры
    let targetTemp = config.maxTemp;
    if (state.isActive) targetTemp += 8;
    if (state.throttling) targetTemp = Math.min(targetTemp, 35);

    if (state.isOverheating) {
        targetTemp = 55;
    }

    const tempDiff = targetTemp - state.temperature;
    state.temperature += tempDiff * 0.1;

    // Проверка перегрева
    if (state.temperature > 45 && !state.throttling) {
        state.throttling = true;
        addAlert('danger', 'АВТОМАТИЧЕСКАЯ ЗАЩИТА: Троттлинг активирован! Температура превысила 45°C.');
    } else if (state.temperature < 38 && state.throttling) {
        state.throttling = false;
        addAlert('info', 'Троттлинг отключён. Температура в норме.');
    }

    // Проверка низкого заряда
    if (state.battery < 20 && !state.isLowBattery) {
        addAlert('warning', `Низкий заряд батареи: ${Math.floor(state.battery)}%. Рекомендуется экономичный режим.`);
    }

    // Потребление мощности
    state.powerConsumption = state.throttling ? config.power * 0.4 : config.power;
    if (state.isActive) state.powerConsumption *= 1.2;

    // Обновление истории температур
    state.tempHistory.push(state.temperature);
    state.tempHistory.shift();

    updateChart();
}

// ======== ОБНОВЛЕНИЕ UI ========
function updateUI() {
    updateBattery();
    updateTemperature();
    updateSuitZones();
    updateSystemStatus();
    updateThrottlingIndicator();
}

function updateBattery() {
    const fill = document.getElementById('battery-fill');
    const text = document.getElementById('battery-text');
    const progress = document.getElementById('battery-progress');
    const time = document.getElementById('battery-time');
    const status = document.getElementById('battery-status');

    const pct = Math.floor(state.battery);
    fill.style.width = pct + '%';
    progress.style.width = pct + '%';
    text.textContent = pct + '%';

    fill.classList.remove('low', 'medium');
    if (pct < 20) {
        fill.classList.add('low');
        text.classList.add('critical');
        progress.style.background = 'linear-gradient(90deg, #ff4444, #cc3333)';
        status.textContent = 'КРИТИЧЕСКИЙ';
        status.style.color = '#ff4444';
    } else if (pct < 50) {
        fill.classList.add('medium');
        text.classList.remove('critical');
        progress.style.background = 'linear-gradient(90deg, #ffaa00, #cc8800)';
        status.textContent = 'Средний';
        status.style.color = '#ffaa00';
    } else {
        text.classList.remove('critical');
        progress.style.background = 'linear-gradient(90deg, #00ff88, #00cc66)';
        status.textContent = 'Норма';
        status.style.color = '#00e5ff';
    }

    const config = modeConfig[state.mode];
    let hours = (state.battery / 100) * (100 / config.batteryDrain) / 60;
    if (state.isActive) hours /= 1.3;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    time.textContent = `Осталось: ~${h}ч ${m}мин`;
}

function updateTemperature() {
    const tempValue = document.getElementById('temp-value');
    const tempInternal = document.getElementById('temp-internal');
    const tempMax = document.getElementById('temp-max');
    const tempStatus = document.getElementById('temp-status');
    const gaugeFill = document.getElementById('temp-gauge-fill');
    const thermometerFill = document.getElementById('thermometer-fill');
    const powerConsumption = document.getElementById('power-consumption');

    const temp = Math.round(state.temperature);
    const sign = temp >= 0 ? '+' : '';
    tempValue.textContent = `${sign}${temp}°`;
    tempInternal.textContent = `${sign}${temp}°C`;

    const maxZoneTemp = temp + (state.mode === 'intense' ? 8 : state.mode === 'standard' ? 4 : 2);
    tempMax.textContent = `+${maxZoneTemp}°C`;

    powerConsumption.textContent = `${Math.round(state.powerConsumption)}W`;

    let color = '#00e5ff';
    let gaugeColor = '#00e5ff';
    if (temp > 35) { color = '#ffaa00'; gaugeColor = '#ffaa00'; }
    if (temp > 45) { color = '#ff4444'; gaugeColor = '#ff4444'; }
    tempValue.style.color = color;
    gaugeFill.style.stroke = gaugeColor;

    if (temp > 45) {
        tempStatus.textContent = 'ПЕРЕГРЕВ';
        tempStatus.style.color = '#ff4444';
    } else if (temp > 35) {
        tempStatus.textContent = 'Повышенная';
        tempStatus.style.color = '#ffaa00';
    } else {
        tempStatus.textContent = 'Норма';
        tempStatus.style.color = '#00e5ff';
    }

    const thermometerPct = Math.max(0, Math.min(100, (temp + 50) / 100 * 100));
    thermometerFill.style.height = thermometerPct + '%';

    if (temp < 0) {
        thermometerFill.style.background = 'linear-gradient(to top, #4488ff, #88ccff)';
    } else if (temp < 25) {
        thermometerFill.style.background = 'linear-gradient(to top, #00e5ff, #00ff88)';
    } else if (temp < 40) {
        thermometerFill.style.background = 'linear-gradient(to top, #ffaa00, #ffcc00)';
    } else {
        thermometerFill.style.background = 'linear-gradient(to top, #ff4444, #ff8844)';
    }

    const maxGauge = 80;
    const minGauge = -20;
    const gaugePct = Math.max(0, Math.min(1, (state.temperature - minGauge) / (maxGauge - minGauge)));
    const circumference = 2 * Math.PI * 50;
    gaugeFill.style.strokeDasharray = circumference;
    gaugeFill.style.strokeDashoffset = circumference * (1 - gaugePct);
}

function updateSuitZones() {
    const zones = document.querySelectorAll('.heat-zone');
    const baseOpacity = state.throttling ? 0.3 : 
                       state.mode === 'eco' ? 0.4 : 
                       state.mode === 'standard' ? 0.7 : 0.95;

    zones.forEach((zone, index) => {
        let opacity = baseOpacity;

        if (state.mode === 'eco' && index > 7) {
            opacity = 0.1;
        }

        if (state.isOverheating) {
            opacity = 0.3 + Math.random() * 0.5;
        }

        zone.style.opacity = opacity;

        if (state.temperature > 40) {
            zone.style.fill = '#ff4444';
        } else if (state.temperature > 30) {
            zone.style.fill = '#ff8c5a';
        } else {
            zone.style.fill = 'url(#heatGradient)';
        }
    });
}

function updateSystemStatus() {
    const config = modeConfig[state.mode];
    document.getElementById('active-zones').textContent = 
        (state.mode === 'eco' ? '8/12' : '12/12');

    const throttlingEl = document.getElementById('throttling-status');
    throttlingEl.textContent = state.throttling ? 'АКТИВЕН' : 'Выкл';
    throttlingEl.className = 'status-value ' + (state.throttling ? 'danger' : '');

    const protectionEl = document.getElementById('protection-status');
    protectionEl.textContent = state.throttling ? 'ТРОТТЛИНГ' : 'Активна';
    protectionEl.className = 'status-value ' + (state.throttling ? 'warning' : '');

    const stabilityEl = document.getElementById('stability-status');
    const stability = state.throttling ? 60 : state.isOverheating ? 40 : 100;
    stabilityEl.textContent = stability + '%';
    stabilityEl.className = 'status-value ' + (stability < 80 ? 'warning' : '');
}

function updateThrottlingIndicator() {
    document.getElementById('throttling-indicator').classList.toggle('visible', state.throttling);
}

// ======== УВЕДОМЛЕНИЯ ========
function addAlert(type, message) {
    const container = document.getElementById('alerts-container');
    const alert = document.createElement('div');
    alert.className = `alert-item alert-${type}`;

    const icons = { info: 'ℹ️', warning: '⚠️', danger: '🚨' };
    alert.innerHTML = `<span class="alert-icon">${icons[type]}</span><span>${message}</span>`;

    container.insertBefore(alert, container.firstChild);

    while (container.children.length > 6) {
        container.removeChild(container.lastChild);
    }
}

// ======== ГРАФИК ========
function initChart() {
    const canvas = document.getElementById('tempChart');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    chartCtx = canvas.getContext('2d');
    chartCtx.scale(2, 2);
}

function updateChart() {
    if (!chartCtx) return;
    const canvas = document.getElementById('tempChart');
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    chartCtx.clearRect(0, 0, w, h);

    // Сетка
    chartCtx.strokeStyle = 'rgba(255,255,255,0.05)';
    chartCtx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const y = (h / 4) * i;
        chartCtx.beginPath();
        chartCtx.moveTo(0, y);
        chartCtx.lineTo(w, y);
        chartCtx.stroke();
    }

    // Линия температуры
    chartCtx.strokeStyle = state.temperature > 40 ? '#ff4444' : state.temperature > 30 ? '#ffaa00' : '#00e5ff';
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();

    const data = state.tempHistory;
    const min = Math.min(...data, -10);
    const max = Math.max(...data, 60);
    const range = max - min || 1;

    for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((data[i] - min) / range) * h;
        if (i === 0) chartCtx.moveTo(x, y);
        else chartCtx.lineTo(x, y);
    }
    chartCtx.stroke();

    // Заливка под линией
    chartCtx.fillStyle = state.temperature > 40 ? 'rgba(255,68,68,0.1)' : 
                       state.temperature > 30 ? 'rgba(255,170,0,0.1)' : 'rgba(0,229,255,0.1)';
    chartCtx.lineTo(w, h);
    chartCtx.lineTo(0, h);
    chartCtx.closePath();
    chartCtx.fill();
}

// ======== ЗАПУСК ========
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', () => {
    initChart();
    updateChart();
});