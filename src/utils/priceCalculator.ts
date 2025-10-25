// src/utils/priceCalculator.ts

// Interfaces para Type Safety
interface DivisionPrices {
    [key: string]: number;
}

interface LeagueCompletePrices {
    [key: string]: number;
}

interface LPDiscounts {
    [key: string]: number;
}

interface LPGainModifiers {
    [key: string]: number;
}

interface ServerModifiers {
    [key: string]: number;
}

interface RankTranslations {
    [key: string]: string;
}

interface BoostModifiers {
    duoBoost: number;
    priorityBoost: number;
}

// Definición de precios por división
const DIVISION_PRICES: DivisionPrices = {
    iron: 2000,
    bronze: 2000,
    silver: 2500,
    gold: 3500,
    platinum: 4500,
    emerald: 6500,
    diamond: 8500
};

// Definición de precios por liga completa
const LEAGUE_COMPLETE_PRICES: LeagueCompletePrices = {
    iron: 7000,
    bronze: 7000,
    silver: 9000,
    gold: 12500,
    platinum: 15000,
    emerald: 24000,
    diamond: 32000,
    master: 32000,
    grandmaster: 60000
};

// Modificadores por servidor
const SERVER_MODIFIERS: ServerModifiers = {
    'LAS': 1.0,    // Precio base
    'LAN': 1.15,   // 15% más caro
    'BR': 1.15,    // 15% más caro
    'NA': 1.25     // 25% más caro
};

const BOOST_MODIFIERS: BoostModifiers = {
    duoBoost: 1.20,     // +20% para DuoBoost
    priorityBoost: 1.15  // +15% para Priority Boost
};

// Orden de los rangos
export const RANK_ORDER: string[] = [
    'iron', 'bronze', 'silver', 'gold', 'platinum', 
    'emerald', 'diamond', 'master', 'grandmaster', 'challenger'
];

// Traducciones de rangos
export const RANK_TRANSLATIONS: RankTranslations = {
    'hierro': 'iron',
    'bronce': 'bronze',
    'plata': 'silver',
    'oro': 'gold',
    'platino': 'platinum',
    'esmeralda': 'emerald',
    'diamante': 'diamond',
    'maestro': 'master',
    'gran maestro': 'grandmaster',
    'retador': 'challenger'
};

// Descuentos por LP
const LP_DISCOUNTS: LPDiscounts = {
    '0-29': 0,
    '30-59': 0.05,
    '60-99': 0.1
};

// Modificadores de LP ganados por victoria
const LP_GAIN_MODIFIERS: LPGainModifiers = {
    '1-19': 1.35,
    '20-25': 1,
    '26+': 0.95
};

// Función para convertir CLP a USD
export const convertCLPtoUSD = (clpAmount: number): string => {
    const clpWithFee = clpAmount * 1.054;
    const usdAmount = clpWithFee / 1017.25;
    const finalUSD = usdAmount + 0.30;
    const roundedUSD = Math.round(finalUSD * 10) / 10;
    return roundedUSD.toFixed(2);
};

// Funciones auxiliares
const getRankTier = (rankName: string): string => {
    const spanishTier = rankName.toLowerCase().split(' ')[0];
    return RANK_TRANSLATIONS[spanishTier as keyof RankTranslations] || spanishTier;
};

const getRankDivision = (rankName: string): number => {
    const parts = rankName.toLowerCase().split(' ');
    if (parts.length < 2) return 0;
    const division = parts[1];
    return parseInt(division.replace('iv', '4').replace('iii', '3').replace('ii', '2').replace('i', '1'));
};

