import logStamp from './log.js';

export default async (client) => {
    const data = await client.get('instances').catch((err) => { 
        console.error(logStamp("couldn't get list of instances: "), err);
        return null;
    });

    const instances = data.instances;
    // console.log(logStamp('All instances: '), instances);
    if (!instances)
        return null;

    const instanceGuid = Object.keys(instances).find((guid) => instances[guid].location === 'top_bar');
    if (!instanceGuid)
        return null;

    const topBarInstance = client.instance(instanceGuid);
    return topBarInstance;
}