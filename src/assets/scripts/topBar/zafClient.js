// allow ZAF cllient to be used in other modules
let client = {};
const init = () => {
    client = ZAFClient.init();
}

export { client as zafClient, init as zafInit };
