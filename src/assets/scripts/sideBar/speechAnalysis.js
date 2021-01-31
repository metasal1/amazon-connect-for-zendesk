import logStamp from '../util/log.js';
import session from '../topBar/session.js';
import ui from './ui.js';
import verifyConfig from './verifyConfig.js';
import updateContactAttributes from './updateAttributes.js';
import webSocketSetup from './webSocketSetup.js';

let appSettings = {};

let ws;
let entireTranscript = '';
let transcriptHtml = '';
let customerTranscript = '';
let contactId = null;

const clearState = () => {
    entireTranscript = '';
    transcriptHtml = '';
    customerTranscript = '';
    contactId = null;
}

const processText = async (text, transcriptFragment, fromCustomer) => {
    const customerLanguage = (appSettings.customerLanguage || 'en').toLowerCase();
    transcriptHtml += transcriptFragment.join(text);
    session.transcriptHtml = transcriptHtml;

    if (fromCustomer) {
        customerTranscript += text + ' ';
        await getOverallSentiment(customerLanguage, false);
    }

    entireTranscript += text + ' ';
    const keyPhrases = await getKeyPhrasesPromise(entireTranscript, customerLanguage).catch((err) => {
        console.error(logStamp('detectKeyPhrases'), err, err.stack); 
        return null;
    });
    if (keyPhrases)
        ui.updateKeyPhrases(keyPhrases, appSettings.subdomain);

    const entities = await getEntitiesPromise(text, customerLanguage).catch(err => {
        console.error(logStamp('detectEntities'), err, err.stack); 
        return null;
    });
    if (entities)
        ui.updateEntities(entities, text);
}

// -------- Comprehension ----------
// For Voice, run comprehension on the customer language.
const getKeyPhrasesPromise = (text, language) => {
    const comprehend = new AWS.Comprehend();
    const params = {
        LanguageCode: language,
        Text: text.trim()
    };
    return new Promise((resolve, reject) => {
        comprehend.detectKeyPhrases(params, (err, data) => {
            if (err) reject(err);
            else {
                // console.log(logStamp('Comprehend keyPhrases: '), data);
                resolve(data);
            }
        });
    });
}

const getEntitiesPromise = (text, language) => {
    const comprehend = new AWS.Comprehend();
    const params = {
        LanguageCode: language,
        Text: text
    };

    return new Promise((resolve, reject) => {
        comprehend.detectEntities(params, (err, data) => {
            if (err) reject(err)
            else resolve(data);
        });
    });
}

const detectSentimentPromise = (params) => {
    const comprehend = new AWS.Comprehend();
    // console.log(logStamp('Comprehend params: '), params);

    return new Promise((resolve, reject) => {
        comprehend.detectSentiment(params, (err, data) => {
            if (err) reject(err)
            else resolve(data);
        });
    });
}

const getOverallSentiment = async (language, endOfCall) => {
    if (AWS.config.credentials) {
        const text = customerTranscript.trim();
        if (text.length > 0) {
            const data = await detectSentimentPromise({
                LanguageCode: language,
                Text: text
            }).catch((err) => {
                console.error(logStamp('detectSentiment'), err);
                return {};
            });
            if (!data.Sentiment)
                console.warn(logStamp('sentiment not returned'), data);
            else {
                if (endOfCall)
                    callCompleted(data)
                else
                    localStorage.setItem('vf.refresh-sentiment', JSON.stringify(data));
            }
        }
    } else if (endOfCall) {
        resetTabs();
        clearState();
    }
}

const writeTranscriptToS3 = (transcript) => {
    try {
        const S3 = new AWS.S3({ params: { Bucket: `${appSettings.speechAnalysisAudioBucket}/transcripts` } });
        const params = {
            Key: contactId + ".txt",
            ContentType: 'text/plain',
            Body: transcript,
        };
        S3.upload(params, (err) => {
            if (err)
                console.error(logStamp('Uploading file to S3'), err);
            else {
                // console.log(logStamp('File successfully uploaded.--> '), contactId);
            }
        });
    } catch (err) {
        console.error(logStamp('Uploading file to S3'), err);
    }
}

