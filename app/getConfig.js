import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const configPath = process.env.CONFIG || './data/config.json';

export function getConfig() {
    try {
        const configRaw = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configRaw);
        return config;
    } catch(e) {
    console.error("Can't get config!!! \n", e);
        throw new Error('Config error', e);
    }
}