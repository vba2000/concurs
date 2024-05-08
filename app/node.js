import fetch from "node-fetch";
import fs from "fs";

const assetsStore = {};

export async function getHeight(node_url) {
    const nodeHeight = (await fetch(`${node_url}blocks/height`).then(res => res.json())).height;
    return nodeHeight;
}

export async function searchAsset(service_url, tickers = [], limit=2) {
    const assets = [];
    for (let ticker of tickers) {
        if (!assetsStore[ticker]) {
            const search_url = `${service_url}?search=${ticker}&limit=${limit}&label=*`;
            const search_res = await fetch(search_url).then(res => res.json());
            const res = search_res.data.find(asset => asset.data.ticker === ticker);
            assetsStore[ticker] = res.data
        }

        assets.push(assetsStore[ticker]);
    }

    return assets;
}


export async function getBlocks(NODE_URL, from, to, limit=5, blocksPath) {
    if (!fs.existsSync(blocksPath)) {
        fs.mkdirSync(blocksPath);
    }

    const restoreBlockFrom = from;
    const restoreBlockTo = Math.max(to - 10, from);
    const blocks = [];

    for (let i = restoreBlockFrom; i < restoreBlockTo; i += 1) {
        if (fs.existsSync(`${blocksPath}/${i}.json`)) {
            let block = JSON.parse(fs.readFileSync(`${blocksPath}/${i}.json`));
            blocks.push(block);
            from = i + 1;
        }
    }

    for (let i = from; i < to; i += limit) {
        console.log('Fetch block', i, 'to', i + limit - 1);
        const blocks_url = `${NODE_URL}blocks/seq/${i}/${i + limit - 1}`;
        const blocks_res = await fetch(blocks_url).then(res => res.json());
        blocks.push(...blocks_res);
        blocks_res.forEach(block => {
            fs.writeFileSync(`${blocksPath}/${block.height}.json`, JSON.stringify(block));
        });
        await new Promise(executor => setTimeout(executor, 100));
    }

    return blocks;
}

export async function getTradeTxs(NODE_URL, MATCHER, start, end, assetA, assetB, blocksPath) {
    console.log('Get blocks from:', start, "to:", end);
    const blocks = await getBlocks(NODE_URL, start, end, 5, blocksPath);
    const allTxs = blocks.reduce((acc, block) => {
        acc = [...acc, ...block.transactions];
        return acc;
    }, []);
    const txs = [];
    allTxs.forEach(tx => {
            const { height, type, order1, order2, sender } = tx;
    
            if (type !== 7) {
                return;
            }

            let { amountAsset, priceAsset } = order1.assetPair;
            amountAsset = amountAsset || 'WAVES';
            priceAsset = priceAsset || 'WAVES';
            
            if (height < start) {
                return;
            } else if (height > end) {
                return;
            } else if (MATCHER !== sender) {
                return;
            }


            if (amountAsset === assetA.id && priceAsset === assetB.id) {
                txs.push(tx);
            }
        });

        return txs;
}