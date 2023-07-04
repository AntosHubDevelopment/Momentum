import { promises as fs } from 'fs';
import path from 'path';
import Safety from './safety';
import log from './structs/log';

class Shop {

    public async testModule(loopKey): Promise<boolean> {

        const test = await fetch(`http://api.nexusfn.net/api/v1/shop/random/${Safety.env.MAIN_SEASON}`, {
            method: 'GET',
            headers: {
                'loopkey': loopKey
            }
        })

        await test.json()

        if (test.status == 200) {
            return true;
        } else {
            log.warn("Auto rotate has been disabled as you do not have access to it or some unknown error happened. Please go to https://discord.gg/NexusFN and enter the /purchase command to gain access or if you think this is a mistake then please contact a staff member.");
            return false;
        }

    }

    public async updateShop(loopKey: string): Promise<string[]> {
        const newItems: any[] = [];

        const [shopResponse, catalogString] = await Promise.all([
            fetch(`https://api.nexusfn.net/api/v1/shop/random/${Safety.env.MAIN_SEASON}`, {
                method: 'GET',
                headers: {
                    'loopkey': loopKey
                }
            }),
            fs.readFile(path.join(__dirname, "../../Config/catalog_config.json"), 'utf-8')
        ]);

        if (!shopResponse) return [];

        const shopJSON = await shopResponse.json();
        const dailyItems = shopJSON[0].daily;
        const catalog = JSON.parse(catalogString);

        for (const [i, dailyItem] of dailyItems.entries()) {
            const { shopName, price } = dailyItem;

            catalog[`daily${i + 1}`].price = price;
            catalog[`daily${i + 1}`].itemGrants = [shopName];

            newItems.push(dailyItem);
        }

        for (const [i, featuredItem] of shopJSON[1].featured.entries()) {
            const { shopName, price } = featuredItem;

            catalog[`featured${i + 1}`].price = price;
            catalog[`featured${i + 1}`].itemGrants = [shopName];

            newItems.push(featuredItem);
        }

        await Promise.all([
            fs.writeFile(path.join(__dirname, "../../Config/catalog_config.json"), JSON.stringify(catalog, null, 4)),
            fs.writeFile(path.join(__dirname, "../../responses/catalog.json"), JSON.stringify({ expiration: new Date(new Date().setHours(23, 59, 59, 999)).toISOString() }, null, 4))
        ]);

        return newItems;
    }
}

export default new Shop();
