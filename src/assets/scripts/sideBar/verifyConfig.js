import logStamp from '../util/log.js';
import session from '../topBar/session.js';
import { zafClient } from '../topBar/zafClient.js';

export default (contact) => {
    let err;
    const appSettings = session.zafInfo.settings;
    const contactAttributes = contact.getAttributes();
    console.log(logStamp('Verifying speech analysis. Attributes: '), contactAttributes);

    const attributeValue = (name, defaultValue = '') => 
        contactAttributes[name] ? contactAttributes[name].value : defaultValue;

    // check the presence of credentials and configuration
    const credentials = attributeValue('aid') && attributeValue('sak') && attributeValue('sst');
    const kvsConsumerStarted = attributeValue('kvsTriggerLambdaResult') === 'Success';
    let configAttributeValue = attributeValue('cfg');
    if (credentials && kvsConsumerStarted && configAttributeValue) {
        try {
            let config = JSON.parse(configAttributeValue);
            if (config && config.instanceId && config.region && config.api && config.bucket) {
                // all good
                appSettings.speechAnalysisEnabled = true;
                appSettings.connectInstanceId = config.instanceId;
                appSettings.awsRegion = config.region;
                appSettings.awsGatewayId = config.api;
                appSettings.speechAnalysisAudioBucket = config.bucket;
                localStorage.setItem('vf.sidebar-enable', 'true');
                return;
            }
        } catch (error) {
            err = error;
        }
    } else if (!credentials)
        err = "credentials missing or incomplete"
    else if (!kvsConsumerStarted)
        err = "kvs trigger missing or failed"
    else
        err = "config empty or incomplete"

    // failed - incorrect or missing configuration - disabling speech analysis in this call
    console.error(logStamp("Error in speech analysis configuration: "), err);
    const message = 'Configuration for advanced speech analysis is missing or incomplete.<br/>This feature is turned off for this call.';
    zafClient.invoke('notify', message, 'error', { sticky: true });
    localStorage.setItem('vf.sidebar-enable', 'false');
    appSettings.speechAnalysisEnabled = false;
}
