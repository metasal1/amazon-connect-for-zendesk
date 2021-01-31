import { zafClient } from './zafClient.js';
import logStamp from '../util/log.js';

export default async (ticketId, changes) => {
    const data = await zafClient.request({
        url: `/api/v2/tickets/${ticketId}.json`,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            ticket: changes
        })
    }).catch((err) => { console.error(logStamp('Error while updating ticket'), err) });

    if (data && data.ticket)
        console.log(logStamp(`Updated ticket ${data.ticket.id} with: `), changes);
}