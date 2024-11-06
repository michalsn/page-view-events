class PageViewEvent {
    // Private properties
    #currentUrl = window.location.href;
    #pageConfig = {};
    #pageConfigAllowedKeys = ['tid', 'lu', 'luid', 'cid', 'ip'];
    #userInfo = null;
    #sendMethod = 'beacon'; // Default to 'beacon'
    #sendJson = false; // Default to 'false'
    #sendUrl = '';

    constructor({ sendOptions = {} }) {
        const { sendMethod, sendJson, sendUrl } = sendOptions;
        this.#sendMethod = sendMethod || this.#sendMethod;
        this.#sendJson = sendJson || this.#sendJson;
        this.#sendUrl = sendUrl || this.#sendUrl;
        this.#pageConfig = {};
        this.#pageConfigAllowedKeys = ['tid', 'lu', 'luid', 'cid', 'ip'];
        this.#userInfo = null;
        this.#currentUrl = window.location.href;
    }

    async init({ initOptions = {} }) {
        const fpPromise = import('https://openfpcdn.io/fingerprintjs/v3')
            .then(FingerprintJS => FingerprintJS.load());

        const fp = await fpPromise;
        this.#userInfo = await fp.get();

        // Apply the initOptions from the config
        for (const key of Object.keys(initOptions)) {
            if (this.#pageConfigAllowedKeys.includes(key)) {
                if (key === 'ip') {
                    this.#pageConfig.visitorIp = initOptions[key];
                } else {
                    this.#pageConfig[key] = initOptions[key];
                }
            }
        }

        // Existing logic for visitor IP retrieval
        if (!this.#pageConfig.hasOwnProperty('visitorIp')) {
            const meta = document.querySelector('meta[name="X-VISITOR-IP"]');
            if (meta) {
                this.#pageConfig.visitorIp = meta.content;
            } else {
                this.#pageConfig.visitorIp = await this.#fetchVisitorIp();
            }
        }
    }

    view() {
        const data = { ...this.#prepareViewData(), ...this.#pageConfig };
        this.#send(this.#sendUrl, data);
    }

    event(target = null, eventType = 'on click') {
        const data = { ...this.#prepareEventData(target, eventType), ...this.#pageConfig };
        this.#send(this.#sendUrl, data);
    }

    #prepareViewData() {
        return {
            visitorId: this.#userInfo.visitorId,
            osCpu: this.#userInfo.components.osCpu.value,
            platform: this.#userInfo.components.platform.value,
            language: this.#userInfo.components.languages.value[0][0],
            userAgent: window.navigator.userAgent,
            currentUrl: this.#getCurrentUrl(),
            referrerUrl: document.referrer,
            timezone: this.#userInfo.components.timezone.value,
            screenResolution: `${this.#userInfo.components.screenResolution.value[0]}x${this.#userInfo.components.screenResolution.value[1]}`,
            screenSize: `${window.screen.availWidth}x${window.screen.availHeight}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            utcDate: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
        };
    }

    #prepareEventData(target, eventType) {
        return {
            ...this.#prepareViewData(),
            eventType,
            xPath: this.#getXPath(target),
        };
    }

    #send(url, data) {
        if (this.#sendMethod === 'beacon' && navigator.sendBeacon) {
            const payload = this.#sendJson ? new Blob([JSON.stringify(data)], { type: 'application/json' }) : JSON.stringify(data);
            navigator.sendBeacon(url, payload);
        } else {
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': this.#sendJson ? 'application/json' : 'text/plain' },
                body: JSON.stringify(data),
                keepalive: true,
            });
        }
    }

    #getXPath(element) {
        if (!element) return '';
        const idx = (sibling, name) => sibling ? idx(sibling.previousElementSibling, name || sibling.localName) + (sibling.localName === name) : 1;
        const segments = el => !el || el.nodeType !== 1
            ? ['']
            : el.id && document.getElementById(el.id) === el
                ? [`id("${el.id}")`]
                : [...segments(el.parentNode), `${el.localName.toLowerCase()}[${idx(el)}]`];
        return segments(element).join('/');
    }

    async #fetchVisitorIp() {
        const response = await fetch('https://ipinfo.io/json');
        const data = await response.json();
        return data.ip;
    }

    #getCurrentUrl() {
        return this.#currentUrl;
    }
}

// Helper to load the library and set up event listeners
const loadPVE = async (config = {}) => {
    // Use pveConfig from HTML if it exists, otherwise use the passed config
    const finalConfig = typeof pveConfig !== 'undefined' ? pveConfig : config;
    const pve = new PageViewEvent(finalConfig);
    await pve.init(finalConfig);
    pve.view();

    document.addEventListener('click', e => pve.event(e.target), true);
};

// Initialize script based on document readiness
if (document.readyState !== 'loading') {
    setTimeout(() => loadPVE(), 1);
} else {
    document.addEventListener('DOMContentLoaded', () => loadPVE());
}