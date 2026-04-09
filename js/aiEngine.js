// AI Engine Module

class AIEngine {
    constructor(data) {
        this.data = data;
        this.FUEL_COST_PER_TRIP = 500; // Expected cost in INR
        this.BUS_RUNNING_COST = 2000;
    }

    // Module 1: Utilization Intelligence
    analyzeRoutes() {
        const routeData = {};
        
        this.data.forEach(record => {
            if (!routeData[record.route_id]) {
                routeData[record.route_id] = { totalPass: 0, totalCap: 0, records: 0, timeSlots: {} };
            }
            routeData[record.route_id].totalPass += record.passengers;
            routeData[record.route_id].totalCap += record.capacity;
            routeData[record.route_id].records++;
            
            // For demand prediction
            if (!routeData[record.route_id].timeSlots[record.time_slot]) {
                routeData[record.route_id].timeSlots[record.time_slot] = { pass: 0, cap: 0, count: 0 };
            }
            routeData[record.route_id].timeSlots[record.time_slot].pass += record.passengers;
            routeData[record.route_id].timeSlots[record.time_slot].cap += record.capacity;
            routeData[record.route_id].timeSlots[record.time_slot].count++;
        });

        const routeMetrics = [];

        for (const [route, stats] of Object.entries(routeData)) {
            const avgUtilizationRow = (stats.totalPass / stats.totalCap) * 100;
            const utilization = Math.round(avgUtilizationRow);
            
            let status = 'Optimal';
            if (utilization < 40) status = 'Underutilized';
            else if (utilization > 75) status = 'Overloaded';

            // Calculate Idle capacity cost
            const avgEmptySeats = Math.max(0, (stats.totalCap - stats.totalPass) / stats.records);
            // Assuming each empty seat wastes proportionate running cost
            const wastedCost = Math.round((avgEmptySeats / (stats.totalCap / stats.records)) * this.BUS_RUNNING_COST);

            routeMetrics.push({
                route,
                utilization,
                status,
                avgEmptySeats,
                wastedDailyCost: wastedCost,
                timeSlots: stats.timeSlots
            });
        }

        return routeMetrics;
    }

    // Module 2 & 12: Predict Peak Demand & Reliability
    predictDemandAndReliability(routeMetrics) {
        const predictions = [];
        let totalSystemReliability = 0;

        routeMetrics.forEach(route => {
            // Find Peak Hour
            let peakSlot = "";
            let maxAvgDemand = 0;
            let varianceCount = 0;

            for (const [slot, data] of Object.entries(route.timeSlots)) {
                const avgDemand = data.pass / data.count;
                if (avgDemand > maxAvgDemand) {
                    maxAvgDemand = avgDemand;
                    peakSlot = slot;
                }
                
                // Simulate demand stability check
                if (Math.abs(avgDemand - (route.utilization/100 * (data.cap/data.count))) > 10) {
                    varianceCount++;
                }
            }
            
            // Reliability Formula: 100 - (Delay% + Overcrowding Penalty + Variance Penalty)
            const baseReliability = 95;
            const delaySim = Math.random() * 5; // 0-5% simulated delay
            const overcrowdPenalty = route.status === 'Overloaded' ? 15 : (route.status === 'Underutilized' ? 5 : 0);
            const demandStability = (varianceCount / Object.keys(route.timeSlots).length) * 10;
            
            const reliabilityScore = Math.round(Math.max(0, baseReliability - delaySim - overcrowdPenalty - demandStability));
            totalSystemReliability += reliabilityScore;

            // Efficiency Score (0-100)
            let efficiencyScore = 100;
            if (route.utilization < 40) efficiencyScore -= (40 - route.utilization) * 1.5;
            if (route.utilization > 75) efficiencyScore -= (route.utilization - 75) * 1.2;
            efficiencyScore = Math.max(0, Math.min(100, Math.round(efficiencyScore)));

            predictions.push({
                ...route,
                nextPeakHour: peakSlot,
                reliabilityScore,
                efficiencyScore
            });
        });

        const sysReliability = Math.round(totalSystemReliability / routeMetrics.length);
        
        return { routesOut: predictions, sysReliability };
    }

    // Module 3 & 7: Fleet Optimization Engine
    runOptimization(analyzedRoutes) {
        const overloaded = analyzedRoutes.filter(r => r.status === 'Overloaded').sort((a,b) => b.utilization - a.utilization);
        const underutilized = analyzedRoutes.filter(r => r.status === 'Underutilized').sort((a,b) => a.utilization - b.utilization);
        
        const recommendations = [];
        const redistributionPlan = [];
        let totalSavings = 0;
        let avgEffIncrease = 0;

        let underIdx = 0;
        overloaded.forEach(overRoute => {
            if (underIdx < underutilized.length) {
                const underRoute = underutilized[underIdx];
                const busesToMove = overRoute.utilization > 90 ? 2 : 1;
                
                recommendations.push({
                    text: `Move ${busesToMove} bus(es) from Route ${underRoute.route} to Route ${overRoute.route}`,
                    type: 'action',
                    classType: 'action-add'
                });
                
                redistributionPlan.push({
                    from: underRoute.route,
                    to: overRoute.route,
                    buses: busesToMove
                });

                totalSavings += underRoute.wastedDailyCost * 0.4; // 40% of wasted cost saved
                avgEffIncrease += Math.random() * 5 + 10; // Simulated 10-15% increase per action

                underIdx++;
            }
        });

        // Module 6: Predictive alerts
        const alerts = [];
        overloaded.forEach(r => alerts.push(`Route ${r.route} likely overcrowded tomorrow during ${r.nextPeakHour}`));
        underutilized.forEach(r => alerts.push(`Route ${r.route} shows consistent underutilization, wasting ₹${r.wastedDailyCost}/day`));

        return {
            recommendations,
            redistributionPlan,
            alerts,
            expectedImpact: {
                efficiencyGain: Math.round(avgEffIncrease / Math.max(1, redistributionPlan.length) + 8),
                fuelSavings: Math.round(totalSavings)
            }
        };
    }
}
