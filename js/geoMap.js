class FleetDigitalTwin {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = {};
        this.routes = {};
        this.busStates = [];
        this.animationInterval = null;

        // Ahmedabad rough coordinates
        this.baseCoords = [23.0225, 72.5714];
        // Exact geo-coordinates routed to dynamically respect Sabarmati River bridges (Pruned to remove U-Turn glitches)
        this.mockPaths = {
            'RTO - Maninagar': [[23.0664, 72.5818], [23.0655, 72.5802], [22.9972, 72.6023]], // RTO -> Subhash Bridge -> Maninagar
            'Iskcon - Naroda': [[23.0289, 72.5065], [23.0240, 72.5739], [23.0673, 72.6534]], // Iskcon -> Ellis Bridge -> Naroda
            'Bopal - Shivranjani': [[23.0333, 72.4633], [23.0249, 72.5284]], // Bopal -> Shivranjani
            'Narol - Naroda': [[22.9856, 72.5898], [23.0673, 72.6534]], // Narol -> Naroda
            'Zundal - Visat': [[23.1118, 72.5786], [23.0906, 72.5821]] // Zundal -> Visat
        };
    }

    init() {
        if (this.map) return;
        
        this.map = L.map(this.containerId).setView(this.baseCoords, 13);
        
        // CartoDB Dark Matter tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
            maxZoom: 19
        }).addTo(this.map);

        this.generateRealStreetPolylines();
    }

    async generateRealStreetPolylines() {
        // Draw baseline straight segments instantly to ensure immediate UI feedback
        Object.keys(this.mockPaths).forEach(routeId => {
            const polyline = L.polyline(this.mockPaths[routeId], {
                color: 'rgba(59, 130, 246, 0.4)',
                weight: 4,
                opacity: 0.8
            }).addTo(this.map);
            this.routes[routeId] = polyline;
        });

        const delay = ms => new Promise(res => setTimeout(res, ms));

        // Asynchronously fetch Organic Google-Maps style precision street meshes
        for (const routeId of Object.keys(this.mockPaths)) {
            const points = this.mockPaths[routeId];
            // OSRM expects Longitude,Latitude
            const coordString = points.map(p => `${p[1]},${p[0]}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    // Convert GeoJSON [lon,lat] back to Leaflet [lat,lon]
                    const actualStreets = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                    
                    // Hot-swap math
                    this.mockPaths[routeId] = actualStreets;
                    
                    // Remove old geometric abstraction & attach organic curves
                    if (this.routes[routeId]) {
                        this.map.removeLayer(this.routes[routeId]);
                    }
                    
                    const newPolyline = L.polyline(actualStreets, {
                        color: 'rgba(59, 130, 246, 0.7)',
                        weight: 4,
                        opacity: 0.9,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }).addTo(this.map);
                    this.routes[routeId] = newPolyline;
                }
            } catch (e) {
                console.warn(`OSRM Real-Routing gracefully degraded for ${routeId}`);
            }
            // Safely respect OSRM's public rate limit without crashing
            await delay(500); 
        }
    }

    getPointExact(routeId, factor) {
        const path = this.mockPaths[routeId];
        if (!path) return this.baseCoords;
        
        const totalSegments = path.length - 1;
        let scaled = factor * totalSegments;
        let index = Math.floor(scaled);
        if (index >= totalSegments) {
            index = totalSegments - 1;
            scaled = totalSegments;
        }
        if (index < 0) index = 0;
        
        const subFactor = scaled - index;
        const p1 = path[index];
        const p2 = path[index + 1];
        
        return [
            p1[0] + (p2[0] - p1[0]) * subFactor,
            p1[1] + (p2[1] - p1[1]) * subFactor
        ];
    }

    updateMarkers(analyzedRoutesData) {
        if (!this.map) return;
        
        if(this.animationInterval) clearInterval(this.animationInterval);

        Object.values(this.markers).forEach(m => this.map.removeLayer(m));
        this.markers = {};
        this.busStates = [];

        analyzedRoutesData.forEach((routeData) => {
            let colorClass = 'green';
            let iconPulse = '';
            if (routeData.status === 'Overloaded') {
                colorClass = 'red';
                iconPulse = 'pulse';
            } else if (routeData.status === 'Underutilized') {
                colorClass = 'yellow';
            }

            const markerHtml = `
                <div class="map-bus-marker ${colorClass} ${iconPulse}">
                    <i data-lucide="bus"></i>
                </div>
            `;
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: markerHtml,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const busesCount = routeData.status === 'Overloaded' ? 3 : (routeData.status === 'Underutilized' ? 1 : 2);
            
            for(let i=0; i<busesCount; i++) {
                const initFactor = Math.random();
                const pos = this.getPointExact(routeData.route, initFactor);
                const marker = L.marker(pos, { icon: customIcon }).addTo(this.map);
                
                marker.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif;">
                        <h4 style="margin: 0 0 4px 0; color: var(--text-primary); font-size: 14px;">Route ${routeData.route} Bus</h4>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 12px;">Status: <span class="${colorClass}">${routeData.status}</span></p>
                        <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 12px;">Util: ${routeData.utilization}%</p>
                    </div>
                `);

                const mId = `${routeData.route}_${i}`;
                this.markers[mId] = marker;
                
                this.busStates.push({
                    id: mId,
                    route: routeData.route,
                    factor: initFactor,
                    speed: 0.005 + (Math.random() * 0.005)
                });
            }
        });
        
        this.startLiveFeed();
        
        setTimeout(() => {
            if(window.lucide) window.lucide.createIcons();
        }, 100);
    }
    
    startLiveFeed() {
        this.animationInterval = setInterval(() => {
            this.busStates.forEach(bus => {
                bus.factor += bus.speed;
                if(bus.factor >= 1) bus.factor = 0;
                const newPos = this.getPointExact(bus.route, bus.factor);
                const marker = this.markers[bus.id];
                if(marker) marker.setLatLng(newPos);
            });
        }, 1000);
    }
    
    resize() {
        if(this.map) {
            this.map.invalidateSize();
        }
    }
}
