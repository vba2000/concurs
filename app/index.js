import { getHeight, searchAsset, getTradeTxs } from  "./node.js";
import { getInfo, updateUsersData } from  "./google.js";
import { getConfig } from "./getConfig.js";
const config = getConfig();

const { GOOGLE_URL, NODE_URL, ASSETS_URL, MATCHER, BLOCKS, INTERVAL }  = config;

/**
 * Parse tx list
 */
function getStats(txs, assetA, assetB) {

    function exchangeData(acc, tx) {
        const aPrecision = assetA.precision;
        const bPrecision = assetB.precision;
        const { order1, order2, amount, price } = tx;
        const realPrice = price / 10 ** 8;
        const amountAsset = amount / (10 ** aPrecision);
        const priceAsset = Math.floor(amountAsset * realPrice * 10 ** bPrecision) / 10 ** bPrecision;
        const buyer = order1.orderType === "buy" ? order1.sender : order2.sender;
        const seller = order1.orderType === "buy" ? order2.sender : order1.sender;

        acc[buyer] = acc[buyer] || { amount: 0, price: 0, volume: 0 };
        acc[seller] = acc[seller] || { amount: 0, price: 0, volume: 0 };
        
        acc[buyer].amount += amountAsset;
        acc[seller].amount -= amountAsset;
        acc[buyer].price -= priceAsset;
        acc[seller].price += priceAsset;
        acc[buyer].volume += priceAsset;
        acc[seller].volume += priceAsset;

        return  acc;
    }

    return txs.reduce(exchangeData, {});
}


/**
 * Get concurses
 */
async function getAllConcurses() {
    const concurses = await getInfo(GOOGLE_URL);
    return concurses;
}

/**
 * Update concurs data
 */
async function updateConcursData(concurs, nodeHeight) {
    if (!concurs) {
        return;
    }

    concurs.limit = concurs.limit || concurs._1 || 0;
    const pair = concurs.pair; 
    const [tickerA, tickerB] = pair.split("/");
    const [assetA, assetB] = await searchAsset(ASSETS_URL, [ tickerA, tickerB ]);
    const txs = await getTradeTxs(NODE_URL, MATCHER, concurs.start, Math.min(concurs.end, nodeHeight), assetA, assetB, BLOCKS);
    
    if (txs.length === 0) {
        return;
    }

    const lastPrice = txs[txs.length - 1].price / 10 ** 8; 
    const stats = getStats(txs, assetA, assetB);

    const usersData = Object.entries(stats).map(([id, { amount, price, volume }]) => {
        const pnl = (amount * lastPrice  + price);
        volume = volume;
        return { id, volume, pnl, amount, price, lastPrice };
    }).filter(a => a.volume > concurs.limit).sort((a, b) => b.pnl - a.pnl);
    
    const res = await updateUsersData(GOOGLE_URL, concurs, usersData);
    console.log(concurs.name, 'Update data -', res);
}




async function getStatistics() {
    try {
        const concurses = await getAllConcurses();
        const nodeHeight = await getHeight(NODE_URL);
        let concurs = concurses.find(( { start, end } ) => start && start < nodeHeight && end && end > nodeHeight );
        console.log('Node height:', nodeHeight);
        await updateConcursData(concurs, nodeHeight);
        setTimeout(getStatistics, INTERVAL);
    } catch (error) {
        console.log("Error:", error);
        setTimeout(getStatistics, 1000);
    }
}

function app() {
    getStatistics();
}

app();