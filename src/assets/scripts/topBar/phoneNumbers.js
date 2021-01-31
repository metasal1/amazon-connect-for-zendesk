import session from './session.js';

const trunkPrefixes = {
    noPrefix: ['+56','+420','+45','+372','+30','+39','+371','+352','+356','+377','+977','+47','+968','+48','+351','+378','+34','+598','+65'],
    twoDigit: ['+52','+976','+36']
};

const dialableNumber = (number) => {
    // based on https://en.wikipedia.org/wiki/Trunk_prefix
    
    if (!number) return null;
    
    number = number.replace(/[ \.\(\)-]/g, '');
    const prefix = session.zafInfo.settings.defaultCountryPrefix;
    if (prefix && !number.startsWith('+')) {
        let cutoff = 1;
        if (trunkPrefixes.noPrefix.includes(prefix)) cutoff = 0;
        if (trunkPrefixes.twoDigit.includes(prefix)) cutoff = 2;
        // special case for China: drop 0 for landlines, keep 1 for mobiles
        if (prefix === '+86' && !number.startsWith('0')) cutoff = 0;
        number = prefix + number.substring(cutoff);
    }
    
    return number;
}

export { dialableNumber };