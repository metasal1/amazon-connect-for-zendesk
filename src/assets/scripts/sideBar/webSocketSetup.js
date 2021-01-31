import logStamp from '../util/log.js';

//below function is required for signed url and aws authentication
const getSignedUrl = (host, path, region, credentials) => {
    const getSignatureKey = (key, date, region, service) => {
        const kDate = AWS.util.crypto.hmac('AWS4' + key, date, 'buffer');
        const kRegion = AWS.util.crypto.hmac(kDate, region, 'buffer');
        const kService = AWS.util.crypto.hmac(kRegion, service, 'buffer');
        const kCredentials = AWS.util.crypto.hmac(kService, 'aws4_request', 'buffer');
        return kCredentials;
    };

    const datetime = AWS.util.date.iso8601(new Date()).replace(/[:\-]|\.\d{3}/g, '');
    const date = datetime.substr(0, 8);

    const method = 'GET';
    const protocol = 'wss';
    const uri = path;
    const service = 'execute-api';
    const algorithm = 'AWS4-HMAC-SHA256';

    const credentialScope = date + '/' + region + '/' + service + '/' + 'aws4_request';
    let canonicalQuerystring = 'X-Amz-Algorithm=' + algorithm;
    canonicalQuerystring += '&X-Amz-Credential=' + encodeURIComponent(credentials.accessKeyId + '/' + credentialScope);
    canonicalQuerystring += '&X-Amz-Date=' + datetime;
    canonicalQuerystring += '&X-Amz-Security-Token=' + encodeURIComponent(credentials.sessionToken);
    canonicalQuerystring += '&X-Amz-SignedHeaders=host';

    const canonicalHeaders = 'host:' + host + '\n';
    const payloadHash = AWS.util.crypto.sha256('', 'hex')
    const canonicalRequest = method + '\n' + uri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\nhost\n' + payloadHash;

    const stringToSign = algorithm + '\n' + datetime + '\n' + credentialScope + '\n' + AWS.util.crypto.sha256(canonicalRequest, 'hex');
    const signingKey = getSignatureKey(credentials.secretAccessKey, date, region, service);
    const signature = AWS.util.crypto.hmac(signingKey, stringToSign, 'hex');

    canonicalQuerystring += '&X-Amz-Signature=' + signature;

    const requestUrl = protocol + '://' + host + uri + '?' + canonicalQuerystring;
    return requestUrl;
};

let ws = {};

const sendMessage = (action, contactId, connectionId) => {
    const message = {
        action: action,
        data: `conndId@${connectionId}|contactId@${contactId}`
    }
    ws.send(JSON.stringify(message));
    // console.log(logStamp('Message is sent:'), message);
}

export default (wsHost, region, contactId, processText) => {
    if ("WebSocket" in window) {
        const url = document.createElement('a');
        url.href = wsHost;
        const sigv4 = getSignedUrl(url.hostname, url.pathname, region, AWS.config.credentials)
        ws = new WebSocket(sigv4);
        let transcriptFragment = [];
        let startNewFragment;

        // Let us open a web socket
        ws.onopen = (event) => {
            // Web Socket is connected, send data using send() to get the connectionId
            // console.log(logStamp('Connection opened: '), event);
            sendMessage('newcall', '1234', '1234');
            // console.log(logStamp('Connected to Websocket...'));
        };

        ws.onmessage = async (event) => {
            // console.log(logStamp('ws message received'), event);
            if (event.data.includes("connectionId")) {
                const data = JSON.parse(event.data);
                const connectionId = data.connectionId;
                startNewFragment = true;
                // console.log(logStamp('sending new connection id:'), connectionId);
                sendMessage('sendmessage', contactId, connectionId);
                return;
            } else {
                // transcript fragment coming from ws connection
                const dataParts = event.data.split('@');
                const text = dataParts[0];
                const isComplete = dataParts[1] === 'false';
                const currentSegId = dataParts[2];
                const isAgent = dataParts[3] === 'a';
                // if (isComplete)
                //     console.log(logStamp(isAgent ? 'Agent: ' : 'Customer: '), text);

                if (startNewFragment) {
                    const transcriptClass = isAgent ? "agent-row" : "customer-row";
                    transcriptFragment = [
                        `<div class="transcript-row ${transcriptClass}"><div id="transSpan${currentSegId}">`,
                        '</div></div>'
                    ];
                    localStorage.setItem('vf.transcript-fragment', transcriptFragment.join(''));
                    startNewFragment = false;
                }
                if (isComplete && transcriptFragment.length) {
                    await processText(text, transcriptFragment, !isAgent);
                    startNewFragment = true;
                }
                localStorage.setItem('vf.transcript-span', JSON.stringify({ segment: currentSegId, text }));
            }
        };

        ws.onclose = (event) => {
            // websocket is closed.
            console.log(logStamp('Connection is closed...'), event);
            if (event.code == 1006 && !event.wasClean) {
                console.warn(logStamp('Connection is closed due to connectivity issue'));
            }
            ws = {};
        };
        
    } else {
        // The browser doesn't support WebSocket
        console.error(logStamp('WebSocket is NOT supported by your Browser!'));
    }
    
    return ws;
}

