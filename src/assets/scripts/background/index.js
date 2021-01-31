import getTopBarInstance from '../util/topBarInstance.js';
import logStamp from '../util/log.js';

window.onload = () => {
    // console.log(logStamp('background/index.js: background loaded'));
    const client = ZAFClient.init();
    client.context().then((context) => {
        // console.log(logStamp("background ZAFClient initialised, context: "), context);
        getTopBarInstance(client)
            .then((topBar) => topBar.invoke('preloadPane'))
            .catch((err) => console.error(logStamp("couldn't invoke top bar preloading"), err));
    });
}