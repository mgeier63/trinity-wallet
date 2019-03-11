import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withI18n } from 'react-i18next';

import { enableYubikey2FA, randomBytes } from 'libs/crypto';

import { set2FAStatusYubikey } from 'actions/settings';
import { setPassword } from 'actions/wallet';
import { generateAlert } from 'actions/alerts';

import { getSelectedAccountMeta } from 'selectors/accounts';

import Button from 'ui/components/Button';
import Password from 'ui/components/modal/Password';
import Confirm from 'ui/components/modal/Confirm';

import { applyYubikeyMixinDesktop } from 'libs/yubikey/YubikeyMixinDesktop';

import { str2bytes } from '../../../../../shared/libs/yubikey/YubikeyUtil';
import { YUBIKEY_STATE } from '../../../../../shared/libs/yubikey/YubikeyApi';

import css from './twoFa.scss';

const PROV_STATE = {
    PREPROVISIONED: 'preprov',
    UNPROVISIONED: 'unprov',
    CONFIRM_PROVISIONING: 'confirm',
    PASSWORD_FOR_ENABLE: 'password_enable',
    PASSWORD_FOR_DISABLE: 'password_disable',
    ENABLED: 'enabled',
};

/**
 * Yubikey authentication settings container
 */
class TwoFAYubikey extends React.Component {
    static propTypes = {
        /** @ignore */
        is2FAEnabledYubikey: PropTypes.bool.isRequired,
        /** @ignore */
        yubikeySlot: PropTypes.number.isRequired,
        /** @ignore */
        set2FAStatusYubikey: PropTypes.func.isRequired,
        /** @ignore */
        generateAlert: PropTypes.func.isRequired,
        /** @ignore */
        onChildClosed: PropTypes.func.isRequired,
        /** @ignore */
        currentAccountMeta: PropTypes.object,
        /** @ignore */
        t: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        this.passwordConfirmHashed = null;

        this.state = {
            provState: props.is2FAEnabledYubikey ? PROV_STATE.ENABLED : null,
        };

        this.yubikeyTask = null;
        applyYubikeyMixinDesktop(this, props.yubikeySlot);
        if (props.is2FAEnabledYubikey) {
            this.doCheckYubikey();
        }
    }

    componentDidMount() {
        const { provState } = this.state;

        if (provState === null) {
            this.doCheckYubikey();
        }
    }

    onDisabled = () => {
        this.props.onChildClosed();
    };

    doStartYubikeyWithCallback = (callback) => {
        this.yubikeyTask = callback;
        this.doStartYubikey();
    };

    doCheckYubikey = () => {
        const { yubikeyState } = this.state;
        const { is2FAEnabledYubikey } = this.props;
        if (!is2FAEnabledYubikey && yubikeyState === YUBIKEY_STATE.INACTIVE) {
            this.doStartYubikeyWithCallback(this.yubikeyProvisionCheck);
        }
    };

    doCancel = () => {
        const { is2FAEnabledYubikey } = this.props;

        if (is2FAEnabledYubikey) {
            this.setState({
                provState: PROV_STATE.ENABLED,
            });
            return;
        }

        this.props.onChildClosed();
    };

    async doWithYubikey(yubikeyApi, postResultDelayed) {
        await this.yubikeyTask(yubikeyApi)
            .then((runLast) => {
                postResultDelayed(async () => {
                    if (runLast) {
                        runLast();
                    }
                });
            })
            .finally((this.yubikeyTask = null));
    }

    yubikeyProvisionCheck = async (yubikeyApi) => {
        try {
            await yubikeyApi.doChallengeResponse(str2bytes('dummy')); //check if this Yubikey is provisioned for Hmac challenge response
            this.setState({
                provState: PROV_STATE.PREPROVISIONED,
            });
        } catch (err) {
            this.setState({
                provState: PROV_STATE.UNPROVISIONED,
            });
        }
    };

