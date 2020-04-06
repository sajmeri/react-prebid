import getAdUnits from './utils/getAdUnits';

const defineGptSizeMappings = Symbol('define GTP size mappings (private method)');
const getGptSizeMapping = Symbol('get GPT size mapping (private method)');
const defineSlots = Symbol('define slots (private method)');
const defineOutOfPageSlots = Symbol('define out of page slots (private method)');
const displaySlots = Symbol('display slots (private method)');
const displayOutOfPageSlots = Symbol('display slots (private method)');
const setupPrebid = Symbol('setup Prebid (private method)');
const teardownPrebid = Symbol('teardown Prebid (private method)');
const setupGpt = Symbol('setup GPT (private method)');
const teardownGpt = Symbol('teardown GPT (private method)');
const setupCustomEvents = Symbol('setup custom events (private method)');
const setupCustomEvent = Symbol('setup custom event (private method)');
const teardownCustomEvents = Symbol('teardown custom events (private method)');
const withQueue = Symbol('with queue (private method)');
const queueForGPT = Symbol('queue for GPT (private method)');
const queueForPrebid = Symbol('queue for Prebid (private method)');
const setDefaultConfig = Symbol('set default config (private method)');
const executePlugins = Symbol('execute plugins (private method)');

const setupAdCallSync = Symbol("a");
// const setupAmazon = Symbol('setup Amazon TAM (private method)');
// const withAmaQueue = Symbol('with Amazon queue (private method)');
// const queueForAmazon = Symbol('queue for Amazon (private method)');
// const sendAdServeRequest = Symbol('Send ad requests to GAM');

export default class Advertising {
    constructor(config, plugins = []) {
        this.config = config;
        this.slots = {};
        this.outOfPageSlots = {};
        this.plugins = plugins;
        this.gptSizeMappings = {};
        this.customEventCallbacks = {};
        this.customEventHandlers = {};
        this.queue = [];

        if (config) {
            this[setDefaultConfig]();
        }
    }

    // ---------- PUBLIC METHODS ----------

    async setup() {
console.log("AD DEBUG SETUP - IN FRUNCTION");
        this[executePlugins]('setup');
        const { slots, outOfPageSlots, queue } = this;
        this[setupCustomEvents]();
        await Promise.all([
            Advertising[queueForPrebid](this[setupPrebid].bind(this)),
            Advertising[queueForGPT](this[setupGpt].bind(this)),
            Advertising[queueForGPT](this[setupAdCallSync].bind(this))
            // Advertising[queueForAmazon]('init', [this[setupAmazon].bind(this)])
        ]);

console.log("AD DEBUG SETUP cont 1 - bids sent", this.bidsSent);
console.log("AD DEBUG SETUP cont 2 - this.config.slots", this.config.slots);
console.log("AD DEBUG SETUP cont 3 - queue", queue);
        if (queue.length === 0) {
            return;
        }
        for (const { id, customEventHandlers } of queue) {
            Object.keys(customEventHandlers).forEach(customEventId => {
                if (!this.customEventCallbacks[customEventId]) {
                    this.customEventCallbacks[customEventId] = {};
                }
                return (this.customEventCallbacks[customEventId][id] = customEventHandlers[customEventId]);
            });
        }
console.log("AD DEBUG SETUP cont 4 - CALLED.");
        const divIds = queue.map(({ id }) => id);
        const selectedSlots = queue.map(({ id }) => slots[id] || outOfPageSlots[id]);
console.log("AD DEBUG SETUP - SELECTED SLOTS ", selectedSlots);
        Advertising[queueForPrebid](() =>
            window.pbjs.requestBids({
                adUnitCodes: divIds,
                bidsBackHandler() {
                    window.pbjs.setTargetingForGPTAsync(divIds);
                    // Advertising[queueForGPT](() => window.googletag.pubads().refresh(selectedSlots))
                    // window.setupPrebidSent = true;
                    // window.setupAmazonSent && window.setupPrebidSent && !window.setupAdRequestSent
                    //     ? Advertising[queueForGPT](() => window.googletag.pubads().refresh(selectedSlots))
                    //     : null;
                    // window.setupAdRequestSent = window.setupPrebidSent && window.setupAmazonSent;


                    // Advertising[sendAdServeRequest](selectedSlots);
                }
            })
        );

        // Advertising[queueForAmazon]('fetchBids', [
        //     {
        //         slots: [
        //             {
        //                 slotID: 'div-gpt-ad-topbanner',
        //                 slotName: '/19849159/web-theweathernetwork.com/homepage/div-gpt-ad-topbanner',
        //                 sizes: [[300, 50], [320, 50]]
        //             }
        //         ]
        //     },
        //     function(bids) {
        //         window.googletag.cmd.push(function() {
        //             window.apstag.setDisplayBids();
        //             Advertising[queueForGPT](() => window.googletag.pubads().refresh([slots[id]]))
        //
        //             // window.setupAmazonSent = true;
        //             // window.setupPrebidSent && window.setupAmazonSent && !window.setupAdRequestSent
        //             //     ? Advertising[queueForGPT](() => window.googletag.pubads().refresh([slots[id]]))
        //             //     : null;
        //             // window.setupAdRequestSent = window.setupPrebidSent && window.setupAmazonSent;
        //
        //             // this.amazon = true;
        //             // Advertising[sendAdServeRequest](selectedSlots);
        //         });
        //     }
        // ]);
        // Advertising[queueForAmazon](() => Advertising[sendAdServeRequest](selectedSlots))
    }

