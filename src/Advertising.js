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
const scriptCmd = Symbol("b");
const withAmaQueue = Symbol('with Amazon queue (private method)');
const queueForAmazon = Symbol('queue for Amazon (private method)');
const setSlotsBidsSent = Symbol('c');


export default class Advertising {
    constructor(config, plugins = [], onError = () => {}) {
        this.config = config;
        this.slots = {};
        this.outOfPageSlots = {};
        this.plugins = plugins;
        this.onError = onError;
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
        this[executePlugins]('setup');
        const { slots, outOfPageSlots, queue } = this;
        this[setupCustomEvents]();
        await Promise.all([
            Advertising[queueForPrebid](this[setupPrebid].bind(this), this.onError),
            Advertising[queueForGPT](this[setupGpt].bind(this), this.onError),
            Advertising[scriptCmd](this[setupAdCallSync].bind(this))
        ]);
        console.debug("SETUP() - COMPLETED PREBID, GPT AND AMAZON SETUP");
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
        const divIds = queue.map(({ id }) => id);
        // const divIds = ['div-gpt-ad-topbanner', 'div-gpt-ad-bigbox'];
        const selectedSlots = queue.map(({ id }) => slots[id] || outOfPageSlots[id]);
        const selectedSlotsBidStatus = {};
        console.debug("SETUP() - QUEUE", queue);
        console.debug("SETUP() - divIds 1", divIds);
        Advertising[queueForPrebid](
            () =>
                window.pbjs.requestBids({
                    adUnitCodes: divIds,
                    bidsBackHandler() {
                        window.pbjs.setTargetingForGPTAsync(divIds);
                        // Advertising[queueForGPT](() => window.googletag.pubads().refresh(selectedSlots), this.onError);

                        Advertising[scriptCmd](() => {
                          console.debug("SETUP() - PREBID - BIDS FOR QUEUED AD SLOTS");
                          for (let x = 0; x < divIds.length; x++) {
                            window.adCallSyncList[divIds[x]].prebidBidRequest = true;
                          }
                        });
                        window.tempSyncList = Object.entries(window.adCallSyncList);
                        window.syncList = window.tempSyncList.filter((adSlot) => divIds.find(divId => adSlot[0] === divId) >= 0 );
                        if (window.syncList.every((adSlot) => {
                             adSlot.amazonBidRequest && adSlot.prebidBidRequest && !adSlot.adRequestSent
                            })
                        ) {
                          console.debug("SETUP() - PREBID CALLED REFRESH");
                          Advertising[queueForGPT](() => window.googletag.pubads().refresh(selectedSlots), this.onError);
                        }
                    }
                }),
            this.onError
        );

        Advertising[queueForAmazon]('fetchBids', [
          {
            slots: [
              {
                  slotID: 'div-gpt-ad-topbanner',
                  slotName: '/19849159/web-theweathernetwork.com/homepage/div-gpt-ad-topbanner',
                  sizes: [[300, 50], [320, 50]]
                }
              ]
          },
          function(bids) {
            window.googletag.cmd.push(function() {
              window.apstag.setDisplayBids();
                console.debug("SETUP() - AMAZON - BIDS FOR QUEUED AD SLOTS");
                Advertising[scriptCmd](() => {
                  for (let x = 0; x < divIds.length; x++) {
                    window.adCallSyncList[divIds[x]].amazonBidRequest = true;
                  }
              });
              window.tempSyncList = Object.entries(window.adCallSyncList);
              window.syncList = window.tempSyncList.filter((adSlot) => divIds.find(divId => adSlot[0] === divId) >= 0 );

              if (window.syncList.every((divId) => divId.amazonBidRequest && divId.prebidBidRequest && !divId.adRequestSent)) {
                console.debug("SETUP() - AMAZON CALLED REFRESH");
                Advertising[queueForGPT](() => window.googletag.pubads().refresh(selectedSlots), this.onError);
              }
            });
          }
        ]);
    }

    async teardown() {
        this[teardownCustomEvents]();
        await Promise.all([
            Advertising[queueForPrebid](this[teardownPrebid].bind(this), this.onError),
            Advertising[queueForGPT](this[teardownGpt].bind(this), this.onError)
        ]);
        this.slots = {};
        this.gptSizeMappings = {};
        this.queue = {};
    }

