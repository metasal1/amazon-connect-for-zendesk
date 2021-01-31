import logStamp from '../util/log.js';
import session from '../topBar/session.js';

// Update contact attributes 
export default (attributes) => {
    try {
        const awsConnect = new AWS.Connect();
        const params = {
            Attributes: attributes,
            InitialContactId: session.contact.contactId,
            InstanceId: session.zafInfo.settings.connectInstanceId
        };
        awsConnect.updateContactAttributes(params, (err) => {
            // console.log(logStamp('updating contact attributes'), params);
            if (err) 
                console.error(logStamp('attributes were not updated'), err);
        });
    } catch (err) {
        console.error(logStamp('attempted to update contact attributes'), err);
    }
}
