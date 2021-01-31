const getElementById = (id) => {
    // console.log('!document: ', !document);
    if (!document) return;
    return document.getElementById(id);
}

export default {

    show: (id, showAs = 'block') => {
        const el = getElementById(id);
        // console.log(`making ${id} visible`, el);
        if (el) el.style.display = showAs;
    },

    hide: (id) => {
        const el = getElementById(id);
        // console.log(`hiding ${id}`, el);
        if (el) el.style.display = 'none';
    },

    enable: (id, enabled = true) => {
        const el = getElementById(id);
        // console.log(`enabling ${id}`, el);
        if (el) el.disabled = !enabled;
    },

    getText: (elementId) => {
        const el = getElementById(elementId);
        if (el)
            return el.value || el.innerText;
    },

    setText: (elementId, text) => {
        const el = getElementById(elementId);
        if (el) {
            if (['TEXTAREA', 'INPUT'].includes(el.tagName))
                el.value = text;
            else
                el.innerText = text;
        }
    },

    swapImage: (imageId, newUrl) => {
        const el = getElementById(imageId);
        if (el)
            el.src = newUrl;
    },

    onClick: (elementId, handler) => {
        const el = getElementById(elementId);
        if (el)
            el.addEventListener('click', handler);
    },

    focus: (elementId) => {
        const el = getElementById(elementId);
        if (el)
            setTimeout(() => {
                el.focus();
            }, 0);
    }

}