    activate(id, customEventHandlers = {}) {
        console.debug("ACTIVE() - CALLED");
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
        Advertising[queueForPrebid](
            () =>
                window.pbjs.requestBids({
                    adUnitCodes: [id],
                    bidsBackHandler() {
                        window.pbjs.setTargetingForGPTAsync([id]);
                          window.adCallSyncList[id].prebidBidRequest = true;
                          console.debug("ACTIVE() - PREBID BID CALLBACK SLOTID '" + id +"'");
                          Advertising[queueForGPT](() => {
                            if (window.adCallSyncList[id].amazonBidRequest && window.adCallSyncList[id].prebidBidRequest && !window.adCallSyncList[id].adRequestSent) {
                              window.googletag.pubads().refresh([slots[id]], this.onError);
                              window.adCallSyncList[id].adRequestSent = true;
                              console.debug("ACTIVE() - PREBID CALLED REFRESH  SLOTID '" + id +"'");
                            }
                          });
                    }
                }),
            this.onError
        );

        Advertising[queueForAmazon]('fetchBids', [
          {
            slots: [
              {
                  slotID: 'div-gpt-ad-topbanner',
                  slotName: '/19849159/web-theweathernetwork.com/homepage/div-gpt-ad-topbanner',
                  sizes: [[300, 50], [320, 50]]
                }
              ]
          },
          function(bids) {
            window.googletag.cmd.push(function() {
              window.apstag.setDisplayBids();
              // if (window.adCallSyncList.hasOwnProperty(id)) {
                window.adCallSyncList[id].amazonBidRequest = true
                console.debug("ACTIVE() - AMAZON BID CALLBACK  SLOTID '" + id +"'");
                Advertising[queueForGPT](() => {
                  if (window.adCallSyncList[id].amazonBidRequest && window.adCallSyncList[id].prebidBidRequest && !window.adCallSyncList[id].adRequestSent) {
                    window.googletag.pubads().refresh([slots[id]]);
                    window.adCallSyncList[id].adRequestSent = true;
                    console.debug("ACTIVE() - AMAZON CALLED REFRESH  SLOTID '" + id +"'");
                  }
                });
              // }
            });
          }
        ]);

        Advertising[scriptCmd](() => {
          if (window.adCallSyncList.hasOwnProperty(id)) {
            window.setTimeout(() => {
              console.debug("ACTIVE() - fallback triggered for '"+ id +"'");
              if (!window.adCallSyncList[id].adRequestSent) {
                console.debug("ACTIVE() - Ad call for slotid '" + id +"' has not been sent");
                Advertising[queueForGPT](() => window.googletag.pubads().refresh([slots[id]]));
                window.adCallSyncList[id].adRequestSent = true;
              }
            }, 2000);
          }
        });
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
      // window.adCallSyncList = new Map();
      // this.config.slots.forEach((slot) => {
      //   window.adCallSyncList.set(slot.id, {
      //         prebidBidRequest: false,
      //         amazonBidRequest: false,
      //         adRequestSent: false
      //   });
      // }
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

    [setupPrebid]() {
        this[executePlugins]('setupPrebid');
        const adUnits = getAdUnits(this.config.slots);
        window.pbjs.addAdUnits(adUnits);
        window.pbjs.setConfig(this.config.prebid);
    }

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

    static [queueForGPT](func, onError) {
        return Advertising[withQueue](window.googletag.cmd, func, onError);
    }

    static [queueForPrebid](func, onError) {
        return Advertising[withQueue](window.pbjs.que, func, onError);
    }

    static [withQueue](queue, func, onError) {
        return new Promise(resolve =>
            queue.push(() => {
                try {
                    func();
                    resolve();
                } catch (error) {
                    onError(error);
                }
            })
        );
    }

    static [queueForAmazon](key, param) {
      if (key === 'init') {
        return Advertising[withAmaQueue](window.apstag.init, param);
      } else {
        return Advertising[withAmaQueue](window.apstag.fetchBids, param);
      }
    }


    static [withAmaQueue](queue, param) {
      return new Promise(resolve => {
          console.log("AD DEBUG", param[0]);
          queue(...param);
          resolve();
      });
    }

    static [scriptCmd](func) {
      return new Promise(resolve => {
        func()
        resolve();
      });
    }
}
