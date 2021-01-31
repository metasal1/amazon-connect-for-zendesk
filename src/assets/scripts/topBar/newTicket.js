import { zafClient } from './zafClient.js';
import session from './session.js';
import logStamp from '../util/log.js';
import ui from './ui.js';

const noRequester = '(New user will be created)';

const setRequesterName = (name) => {
    ui.setText('newTicketRequester', name || noRequester);
}

const createUser = async () => {
    console.log(logStamp('Creating new user in Zendesk'));
    const appSettings = session.zafInfo.settings;
    const name = appSettings.userName || `new user at ${session.phoneNo}`; 
    const data = await zafClient.request({
        url: '/api/v2/users.json',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            user: {
                name: name,
                phone: session.phoneNo
            }
        })
    }).catch((err) => err);

    if (data.user) {
        console.log(logStamp('New user created'), data);
        session.user = data.user;
        setRequesterName(appSettings.userName || session.phoneNo);
    } else {
        console.error(logStamp('Error creating new user: '), data);
    }
}

export default {

    setRequesterName,
    createUser,

    refreshUser: async (type, id) => {
        ui.enable('attachToCurrentBtn', type === 'ticket');
        if (type === 'other') return;

        // search in existing tab stash
        let requester = session.visitedTabs[type.substring(0, 1) + id];
        if (!requester) {
            // if not found, create a new entry
            requester = { name: noRequester };
            let requesterKey; 
            let userId = id;
            if (id) {
                if (type === 'ticket') {
                    const data = await zafClient.request({
                        url: `/api/v2/tickets/${id}.json`,
                        type: 'GET',
                        contentType: 'application/json',
                    }).catch((err) => { console.error(logStamp('refreshUser'), err); });
                    if (!data) return;
                    requesterKey = `t${id}`;
                    userId = data.ticket.requester_id;
                }
                const data = await zafClient.request({
                    url: `/api/v2/users/${userId}.json`,
                    type: 'GET',
                    contentType: 'application/json',
                }).catch((err) => { console.error(logStamp('refreshUser'), err); });
                if (!data) return;
                requesterKey = requesterKey || `u${userId}`;
                requester.id = id;
                requester.user = data.user;
                requester.name = data.user.name;
                session.visitedTabs[requesterKey] = requester;
            }
        }
        if (requester.user) {
            session.user = requester.user;
            if (type === 'ticket')
                session.ticketId = id;
        }

        setRequesterName(requester.name);
    },

    createTicket: async () => {

        // create new user on the fly if necessary
        if (!session.user)
            await createUser();
        if (!session.user)
            return null;

        const user = session.user;
        const ticket = {
            via_id: session.outbound ? 46 : 45,
            subject: `${session.outbound ? 'Outgoing call to' : 'Incoming call from'} ${user.name}`,
            requester_id: user.id || session.zenAgentId,
            submitter_id: session.zenAgentId,
            assignee_id: session.zenAgentId,
            comment: {
                body: `Ticket created by an ${session.outbound ? 'outgoing call to' : 'incoming call from'} ${user.name}`,
                public: false
            }
        };
        console.log(logStamp('creating ticket: '), ticket);

        const data = await zafClient.request({
            url: `/api/v2/channels/voice/tickets.json`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                // display_to_agent: session.zenAgentId,
                ticket
            })
        }).catch((err) => { console.error(logStamp('createTicket'), err); });
        console.log(logStamp('ticket created: '), data);
        return data && data.ticket ? data.ticket.id : null;
    }
}