const resetTabs = () => {
    entireTranscript = '';
    ui.session.clear();
    localStorage.setItem('vf.content-clear', contactId);
}

const callCompleted = (data) => {
    ui.session.conversationSentiment = data;
    // console.log(logStamp('detected sentiment'), data);

    const newSentiment = data.Sentiment.toLowerCase().replace(/\b(\w)/g, (s) => s.toUpperCase());
    // console.log(logStamp('new sentiment'), newSentiment);
    const sentimentScore = data.SentimentScore[newSentiment].toFixed(2);
    const region = appSettings.awsRegion;
    const bucketName = appSettings.speechAnalysisAudioBucket;

    const attributes = {
        // add analysis related details
        transcriptLocation: `https://s3-${region}.amazonaws.com/${bucketName}/transcripts/${contactId}.txt`,
        customerSentiment: newSentiment,
        customerSentimentScore: sentimentScore,
        zendesk_agent: session.zenAgentId.toString()
    }
    updateContactAttributes(attributes);

    // console.log(logStamp('Writing into S3'));
    writeTranscriptToS3(entireTranscript);

    let speechAnalysisHtml = '';
    const appendParts = appSettings.speechAnalysis.split(',').map((part) => part.toLowerCase().trim());
    if (appendParts.includes('comprehend'))
        speechAnalysisHtml += ui.getComprehendHtml();
    if (appendParts.includes('sentiment'))
        speechAnalysisHtml += ui.getSentimentHtml();
    if (appendParts.includes('transcript'))
        speechAnalysisHtml += ui.getTranscriptHtml(transcriptHtml);

    if (speechAnalysisHtml.trim().length > 0) {
        // console.log(logStamp('assembled speech analysis'));
        session.speechAnalysisHtml = speechAnalysisHtml;
    } else
        console.warn(logStamp('speech analysis is blank, nothing to append'));

    resetTabs();
    clearState();
}

export default {

    verifyConfig,

    sessionOpen: (contact) => {
        appSettings = session.zafInfo.settings;
        const attributes = contact.getAttributes();
        // console.log(logStamp('attempting to establish websocket connection'));

        contactId = contact.contactId;
        const region = appSettings.awsRegion;

        try {
            AWS.config.update({
                accessKeyId: attributes.aid.value,
                secretAccessKey: attributes.sak.value,
                sessionToken: attributes.sst.value,
                region: region
            });
            const webSocketUrl = `wss://${appSettings.awsGatewayId}.execute-api.${region}.amazonaws.com/Prod`;
            AWS.config.credentials.get((err) => {
                if (err)
                    console.error(logStamp('getting AWS credentials'), err);
                else {
                    // console.log(logStamp('kicking off websocket setup on'), webSocketUrl);
                    ws = webSocketSetup(webSocketUrl, region, contactId, processText);
                    // console.log(logStamp('websocket setup success'));
                }
            });
        } catch (err) {
            console.error(logStamp('updating AWS config'), err);
        }

    },

    sessionClose: async () => {
        // Reset websocket after call has ended
        try {
            // update the ticket with sentinment analysis
            const customerLanguage = (appSettings.customerLanguage || 'en').toLowerCase();
            await getOverallSentiment(customerLanguage, true);
        } catch (err) {
            console.error(logStamp('sessionClose'), err);
        }

        //close the websockets
        if (ws.close) {
            try {
                console.log(logStamp('closing websockets'));
                ws.close();
                // console.log(logStamp('closed websockets'));
            } catch (err) {
                console.error(logStamp('closing websockets'), err);
            }
        }
    },

    updateTicketAttribute: (ticketId) => {
        updateContactAttributes({ zendesk_ticket: ticketId });
    }

}