    async teardown() {
        this[teardownCustomEvents]();
console.log("AD DEBUG TEARDOWN CALLED.");
        await Promise.all([
            Advertising[queueForPrebid](this[teardownPrebid].bind(this)),
            Advertising[queueForGPT](this[teardownGpt].bind(this))
        ]);
        this.slots = {};
        this.gptSizeMappings = {};
        this.queue = {};
    }

    activate(id, customEventHandlers = {}) {

console.log("AD DEBUG ACTIVATE CALLED - IN FUNCTION - id: ", id);
        const { slots } = this;
        if (Object.values(slots).length === 0) {
            this.queue.push({ id, customEventHandlers });
            return;
        }
        Object.keys(customEventHandlers).forEach(customEventId => {
            if (!this.customEventCallbacks[customEventId]) {
                this.customEventCallbacks[customEventId] = {};
            }
            return (this.customEventCallbacks[customEventId][id] = customEventHandlers[customEventId]);
        });
console.log("AD DEBUG ACTIVATE CALLED cont 1 - slots ", slots);
console.log("AD DEBUG ACTIVATE CALLED cont 2 - id.", id);
        Advertising[queueForPrebid](() =>
            window.pbjs.requestBids({
                adUnitCodes: [id],
                bidsBackHandler() {
                    window.pbjs.setTargetingForGPTAsync([id]);
                    Advertising[queueForGPT](() => window.adCallSyncList[slots[id]].prebidBidRequest = true);
                    Advertising[queueForGPT](() => window.googletag.pubads().refresh([slots[id]]));

                    // window.prebidSent = true;
                    // window.amazonSent && window.prebidSent && !window.adRequestSent
                    //     ? Advertising[queueForGPT](() => window.googletag.pubads().refresh([slots[id]]))
                    //     : null;
                    // window.adRequestSent = window.prebidSent && window.amazonSent;

                    // Advertising[queueForGPT](() => window.googletag.pubads().refresh([slots[id]]));
                }
            })
        );

        // Advertising[queueForAmazon]('fetchBids', [
        //     {
        //         slots: [
        //             {
        //                 slotID: 'div-gpt-ad-topbanner',
        //                 slotName: '/19849159/web-theweathernetwork.com/homepage/div-gpt-ad-topbanner',
        //                 sizes: [[300, 50], [320, 50]]
        //             }
        //         ]
        //     },
        //     function(bids) {
        //         window.googletag.cmd.push(function() {
        //             window.apstag.setDisplayBids();
        //             Advertising[queueForGPT](() => window.googletag.pubads().refresh([slots[id]]))
        //             // window.amazonSent = true;
        //             // window.prebidSent && window.amazonSent && !window.adRequestSent
        //             //     ? Advertising[queueForGPT](() => window.googletag.pubads().refresh([slots[id]]))
        //             //     : null;
        //             // window.adRequestSent = window.prebidSent && window.amazonSent;
        //
        //             // this.amazon = true;
        //             // Advertising[sendAdServeRequest](selectedSlots);
        //         });
        //     }
        // ]);
    }

    isConfigReady() {
        return Boolean(this.config);
    }

    setConfig(config) {
        this.config = config;
        this[setDefaultConfig]();
    }

    // ---------- PRIVATE METHODS ----------

    [setupAdCallSync]() {
      window.adCallSyncList = {};
      this.config.slots.forEach((slot) => {
        window.adCallSyncList[slot.id] = {
          prebidBidRequest: false,
          amazonBidRequest: false,
          adRequestSent: false
        };
      });
    }

    [setupCustomEvents]() {
        if (!this.config.customEvents) {
            return;
        }
        Object.keys(this.config.customEvents).forEach(customEventId =>
            this[setupCustomEvent](customEventId, this.config.customEvents[customEventId])
        );
    }

    [setupCustomEvent](customEventId, { eventMessagePrefix, divIdPrefix }) {
        const { customEventCallbacks } = this;
        this.customEventHandlers[customEventId] = ({ data }) => {
            if (typeof data !== 'string' || !data.startsWith(`${eventMessagePrefix}`)) {
                return;
            }
            const divId = `${divIdPrefix || ''}${data.substr(eventMessagePrefix.length)}`;
            const callbacks = customEventCallbacks[customEventId];
            if (!callbacks) {
                return;
            }
            const callback = callbacks[divId];
            if (callback) {
                callback();
            }
        };
        window.addEventListener('message', this.customEventHandlers[customEventId]);
    }

    [teardownCustomEvents]() {
        if (!this.config.customEvents) {
            return;
        }
        Object.keys(this.config.customEvents).forEach(customEventId =>
            window.removeEventListener('message', this.customEventHandlers[customEventId])
        );
    }

