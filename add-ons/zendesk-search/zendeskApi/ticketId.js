const { init, queryZendesk } = require('./api');
const { httpStatus, returnType } = require('./constants');
const { commonTicketFields, copiedFields } = require('./returningFields');

const ticketId = async (event) => {
    const { Parameters } = event.Details;
    if (!Parameters.zendesk_ticket) return { status_code: httpStatus.badRequest };

    const webClient = init();
    if (!webClient) return { status_code: httpStatus.serverError };

    const query = `/api/v2/tickets/${Parameters.zendesk_ticket}.json`;
    const ticket = await queryZendesk(webClient, query, returnType.ticket);
    if (!ticket) return { status_code: httpStatus.serverError };
    if (ticket === httpStatus.notFound) {
        return { 
            status_code: httpStatus.notFound,
            ...copiedFields(Parameters.cary_on, Parameters)
        };
    }
    
    return {
        status_code: httpStatus.ok,
        ...commonTicketFields(ticket),
        ...copiedFields(Parameters.cary_on, Parameters)
    };
};

module.exports = ticketId;
