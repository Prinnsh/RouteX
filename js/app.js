// Force all fetch requests securely to the cloud production instance API natively,
// ensuring execution globally irrespective of local dev or Android file host environments.
const API_BASE_URL = 'https://routex-rscc.onrender.com';

// Global State
let globalData = [];
let analyzedRoutesData = [];
let aiSystemSysOut = null;
let charts = {};
let fleetMapCore = null;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Init Icons
    lucide.createIcons();

    // Init Navigation Navigation
    initNavigation();

    // Bind Action Buttons
    document.getElementById('btn-gen-data').addEventListener('click', handleGenerateData);
    document.getElementById('csv-upload').addEventListener('change', handleCSVUpload);
    document.getElementById('btn-run-sim').addEventListener('click', handleRunSimulation);
    document.getElementById('btn-export-pdf').addEventListener('click', handleExportPDF);

    // Dark theme chart defaults
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
});

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.getAttribute('data-view');

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            views.forEach(v => {
                v.classList.remove('active');
                if (v.id === `view-${targetView}`) {
                    v.classList.add('active');
                    if (targetView === 'map') {
                        if (!fleetMapCore) {
                            fleetMapCore = new FleetDigitalTwin('fleetMap');
                            fleetMapCore.init();
                        }
                        if (analyzedRoutesData.length > 0) {
                            fleetMapCore.updateMarkers(analyzedRoutesData);
                        }
                        setTimeout(() => fleetMapCore.resize(), 100);
                    }
                }
            });
        });
    });
}