    [defineGptSizeMappings]() {
        if (!this.config.sizeMappings) {
            return;
        }
        for (const [key, value] of Object.entries(this.config.sizeMappings)) {
            const sizeMapping = window.googletag.sizeMapping();
            for (const { viewPortSize, sizes } of value) {
                sizeMapping.addSize(viewPortSize, sizes);
            }
            this.gptSizeMappings[key] = sizeMapping.build();
        }
    }

    [getGptSizeMapping](sizeMappingName) {
        return sizeMappingName && this.gptSizeMappings[sizeMappingName] ? this.gptSizeMappings[sizeMappingName] : null;
    }

    [defineSlots]() {
        this.config.slots.forEach(({ id, path, collapseEmptyDiv, targeting = {}, sizes, sizeMappingName }) => {
            const slot = window.googletag.defineSlot(path || this.config.path, sizes, id);

            const sizeMapping = this[getGptSizeMapping](sizeMappingName);
            if (sizeMapping) {
                slot.defineSizeMapping(sizeMapping);
            }

            if (collapseEmptyDiv && collapseEmptyDiv.length && collapseEmptyDiv.length > 0) {
                slot.setCollapseEmptyDiv(...collapseEmptyDiv);
            }

            for (const [key, value] of Object.entries(targeting)) {
                slot.setTargeting(key, value);
            }

            slot.addService(window.googletag.pubads());

            this.slots[id] = slot;
        });
    }

    [defineOutOfPageSlots]() {
        if (this.config.outOfPageSlots) {
            this.config.outOfPageSlots.forEach(({ id }) => {
                const slot = window.googletag.defineOutOfPageSlot(this.config.path, id);
                slot.addService(window.googletag.pubads());
                this.outOfPageSlots[id] = slot;
            });
        }
    }

    [displaySlots]() {
        this[executePlugins]('displaySlots');
        this.config.slots.forEach(({ id }) => {
            window.googletag.display(id);
        });
    }

    [displayOutOfPageSlots]() {
        this[executePlugins]('displayOutOfPageSlot');
        if (this.config.outOfPageSlots) {
            this.config.outOfPageSlots.forEach(({ id }) => {
                window.googletag.display(id);
            });
        }
    }

    // [sendAdServeRequest](selectedSlots) {
    //   if (this.prebid /*&& this.amazon*/ && !this.adserverRequestSent) {
    //     this.adserverRequestSent = true;
    //     Advertising[queueForGPT](() => window.googletag.pubads().refresh(selectedSlots));
    //   }
    // }

    [setupPrebid]() {
        this[executePlugins]('setupPrebid');
        const adUnits = getAdUnits(this.config.slots);
        window.pbjs.addAdUnits(adUnits);
        window.pbjs.setConfig(this.config.prebid);
    }

    // [setupAmazon]() {
    //     return {
    //         pubID: '3392',
    //         adServer: 'googletag'
    //     };
    // }

    [teardownPrebid]() {
        this[executePlugins]('teardownPrebid');
        getAdUnits(this.config.slots).forEach(({ code }) => window.pbjs.removeAdUnit(code));
    }

    [setupGpt]() {
        this[executePlugins]('setupGpt');
        const pubads = window.googletag.pubads();
        const { targeting } = this.config;
        this[defineGptSizeMappings]();
        this[defineSlots]();
        this[defineOutOfPageSlots]();
        for (const [key, value] of Object.entries(targeting)) {
            pubads.setTargeting(key, value);
        }
        pubads.disableInitialLoad();
        pubads.enableSingleRequest();

        window.googletag.enableServices();
        this[displaySlots]();
        this[displayOutOfPageSlots]();
    }

    [teardownGpt]() {
        this[executePlugins]('teardownGpt');
        window.googletag.destroySlots();
    }

    [setDefaultConfig]() {
        if (!this.config.prebid) {
            this.config.prebid = {};
        }
        if (!this.config.metaData) {
            this.config.metaData = {};
        }
        if (!this.config.targeting) {
            this.config.targeting = {};
        }
    }

    [executePlugins](method) {
        for (const plugin of this.plugins) {
            const func = plugin[method];
            if (func) {
                func.call(this);
            }
        }
    }

    static [queueForGPT](func) {
        return Advertising[withQueue](window.googletag.cmd, func);
    }

    static [queueForPrebid](func) {
        return Advertising[withQueue](window.pbjs.que, func);
    }

    // static [queueForAmazon](key, param) {
    //     if (key === 'init') {
    //         return Advertising[withAmaQueue](window.apstag.init, param);
    //     }
    //     return Advertising[withAmaQueue](window.apstag.fetchBids, param);
    // }

    // static [withAmaQueue](queue, param) {
    //     return new Promise(resolve => {
    //         console.log("AD DEBUG", param[0]);
    //         queue(...param);
    //         resolve();
    //     });
    // }

    static [withQueue](queue, func) {
        return new Promise(resolve =>
            queue.push(() => {
                func();
                resolve();
            })
        );
    }
}
