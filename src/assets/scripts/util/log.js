const signature = 'vf';

export default (message) => {
    const today = new Date();
    const time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}.${today.getMilliseconds()}`;
    return `[${signature}@${time}]: ${message}`;
}