async function handleGenerateData() {
    try {
        const btn = document.getElementById('btn-gen-data');
        btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Loading Real Transit Logs...`;
        lucide.createIcons();

        // Fetch real Ahmedabad historical data securely from the backend API
        const response = await fetch(`${API_BASE_URL}/generate-demo`);
        const data = await response.json();

        if (!response.ok || data.status === 'error') throw new Error(data.message);

        globalData = data.dataset;

        document.getElementById('data-status-container').style.display = 'block';
        document.getElementById('data-count-label').innerText = globalData.length;

        // Run AI Engine Backend remotely
        await processDataWithAI();

        // Switch to Dashboard
        document.querySelector('[data-view="dashboard"]').click();

        btn.innerHTML = `<i data-lucide="refresh-cw"></i> Load AI Demo Set`;
        lucide.createIcons();
    } catch (e) {
        alert("Failed to load real Ahmedabad dataset. Ensure Python backend is running.");
        console.error(e);
    }
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        const text = e.target.result;
        // Simple parsing logic assuming basic comma delimiter without internal quotes
        const lines = text.split('\n');
        const newData = [];

        // Skip header at index 0
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(',');
            // Mapping assumed format: route_id, bus_id, capacity, passengers, time_slot, trip_number, date
            if (cols.length >= 4) {
                newData.push({
                    route_id: (cols[0] || 'Unknown').trim(),
                    bus_id: (cols[1] || 'B0').trim(),
                    capacity: parseInt(cols[2]) || 60,
                    passengers: parseInt(cols[3]) || 0,
                    time_slot: (cols[4] || '12:00').trim(),
                    trip_number: (cols[5] || 'T00').trim(),
                    date: (cols[6] || new Date().toISOString().split('T')[0]).trim()
                });
            }
        }

        if (newData.length > 0) {
            globalData = newData;

            // Show Status
            document.getElementById('data-status-container').style.display = 'block';
            document.getElementById('data-count-label').innerText = globalData.length;

            // Execute remote full-stack AI platform
            await processDataWithAI();

            // Return to Dashboard View
            document.querySelector('[data-view="dashboard"]').click();
        } else {
            alert("No valid formatted data records found in CSV file.");
        }
    };
    reader.readAsText(file);
}

async function processDataWithAI() {
    try {
        const response = await fetch(`${API_BASE_URL}/analyze-ai`, {
            method: 'POST',
            body: JSON.stringify({ dataset: globalData }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error("Python Backend Error");

        const data = await response.json();
        if (data.status === "error") throw new Error(data.message);

        // Parse responses mapped directly from the Flask Engine
        analyzedRoutesData = data.routesOut;
        aiSystemSysOut = data.aiSystemSysOut;

        // Propagate updates visually
        updateKPICards();
        updateCharts();
        updateAIPanel(data.sysReliability);
        updateRouteTable();
        updateAIAlerts();

        // GIS update if actively tracking
        if (fleetMapCore) {
            fleetMapCore.updateMarkers(analyzedRoutesData);
        }

    } catch (e) {
        alert("Fatal Error: Could not connect to the BRTS Python server.\nEnsure port 5000 is active.");
        console.error("Backend Error:", e);
    }
}

function updateKPICards() {
    const container = document.getElementById('kpi-container');

    const totalRoutes = analyzedRoutesData.length;
    let totalBuses = 50; // Mock total
    let totalUtil = 0;
    let overloaded = 0;
    let underused = 0;

    analyzedRoutesData.forEach(r => {
        totalUtil += r.utilization;
        if (r.status === 'Overloaded') overloaded++;
        if (r.status === 'Underutilized') underused++;
    });

    const avgUtil = Math.round(totalUtil / totalRoutes);

    container.innerHTML = `
        <div class="kpi-card">
            <span class="kpi-label">Average Utilization <i data-lucide="activity" class="text-muted"></i></span>
            <span class="kpi-value ${avgUtil < 40 ? 'red' : (avgUtil > 75 ? 'red' : 'green')}">${avgUtil}%</span>
        </div>
        <div class="kpi-card">
            <span class="kpi-label">Active Routes <i data-lucide="route" class="text-muted"></i></span>
            <span class="kpi-value">${totalRoutes}</span>
        </div>
        <div class="kpi-card">
            <span class="kpi-label">Overloaded Routes <i data-lucide="alert-triangle" class="text-muted"></i></span>
            <span class="kpi-value ${overloaded > 0 ? 'red' : 'green'}">${overloaded}</span>
        </div>
        <div class="kpi-card">
            <span class="kpi-label">Wasted Capacity <i data-lucide="trending-down" class="text-muted"></i></span>
            <span class="kpi-value yellow">${underused} Routes</span>
        </div>
    `;
    lucide.createIcons();
}

function updateCharts() {
    const labels = analyzedRoutesData.map(r => r.route);
    const utilData = analyzedRoutesData.map(r => r.utilization);
    const effiData = analyzedRoutesData.map(r => r.efficiencyScore);

    // 1. Bar Chart: Utilization
    const ctx1 = document.getElementById('utilizationChart').getContext('2d');
    if (charts.util) charts.util.destroy();

    charts.util = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avg Utilization (%)',
                data: utilData,
                backgroundColor: utilData.map(v => v > 75 ? 'rgba(239, 68, 68, 0.7)' : (v < 40 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(16, 185, 129, 0.7)')),
                borderRadius: 4
            }, {
                label: 'AI Efficiency Score',
                data: effiData,
                type: 'line',
                borderColor: '#3B82F6',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Line Chart: Passenger Demand Trend (Mock single route R5 peak analysis)
    const trendCtx = document.getElementById('demandTrendChart').getContext('2d');
    if (charts.trend) charts.trend.destroy();

    charts.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'],
            datasets: [{
                label: 'Route R5 Demand',
                data: [30, 85, 50, 40, 45, 60, 90, 35],
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 3. Pie Chart: Fleet Status
    const pCtx = document.getElementById('fleetPieChart').getContext('2d');
    if (charts.pie) charts.pie.destroy();

    let optimal = 0, over = 0, under = 0;
    analyzedRoutesData.forEach(r => {
        if (r.status === 'Optimal') optimal++;
        else if (r.status === 'Overloaded') over++;
        else under++;
    });

    charts.pie = new Chart(pCtx, {
        type: 'doughnut',
        data: {
            labels: ['Optimal', 'Overloaded', 'Underutilized'],
            datasets: [{
                data: [optimal, over, under],
                backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
}

function updateAIPanel(reliability) {
    const list = document.getElementById('ai-reco-list');
    list.innerHTML = '';

    aiSystemSysOut.recommendations.forEach(r => {
        list.innerHTML += `
            <div class="reco-item ${r.classType}">
                <div class="reco-content">
                    <h4>${r.classType === 'action-add' ? 'Reallocation Suggested' : 'Optimize Fleet'}</h4>
                    <p>${r.text}</p>
                </div>
            </div>
        `;
    });

    // Update Reliability
    document.getElementById('reliability-val').innerText = reliability;
    document.getElementById('reliability-bar').style.width = `${reliability}%`;

    if (reliability > 80) document.getElementById('reliability-val').style.color = 'var(--status-green)';
    else if (reliability > 60) document.getElementById('reliability-val').style.color = 'var(--status-yellow)';
    else document.getElementById('reliability-val').style.color = 'var(--status-red)';
}

function updateRouteTable() {
    const tbody = document.querySelector('#route-table tbody');
    tbody.innerHTML = '';

    analyzedRoutesData.forEach(route => {
        let badgeClass = route.status === 'Optimal' ? 'badge-green' : (route.status === 'Overloaded' ? 'badge-red' : 'badge-yellow');
        let action = route.status === 'Optimal' ? 'Monitor' : (route.status === 'Overloaded' ? 'Add Capacity' : 'Reduce Fleet');
        let reliabStatus = route.reliabilityScore > 80 ? 'High' : (route.reliabilityScore > 60 ? 'Medium' : 'Low');

        tbody.innerHTML += `
            <tr class="route-table-row" data-route="${route.route}" style="cursor: pointer; transition: background-color 0.2s;">
                <td><strong>${route.route}</strong></td>
                <td><span class="badge ${badgeClass}">${route.utilization}% (${route.status})</span></td>
                <td>${route.efficiencyScore}/100</td>
                <td>${reliabStatus} (${route.reliabilityScore})</td>
                <td style="color: ${action === 'Add Capacity' ? 'var(--status-red)' : (action === 'Reduce Fleet' ? 'var(--status-yellow)' : 'var(--text-secondary)')}">
                    ${action}
                </td>
            </tr>
        `;
    });

    // Bind interaction logic
    document.querySelectorAll('.route-table-row').forEach(row => {
        row.addEventListener('click', (e) => {
            const routeId = e.currentTarget.getAttribute('data-route');
            showRouteDrillDown(routeId);

            document.querySelectorAll('.route-table-row').forEach(r => r.style.background = '');
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
        });
    });
}

function showRouteDrillDown(routeId) {
    if (!charts.trend) return;

    // Group records by bucket hour (6AM..8PM)
    const demandByHour = { '6': 0, '8': 0, '10': 0, '12': 0, '14': 0, '16': 0, '18': 0, '20': 0 };
    let countByHour = { '6': 0, '8': 0, '10': 0, '12': 0, '14': 0, '16': 0, '18': 0, '20': 0 };

    globalData.forEach(row => {
        if (row.route_id === routeId) {
            const hourStr = row.time_slot.split(':')[0];
            const hour = parseInt(hourStr);

            let bucket = 6;
            if (hour >= 20) bucket = 20;
            else if (hour >= 18) bucket = 18;
            else if (hour >= 16) bucket = 16;
            else if (hour >= 14) bucket = 14;
            else if (hour >= 12) bucket = 12;
            else if (hour >= 10) bucket = 10;
            else if (hour >= 8) bucket = 8;

            demandByHour[bucket.toString()] += row.passengers;
            countByHour[bucket.toString()]++;
        }
    });

    // Get realistic Averages representing historic demand
    const dataPoints = Object.keys(demandByHour).map(key => {
        if (countByHour[key] === 0) return 0;
        return Math.floor(demandByHour[key] / countByHour[key]);
    });

    charts.trend.data.datasets[0].label = `[Live Drill-Down] Route ${routeId} Demand`;
    charts.trend.data.datasets[0].data = dataPoints;
    charts.trend.update();

    // Bring user to dashboard to see drilldown
    document.querySelector('[data-view="dashboard"]').click();
}

function updateAIAlerts() {
    const list = document.getElementById('predictive-alerts-list');
    if (!list) return;
    list.innerHTML = '';

    aiSystemSysOut.alerts.forEach(alert => {
        list.innerHTML += `
            <div class="panel-card mb-4" style="background: rgba(239, 68, 68, 0.05); border-left: 4px solid var(--status-red)">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <i data-lucide="siren" style="color: var(--status-red)"></i>
                    <p style="margin: 0;">${alert}</p>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
}

function handleRunSimulation() {
    if (globalData.length === 0) {
        alert("Please load data first!");
        document.querySelector('[data-view="data-handling"]').click();
        return;
    }

    const resDiv = document.getElementById('sim-results');
    const rdList = document.getElementById('redistribution-list');

    rdList.innerHTML = '';
    aiSystemSysOut.redistributionPlan.forEach(plan => {
        rdList.innerHTML += `
            <div class="panel-card mb-2" style="padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s ease;">
                <span>Move <strong>${plan.buses}</strong> bus(es)</span>
                <div class="flex-center gap-4">
                    <span class="badge badge-yellow">${plan.from}</span>
                    <i data-lucide="arrow-right" class="text-muted"></i>
                    <span class="badge badge-red">${plan.to}</span>
                    
                    <a href="#" onclick="sendRealtimeEmail('${plan.to}', ${plan.buses}, '${plan.from}', this); event.preventDefault();" class="btn btn-outline" style="padding: 6px 10px; font-size: 0.8rem; margin-left: 16px; border-color: rgba(59, 130, 246, 0.4); color: var(--accent-blue);" title="Send Realtime Email">
                        <i data-lucide="send" style="width: 14px; height: 14px;"></i> Dispatch Email
                    </a>
                </div>
            </div>
        `;
    });

    document.getElementById('sim-fuel-savings').innerText = `₹${aiSystemSysOut.expectedImpact.fuelSavings.toLocaleString()}`;
    document.querySelector('.impact-val.green').innerText = `+${aiSystemSysOut.expectedImpact.efficiencyGain}%`;

    resDiv.style.display = 'block';
    resDiv.style.animation = 'fadeIn 0.5s ease forwards';
    lucide.createIcons();
}

function handleExportPDF() {
    const element = document.getElementById('sim-results');

    // Quick style adjustments to ensure sharp PDF rendering
    const originalBackground = element.style.background;
    const originalColor = element.style.color;
    element.style.background = '#141A29'; // dark theme surface
    element.style.padding = '30px';
    element.style.color = '#FFFFFF';
    element.style.borderRadius = '12px';

    const opt = {
        margin: 0.5,
        filename: `BRTS_AI_Simulation_Directive_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#0B0F19' }, // deep dark base
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        // Reset styles seamlessly
        element.style.background = originalBackground;
        element.style.padding = '';
        element.style.color = originalColor;
        element.style.borderRadius = '';
    });
}

// Module for Realtime Email Dispatch (Python SMTP Backend)
async function sendRealtimeEmail(toRoute, numBuses, fromRoute, btnElement) {
    btnElement.innerHTML = `<i data-lucide="loader" class="spin"></i> Sending...`;
    lucide.createIcons();

    const emailData = {
        to_email: 'patelprince9265@gmail.com',
        subject: `URGENT: Fleet Redistribution Directive - Route ${toRoute}`,
        message: `Control Room [Route ${toRoute}],\n\nPlease immediately divert ${numBuses} buses from Route ${fromRoute} to Route ${toRoute} to manage predicted capacity overflow.\n\nAutomated AI Optimization Engine.`
    };

    try {
        const response = await fetch(`${API_BASE_URL}/send-email`, {
            method: 'POST',
            body: JSON.stringify(emailData),
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (response.ok) {
            btnElement.innerHTML = `<i data-lucide="check-circle" style="color:var(--status-green); width:14px; height:14px;"></i> Dispatched`;
            btnElement.style.borderColor = 'var(--status-green)';
            btnElement.style.color = 'var(--status-green)';
            btnElement.style.pointerEvents = 'none';
            lucide.createIcons();

            alert(`[API SUCCESS] Realtime Fleet Directive successfully executed!\nServer Response: ${result.message}\nSender: applegaming440@gmail.com\nRecipient: patelprince9265@gmail.com\nStatus: Sent securely via Google SMTP!`);
        } else {
            throw new Error(result.message || 'SMTP Backend Failure');
        }

    } catch (e) {
        alert("Failed to deliver real-time email! Error: " + e.message);
        btnElement.innerHTML = `<i data-lucide="alert-triangle" style="width:14px; height:14px;"></i> Failed`;
        lucide.createIcons();
    }
}