    startYubikeyProvision = async () => {
        this.doStartYubikeyWithCallback(this.doProvisionYubikey);
    };

    doProvisionYubikey = async (yubikeyApi) => {
        const { generateAlert, t } = this.props;

        const secret = randomBytes(20, 0xff);
        try {
            await yubikeyApi.doProgramHmacCR(secret);
            return () => {
                this.doCheckYubikey();
            };
        } catch (err) {
            //console.warn('Yubikey Programming failed, retrying once, usually this works :-(');
            try {
                await yubikeyApi.doProgramHmacCR(secret);
                return () => {
                    this.doCheckYubikey();
                };
            } catch (err) {
                generateAlert('error', t('yubikey:yubikeyError'), t('yubikey:yubikeyErrorExplanation', { error: err }));
                return () => {
                    this.doCancel();
                };
            }
        }
    };

    startSetupYubikey2FA = async (password) => {
        this.passwordConfirmHashed = password;
        this.doStartYubikeyWithCallback(this.doSetupYubikey2FA);
    };

    startRemoveYubikey2FA = async (password) => {
        this.passwordConfirmHashed = password;
        this.doStartYubikeyWithCallback(this.doRemoveYubikey2FA);
    };

    doSetupYubikey2FA = async (yubikeyApi) => {
        return await this.doEnableYubikey2FA(yubikeyApi, true);
    };

    doRemoveYubikey2FA = async (yubikeyApi) => {
        return await this.doEnableYubikey2FA(yubikeyApi, false);
    };

    doEnableYubikey2FA = async (yubikeyApi, enable) => {
        const { password, currentAccountMeta, set2FAStatusYubikey, setPassword, generateAlert, t } = this.props;

        try {
            if (enable) {
                const challengeResponseHashed = await this.doChallengeResponseThenSaltedHash(
                    this.passwordConfirmHashed,
                );

                try {
                    await enableYubikey2FA(
                        currentAccountMeta,
                        this.passwordConfirmHashed,
                        challengeResponseHashed,
                        true,
                    );
                    setPassword(challengeResponseHashed);
                    return () => {
                        set2FAStatusYubikey(true);
                        generateAlert('success', t('twoFA:twoFAEnabled'), t('twoFA:twoFAEnabledExplanation'));
                        this.passwordConfirmHashed = null;
                        this.setState({
                            provState: PROV_STATE.ENABLED,
                        });
                    };
                } catch (err) {
                    this.passwordConfirmHashed = null;
                    this.setState({
                        provState: PROV_STATE.PASSWORD_FOR_ENABLE,
                    });
                    generateAlert(
                        'error',
                        t('changePassword:incorrectPassword'),
                        t('changePassword:incorrectPasswordExplanation'),
                    );
                    return null;
                }
            } else {
                //disable
                if (this.passwordConfirmHashed === false) {
                    //edge case, user entered empty password
                    this.passwordConfirmHashed = null;
                    this.setState({
                        provState: PROV_STATE.PASSWORD_FOR_DISABLE,
                    });
                    generateAlert(
                        'error',
                        t('changePassword:incorrectPassword'),
                        t('changePassword:incorrectPasswordExplanation'),
                    );
                    return null;
                }

                const challengeResponseHashed = await this.doChallengeResponseThenSaltedHash(
                    this.passwordConfirmHashed,
                );

                try {
                    await enableYubikey2FA(
                        currentAccountMeta,
                        challengeResponseHashed,
                        this.passwordConfirmHashed,
                        false,
                    );
                    setPassword(password);
                    return () => {
                        set2FAStatusYubikey(false);
                        generateAlert('success', t('twoFA:twoFADisabled'), t('twoFA:twoFADisabledExplanation'));
                        this.onDisabled();
                    };
                } catch (err) {
                    this.passwordConfirmHashed = null;
                    this.setState({
                        provState: PROV_STATE.PASSWORD_FOR_DISABLE,
                    });
                    generateAlert(
                        'error',
                        t('changePassword:incorrectPassword'),
                        t('changePassword:incorrectPasswordExplanation'),
                    );
                    return null;
                }
            }
        } catch (err) {
            //console.error(err);
            generateAlert('error', t('yubikey:yubikeyError'), t('yubikey:yubikeyErrorExplanation', { error: err }));
            this.doCancel();
        }
    };