// Función principal de cálculo de precios
export const calculatePrice = (
    fromRank: string,
    toRank: string,
    lpRange: keyof LPDiscounts,
    selectedLane: string,
    queueType: string,
    server: keyof ServerModifiers = 'LAS',
    lpGain: keyof LPGainModifiers = '20-25',
    championsSelected: boolean = false,
    offlineMode: boolean,
    duoBoost: boolean,
    priorityBoost: boolean = false
): number => {
    const fromTier = getRankTier(fromRank);
    const toTier = getRankTier(toRank);
    const fromDiv = getRankDivision(fromRank);
    const toDiv = getRankDivision(toRank);
    
    let totalPrice = 0;
    const fromIndex = RANK_ORDER.indexOf(fromTier);
    const toIndex = RANK_ORDER.indexOf(toTier);

    // Si es el mismo rango
    if (fromRank === toRank) return 0;

    // Casos especiales para rangos altos
    if (fromTier === 'master' || fromTier === 'grandmaster' || toTier === 'master' || toTier === 'grandmaster' || toTier === 'challenger') {
        if (fromTier === 'master' && toTier === 'grandmaster') {
            totalPrice = 32000;
        } else if (fromTier === 'master' && toTier === 'challenger') {
            totalPrice = 92000;
        } else if (fromTier === 'grandmaster' && toTier === 'challenger') {
            totalPrice = 60000;
        } else {
            if (fromDiv !== 4) {
                const divisionsNeeded = fromDiv;
                totalPrice += divisionsNeeded * DIVISION_PRICES[fromTier];
            } else {
                totalPrice += LEAGUE_COMPLETE_PRICES[fromTier];
            }

            for (let i = fromIndex + 1; i < RANK_ORDER.indexOf('diamond') + 1; i++) {
                totalPrice += LEAGUE_COMPLETE_PRICES[RANK_ORDER[i]];
            }

            if (toTier === 'master') {
                totalPrice += 0;
            } else if (toTier === 'grandmaster') {
                totalPrice += 32000;
            } else if (toTier === 'challenger') {
                totalPrice += 92000;
            }
        }
    } else {
        // Cálculo normal de precios
        if (fromIndex === toIndex) {
            const divisions = fromDiv - toDiv;
            if (divisions > 0) {
                totalPrice += divisions * DIVISION_PRICES[fromTier];
            }
        } else {
            if (fromDiv === 4) {
                totalPrice += LEAGUE_COMPLETE_PRICES[fromTier];
            } else {
                const divisionsNeeded = fromDiv;
                totalPrice += divisionsNeeded * DIVISION_PRICES[fromTier];
            }

            for (let i = fromIndex + 1; i < toIndex; i++) {
                totalPrice += LEAGUE_COMPLETE_PRICES[RANK_ORDER[i]];
            }

            if (toDiv < 4) {
                const remainingDivs = 4 - toDiv;
                totalPrice += remainingDivs * DIVISION_PRICES[toTier];
            }
        }
    }

    // Aplicar descuento por LP actuales
    const lpDiscount = LP_DISCOUNTS[lpRange];
    if (lpDiscount > 0) {
        const firstDivisionPrice = DIVISION_PRICES[fromTier];
        totalPrice -= firstDivisionPrice * lpDiscount;
    }

    // Aplicar modificador por LP gain
    const lpGainModifier = LP_GAIN_MODIFIERS[lpGain];
    totalPrice *= lpGainModifier;

    // Aplicar aumento por línea preferida
    if (selectedLane !== 'none') {
        let laneMultiplier = 1.1; // 10% por defecto
        
        if (selectedLane === 'support') {
            laneMultiplier = queueType === 'soloq' ? 1.25 : 1.15; // 25% para SoloQ, 15% para FlexQ
        }
        
        totalPrice *= laneMultiplier;
    }


    // Aplicar aumento por campeones específicos
    if (championsSelected) {
        totalPrice *= 1.25; // 25% de aumento
    }

    // Aplicar modificador por servidor
    totalPrice *= SERVER_MODIFIERS[server];


    // Aplicar DuoBoost si está activo
    if (duoBoost) {
        totalPrice *= BOOST_MODIFIERS.duoBoost;
    }

    // Aplicar Priority Boost si está activo
    if (priorityBoost) {
        totalPrice *= BOOST_MODIFIERS.priorityBoost;
    }

    return Math.round(totalPrice);
};