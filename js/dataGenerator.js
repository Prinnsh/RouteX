// Module 9: Data Handling - Demo Dataset Generation

function generateDemoData(numRecords = 3000) {
    const routes = ['R1', 'R2', 'R3', 'R4', 'R5', 'R8', 'R9', 'R10', 'R12'];
    const timeSlots = Array.from({length: 16}, (_, i) => `${i + 6}:00`); // 6:00 to 21:00
    
    // AI Rules for synthetic data realism
    const routeProfiles = {
        'R5': { demand: 'high', overutilized: true },
        'R8': { demand: 'high', overutilized: true },
        'R12': { demand: 'low', underutilized: true },
        'R10': { demand: 'low', underutilized: true },
        'R3': { demand: 'medium', underutilized: false },
        'default': { demand: 'medium', underutilized: false }
    };

    const dataset = [];
    const baseDate = new Date();
    
    for (let i = 0; i < numRecords; i++) {
        const route = routes[Math.floor(Math.random() * routes.length)];
        const profile = routeProfiles[route] || routeProfiles['default'];
        
        const capacity = profile.demand === 'high' ? 80 : 50; // Bus capacity based on route
        const bus_id = `B${Math.floor(Math.random() * 50) + 1}`;
        const time_slot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        
        // Simulate peak hours (8-10 AM and 5-7 PM)
        const hour = parseInt(time_slot.split(':')[0]);
        const isPeakHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
        
        let passengers;
        if (profile.demand === 'high') {
            passengers = isPeakHour ? Math.floor(Math.random() * 30 + capacity * 0.8) : Math.floor(Math.random() * 40 + 30);
        } else if (profile.demand === 'low') {
            passengers = isPeakHour ? Math.floor(Math.random() * 20 + 20) : Math.floor(Math.random() * 15 + 5);
        } else {
            passengers = isPeakHour ? Math.floor(Math.random() * 40 + 40) : Math.floor(Math.random() * 30 + 15);
        }
        
        // Ensure passengers don't go wildly over capacity realistically
        passengers = Math.min(passengers, capacity + 30); // Max standing

        dataset.push({
            route_id: route,
            bus_id: bus_id,
            capacity: capacity,
            passengers: passengers,
            time_slot: time_slot,
            trip_number: `T${1000 + i}`,
            date: baseDate.toISOString().split('T')[0]
        });
    }
    
    return dataset;
}