    render() {
        const { provState } = this.state;
        const { t, yubikeySlot } = this.props;
        if (provState === PROV_STATE.ENABLED) {
            return (
                <form className={css.twoFa}>
                    <h1>{t('yubikey:enabled')}</h1>
                    <h2>{t('yubikey:enabledExplanation')}</h2>
                    <p />
                    <Button
                        onClick={() => {
                            this.setState({ provState: PROV_STATE.PASSWORD_FOR_DISABLE });
                        }}
                        variant="primary"
                    >
                        {t('global:disable')}
                    </Button>
                </form>
            );
        }

        //!isYubikey2FAEnabled
        return (
            <form className={css.twoFa}>
                <Confirm
                    category="primary"
                    isOpen={provState === PROV_STATE.UNPROVISIONED}
                    onCancel={() => this.doCancel()}
                    onConfirm={() => this.setState({ provState: PROV_STATE.CONFIRM_PROVISIONING })}
                    content={{
                        title: t('yubikey:notProvisioned'),
                        message: t('yubikey:notProvisionedExplanation', { slot: yubikeySlot }),
                        confirm: t('yubikey:configure'),
                        cancel: t('cancel'),
                    }}
                />
                <Confirm
                    category="primary"
                    isOpen={provState === PROV_STATE.CONFIRM_PROVISIONING}
                    onCancel={() => this.doCancel()}
                    onConfirm={() => this.startYubikeyProvision()}
                    content={{
                        title: t('yubikey:confirmProvisioning'),
                        message: t('yubikey:confirmProvisioningExplanation', { slot: yubikeySlot }),
                        confirm: t('yubikey:program'),
                        cancel: t('cancel'),
                    }}
                />
                <Confirm
                    category="primary"
                    isOpen={provState === PROV_STATE.PREPROVISIONED}
                    onCancel={() => this.setState({ provState: PROV_STATE.PASSWORD_FOR_ENABLE })}
                    onConfirm={() => this.startYubikeyProvision()}
                    content={{
                        title: t('yubikey:preProvisioned'),
                        message: t('yubikey:preProvisionedExplanation', { slot: yubikeySlot }),
                        confirm: t('yubikey:replaceExistingConfiguration'),
                        cancel: t('yubikey:useExistingConfiguration'),
                    }}
                />
                <Password
                    isOpen={provState === PROV_STATE.PASSWORD_FOR_ENABLE}
                    onSuccess={(password) => this.startSetupYubikey2FA(password)}
                    onClose={() => this.doCancel()}
                    content={{
                        title: t('enterPassword'),
                        confirm: t('enable'),
                    }}
                />
                <Password
                    isOpen={provState === PROV_STATE.PASSWORD_FOR_DISABLE}
                    onSuccess={(password) => this.startRemoveYubikey2FA(password)}
                    onClose={() => this.doCancel()}
                    content={{
                        title: t('enterPassword'),
                        confirm: t('disable'),
                    }}
                    forceNoYubikeyAndNoAuthCheck
                />
            </form>
        );
    }
}

const mapStateToProps = (state) => ({
    is2FAEnabledYubikey: state.settings.is2FAEnabledYubikey,
    yubikeySlot: state.settings.yubikeySlot,

    password: state.wallet.password,
    wallet: state.wallet,
    currentAccountMeta: getSelectedAccountMeta(state),
});

const mapDispatchToProps = {
    set2FAStatusYubikey,
    setPassword,
    generateAlert,
};

export default connect(mapStateToProps, mapDispatchToProps)(withI18n()(TwoFAYubikey));
