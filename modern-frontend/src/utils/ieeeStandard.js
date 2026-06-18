// IEEE C57.104-2019 Standard Guidelines (Custom Limits)

export const evaluateIEEE = (sample) => {
    const h2 = sample.h2 || 0;
    const ch4 = sample.ch4 || 0;
    const c2h6 = sample.c2h6 || 0;
    const c2h4 = sample.c2h4 || 0;
    const c2h2 = sample.c2h2 || 0;
    const co = sample.co || 0;
    const co2 = sample.co2 || 0;
    
    // Calculate O2/N2 ratio
    let o2_n2 = sample.o2_n2_ratio;
    if (!o2_n2 && sample.o2 && sample.n2) {
        o2_n2 = sample.o2 / sample.n2;
    }
    
    const isSealed = o2_n2 !== undefined && o2_n2 !== null && o2_n2 < 0.2;

    // --- 1. O2/N2 Assessment (Screening Limits - IEEE C57.104-2019) ---
    const limits90 = isSealed ? {
        co: 900, ch4: 90, c2h2: 1, c2h6: 90, c2h4: 50, co2: 9000, h2: 80
    } : {
        co: 500, ch4: 20, c2h2: 2, c2h6: 15, c2h4: 50, co2: 5000, h2: 40
    };

    const limits95 = isSealed ? {
        co: 1100, ch4: 150, c2h2: 2, c2h6: 175, c2h4: 100, co2: 12500, h2: 200
    } : {
        co: 600, ch4: 50, c2h2: 7, c2h6: 40, c2h4: 100, co2: 7000, h2: 90
    };

    let o2Status = 1; // 1: Normal, 3: Warning, 4: Critical
    let screeningExceeded = [];

    const checkScreening = (gasName, val, l90, l95) => {
        if (val > l95) {
            o2Status = 4; // Map 95th percentile to Critical (4)
            if (!screeningExceeded.includes(gasName)) screeningExceeded.push(gasName);
        } else if (val > l90) {
            if (o2Status < 3) o2Status = 3; // Map 90th percentile to Warning (3)
            if (!screeningExceeded.includes(gasName)) screeningExceeded.push(gasName);
        }
    };

    checkScreening('H2', h2, limits90.h2, limits95.h2);
    checkScreening('CH4', ch4, limits90.ch4, limits95.ch4);
    checkScreening('C2H6', c2h6, limits90.c2h6, limits95.c2h6);
    checkScreening('C2H4', c2h4, limits90.c2h4, limits95.c2h4);
    checkScreening('C2H2', c2h2, limits90.c2h2, limits95.c2h2);
    checkScreening('CO', co, limits90.co, limits95.co);
    checkScreening('CO2', co2, limits90.co2, limits95.co2);

    // --- 2. IEEE Condition Limits (Cond.1 to Cond.4) ---
    const condLimits = {
        h2: [100, 700, 1800],
        ch4: [120, 400, 1000],
        c2h2: [1, 9, 35],
        c2h4: [50, 100, 200],
        c2h6: [65, 100, 150],
        co: [350, 570, 1400],
        co2: [2500, 4000, 10000]
    };

    const getCond = (val, limits) => {
        if (val <= limits[0]) return 1;
        if (val <= limits[1]) return 2;
        if (val <= limits[2]) return 3;
        return 4;
    };

    let condStatus = 1;
    let condExceeded = [];
    const checkCond = (gasName, val, limits) => {
        const c = getCond(val, limits);
        if (c > condStatus) condStatus = c;
        if (c > 1) condExceeded.push(`${gasName} (C${c})`);
    };

    checkCond('H2', h2, condLimits.h2);
    checkCond('CH4', ch4, condLimits.ch4);
    checkCond('C2H6', c2h6, condLimits.c2h6);
    checkCond('C2H4', c2h4, condLimits.c2h4);
    checkCond('C2H2', c2h2, condLimits.c2h2);
    checkCond('CO', co, condLimits.co);
    checkCond('CO2', co2, condLimits.co2);

    // --- 3. TDCG Condition ---
    const tdcg = h2 + ch4 + c2h6 + c2h4 + c2h2 + co;
    const tdcgLimits = [720, 1920, 4630];
    const tdcgStatus = getCond(tdcg, tdcgLimits);

    // --- 4. Final Condition (MAX) ---
    const finalCondition = Math.max(o2Status, condStatus, tdcgStatus);

    const meta = {
        1: { label: 'Normal', description: 'Normal operation', color: 'bg-green-100 text-green-700 border-green-200', chartColor: '#22c55e' },
        2: { label: 'Monitor', description: 'Monitor closely', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', chartColor: '#eab308' },
        3: { label: 'Warning', description: 'Elevated gases', color: 'bg-orange-100 text-orange-700 border-orange-200', chartColor: '#f97316' },
        4: { label: 'Critical', description: 'Critical levels', color: 'bg-red-100 text-red-700 border-red-200', chartColor: '#ef4444' }
    };

    return {
        condition: finalCondition,
        o2Status,
        condStatus,
        tdcgStatus,
        tdcg,
        isSealed,
        exceededGases: [...new Set([...screeningExceeded, ...condExceeded.map(g => g.split(' ')[0])])],
        screeningExceeded,
        condExceeded,
        limits90,
        limits95,
        meta: meta[finalCondition]
    };
};

