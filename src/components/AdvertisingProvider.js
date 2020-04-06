import React, { Component } from 'react';
import Advertising from '../Advertising';
import PropTypes from 'prop-types';
import AdvertisingConfigPropType from './utils/AdvertisingConfigPropType';
import AdvertisingContext from '../AdvertisingContext';
import equal from 'fast-deep-equal';

export default class AdvertisingProvider extends Component {
    constructor(props) {
        super(props);
        this.initialize();
console.log('AD PROVIDER - CONSTRUCTOR');
        this.state = {
            activate: this.advertising.activate.bind(this.advertising)
        };
    }

    componentDidMount() {
      console.log("AD PROVIDER - COMPONENT DID MOUNT");
        if (this.advertising.isConfigReady() && this.props.active) {
          console.log("AD PROVIDER - COMPONENT DID MOUNT - CALLING SETUP");
            this.advertising.setup();
        }
    }

    async componentDidUpdate(prevProps) {
console.log("AD PROVIDER - DID UPDATE");
        const { config, active } = this.props;
        const isConfigReady = this.advertising.isConfigReady();

        // activate advertising when the config changes from `undefined`
        if (!isConfigReady && config && active) {
console.log("AD PROVIDER - DID UPDATE - 11");
            this.advertising.setup();
            this.advertising.setConfig(config);
        } else if (isConfigReady && !equal(prevProps.config, config)) {
console.log("AD PROVIDER - DID UPDATE -isConfigReady", isConfigReady);
console.log("AD PROVIDER - DID UPDATE - prevProps.config", JSON.stringify(prevProps.config));
console.log("AD PROVIDER - DID UPDATE - config", JSON.stringify(config));
            // teardown the old configuration
            // to make sure the teardown and initialization are in a right sequence, need `await`
            await this.teardown();

            // re-initialize advertising, if it is active
            if (active) {
                this.initialize();
                // eslint-disable-next-line react/no-did-update-set-state
                this.setState({
                    activate: this.advertising.activate.bind(this.advertising)
                });

                if (this.advertising.isConfigReady()) {
                    this.advertising.setup();
                }
            }
        }
    }

    componentWillUnmount() {
        if (this.props.config) {
            this.teardown();
        }
    }

    async teardown() {
        await this.advertising.teardown();
        this.advertising = null;
        this.activate = null;
    }

    initialize() {
        const { config, plugins, onError } = this.props;
        this.advertising = new Advertising(config, plugins, onError);
    }

    render() {
        const { activate } = this.state;
        return <AdvertisingContext.Provider value={activate}>{this.props.children}</AdvertisingContext.Provider>;
    }
}

AdvertisingProvider.propTypes = {
    active: PropTypes.bool,
    config: AdvertisingConfigPropType,
    children: PropTypes.node,
    onError: PropTypes.func,
    plugins: PropTypes.arrayOf(
        PropTypes.shape({
            setupPrebid: PropTypes.func,
            setupGpt: PropTypes.func,
            teardownPrebid: PropTypes.func,
            teardownGpt: PropTypes.func
        })
    )
};

AdvertisingProvider.defaultProps = {
    active: true
};
