import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { set2FAStatusYubikey } from 'shared-modules/actions/settings';
import { setPassword } from 'shared-modules/actions/wallet';
import { getRandomBytes } from 'libs/crypto';
import { enableYubikey2FA, hash } from 'libs/keychain';
import { generateAlert } from 'shared-modules/actions/alerts';
import { connect } from 'react-redux';
import { withNamespaces } from 'react-i18next';
import Fonts from 'ui/theme/fonts';
import { Styling } from 'ui/theme/general';
import { width, height } from 'libs/dimensions';
import { Icon } from 'ui/theme/icons';
import { leaveNavigationBreadcrumb } from 'libs/bugsnag';
import { str2bytes } from 'shared-modules/libs/yubikey/YubikeyUtil';
import { YUBIKEY_STATE } from 'shared-modules/libs/yubikey/YubikeyApi';
import { applyYubikeyMixinMobile } from 'libs/yubikey/YubikeyMixinMobile';
import CustomTextInput from 'ui/components/CustomTextInput';
import DualFooterButtons from '../../components/DualFooterButtons';
import { navigator } from 'libs/navigation';
import { getThemeFromState } from 'shared-modules/selectors/global';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topWrapper: {
        flex: 0.3,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: height / 16,
        width,
    },
    midWrapper: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    bottomWrapper: {
        flex: 0.3,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    promptHeader: {
        fontFamily: Fonts.secondary,
        fontSize: Styling.fontSize5,
        textAlign: 'center',
        backgroundColor: 'transparent',
        margin: height / 15,
    },
    promptExplanation: {
        fontFamily: Fonts.secondary,
        fontSize: Styling.fontSize4,
        textAlign: 'center',
        backgroundColor: 'transparent',
        margin: height / 15,
    },
    infoText: {
        fontSize: Styling.fontSize3,
        textAlign: 'center',
        paddingTop: height / 60,
        backgroundColor: 'transparent',
        paddingBottom: height / 16,
    },
    infoTextLight: {
        fontFamily: Fonts.tertiary,
        fontSize: Styling.fontSize3,
        backgroundColor: 'transparent',
    },
});

const PROV_STATE = {
    PREPROVISIONED: 'preprov',
    UNPROVISIONED: 'unprov',
    CONFIRM_PROVISIONING: 'confirm',
    PASSWORD_FOR_ENABLE: 'password_enable',
    PASSWORD_FOR_DISABLE: 'password_disable',
};

/** Two factor authentication setup component */
export class TwoFactorSetupYubikey extends Component {
    static propTypes = {
        /** Component ID */
        componentId: PropTypes.string.isRequired,
        /** @ignore */
        theme: PropTypes.object.isRequired,
        /** @ignore */
        generateAlert: PropTypes.func.isRequired,
        /** @ignore */
        t: PropTypes.func.isRequired,
        /** @ignore */
        password: PropTypes.object.isRequired,
        /** @ignore */
        is2FAEnabledYubikey: PropTypes.bool.isRequired,
        /** @ignore */
        yubikeySlot: PropTypes.number.isRequired,
        /** @ignore */
        yubikeyAndroidReaderMode: PropTypes.bool.isRequired,
        /** @ignore */
        set2FAStatusYubikey: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        this.passwordConfirmHashed = null;

        this.goBack = this.goBack.bind(this);

        this.state = {
            provState: props.is2FAEnabledYubikey ? PROV_STATE.PASSWORD_FOR_DISABLE : null,
            password: '',
        };

        this.yubikeyTask = null;
        applyYubikeyMixinMobile(this, props.yubikeySlot, props.yubikeyAndroidReaderMode);
        if (props.is2FAEnabledYubikey) {
            this.doCheckYubikey();
        }
    }

    componentDidMount() {
        const { is2FAEnabledYubikey } = this.props;
        leaveNavigationBreadcrumb(is2FAEnabledYubikey ? 'Disable2FAYubikey' : 'TwoFactorSetupYubikey');
        const { provState } = this.state;

        if (provState === null) {
            this.doCheckYubikey();
        }
    }

    onDisabled = () => {
        const { generateAlert, t } = this.props;
        navigator
            .pop(this.props.componentId)
            .then(
                setTimeout(
                    () => generateAlert('success', t('twoFA:twoFADisabled'), t('twoFA:twoFADisabledExplanation')),
                    500,
                ),
            );
    };

    onEnabled = () => {
        const { generateAlert, t } = this.props;
        navigator
            .pop(this.props.componentId)
            .then(
                setTimeout(
                    () => generateAlert('success', t('twoFA:twoFAEnabled'), t('twoFA:twoFAEnabledExplanation')),
                    500,
                ),
            );
    };

    doStartYubikeyWithCallback = (callback) => {
        this.yubikeyTask = callback;
        this.doStartYubikey();
    };

    doCheckYubikey = () => {
        const { is2FAEnabledYubikey } = this.props;
        const { yubikeyState } = this.state;
        if (!is2FAEnabledYubikey && yubikeyState === YUBIKEY_STATE.INACTIVE) {
            this.doStartYubikeyWithCallback(this.yubikeyProvisionCheck);
        }
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

        const secret = await getRandomBytes(20);

        try {
            await yubikeyApi.doProgramHmacCR(secret);
            await this.yubikeyProvisionCheck(yubikeyApi);
            return () => {};
        } catch (err) {
            //console.warn('Yubikey Programming failed, retrying once, usually this works :-(');
            try {
                await yubikeyApi.doProgramHmacCR(secret);
                await this.yubikeyProvisionCheck(yubikeyApi);
                return () => {};
            } catch (err) {
                //console.warn(err);
                generateAlert('error', t('yubikey:yubikeyError'), t('yubikey:yubikeyErrorExplanation', { error: err }));
                return () => {
                    this.goBack();
                };
            }
        }
    };

    startSetupYubikey2FA = async (password) => {
        const { generateAlert, t } = this.props;
        if (password.length === 0) {
            generateAlert('error', t('yubikey:emptyPassword'), t('yubikey:emptyPasswordExplanation'));
            return;
        }
        console.log('XYZZY ' + password);
        this.passwordConfirmHashed = await hash(password);
        console.log('XYZZYfff ' + this.passwordConfirmHashed);

        this.doStartYubikeyWithCallback(this.doSetupYubikey2FA);
    };

    startRemoveYubikey2FA = async (password) => {
        const { generateAlert, t } = this.props;
        if (password.length === 0) {
            generateAlert('error', t('yubikey:emptyPassword'), t('yubikey:emptyPasswordExplanation'));
            return;
        }
        this.passwordConfirmHashed = await hash(password);
        this.doStartYubikeyWithCallback(this.doRemoveYubikey2FA);
    };

    doSetupYubikey2FA = async (yubikeyApi) => {
        return await this.doEnableYubikey2FA(yubikeyApi, true);
    };

    doRemoveYubikey2FA = async (yubikeyApi) => {
        return await this.doEnableYubikey2FA(yubikeyApi, false);
    };

    doEnableYubikey2FA = async (yubikeyApi, enable) => {
        const { password, set2FAStatusYubikey, setPassword, generateAlert, t } = this.props;
        try {
            if (enable) {
                const challengeResponseHashed = await this.doChallengeResponseThenSaltedHash(
                    this.passwordConfirmHashed,
                );

                try {
                    await enableYubikey2FA(this.passwordConfirmHashed, challengeResponseHashed, true);
                    setPassword(challengeResponseHashed);

                    return () => {
                        set2FAStatusYubikey(true);
                        this.passwordConfirmHashed = null;
                        this.onEnabled();
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
                    await enableYubikey2FA(challengeResponseHashed, this.passwordConfirmHashed, false);
                    setPassword(password);
                    return () => {
                        set2FAStatusYubikey(false);
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
            generateAlert('error', t('yubikey:yubikeyError'), t('yubikey:yubikeyErrorExplanation', { error: err }));
            this.goBack();
        }
    };

    /**
     * Pops the active screen from the navigation stack
     * @method goBack
     */
    goBack() {
        Navigation.pop(this.props.componentId);
    }

    noop = () => {};

    render() {
        const { theme, t, yubikeySlot, is2FAEnabledYubikey } = this.props;
        const backgroundColor = { backgroundColor: theme.body.bg };
        const textColor = { color: theme.body.color };
        const { password, provState } = this.state;

        let leftButtonText = t('global:back');
        let leftButtonPress = this.goBack;

        let rightButtonText = t('global:next');
        let rightButtonPress = this.noop;
        let rightButtonEnabled = true;

        let promptHeader = '';
        let promptExplanation = '';
        let showPrompt = false;
        let showPassword = false;
        let handlePasswordSubmit = null;

        if (!this.isYubikeyIdle()) {
            rightButtonText = '';
            rightButtonEnabled = false;
            rightButtonPress = this.noop;
        } else {
            if (provState === PROV_STATE.UNPROVISIONED) {
                showPrompt = true;
                rightButtonText = t('yubikey:configure');
                rightButtonPress = () => this.setState({ provState: PROV_STATE.CONFIRM_PROVISIONING });
                promptHeader = t('yubikey:notProvisioned');
                promptExplanation = t('yubikey:notProvisionedExplanation', { slot: yubikeySlot });
            } else if (provState === PROV_STATE.CONFIRM_PROVISIONING) {
                showPrompt = true;
                rightButtonText = t('yubikey:program');
                rightButtonPress = () => this.startYubikeyProvision();
                promptHeader = t('yubikey:confirmProvisioning');
                promptExplanation = t('yubikey:confirmProvisioningExplanation', { slot: yubikeySlot });
            } else if (provState === PROV_STATE.PREPROVISIONED) {
                showPrompt = true;
                leftButtonText = t('yubikey:replaceExistingConfiguration');
                //leftButtonPress = () => this.startYubikeyProvision();
                leftButtonPress = () => this.setState({ provState: PROV_STATE.CONFIRM_PROVISIONING });
                rightButtonText = t('yubikey:useExistingConfiguration');
                rightButtonPress = () => this.setState({ provState: PROV_STATE.PASSWORD_FOR_ENABLE });
                promptHeader = t('yubikey:preProvisioned');
                promptExplanation = t('yubikey:preProvisionedExplanation', { slot: yubikeySlot });
            } else if (provState === PROV_STATE.PASSWORD_FOR_ENABLE) {
                showPassword = true;
                handlePasswordSubmit = () => this.startSetupYubikey2FA(password);
                rightButtonText = t('global:enable');
                rightButtonPress = handlePasswordSubmit;
            } else if (provState === PROV_STATE.PASSWORD_FOR_DISABLE) {
                showPassword = true;
                handlePasswordSubmit = () => this.startRemoveYubikey2FA(password);
                rightButtonText = t('global:disable');
                rightButtonPress = handlePasswordSubmit;
            }
        }

        if (!this.isYubikeyIdle()) {
            return <View style={[styles.container, backgroundColor]}>{this.renderYubikey()}</View>;
        }

        return (
            <View style={[styles.container, backgroundColor]}>
                <View style={styles.topWrapper}>
                    <Icon name="iota" size={width / 8} color={theme.body.color} />
                </View>

                <View style={styles.midWrapper}>
                    <View style={{ flex: 0.4 }} />

                    {showPrompt && (
                        <View>
                            <Text style={[styles.promptHeader, textColor]}>{promptHeader}</Text>
                            <Text style={[styles.promptExplanation, textColor]}>{promptExplanation}</Text>
                        </View>
                    )}

                    {showPassword && (
                        <View>
                            <Text style={[styles.infoText, textColor]}>
                                {t(
                                    is2FAEnabledYubikey
                                        ? 'yubikey:enterPasswordToDisableYubikey2FA'
                                        : 'yubikey:enterPasswordToContinue',
                                )}
                            </Text>
                            <CustomTextInput
                                label={t('global:password')}
                                onValidTextChange={(password) => this.setState({ password })}
                                containerStyle={{ width: Styling.contentWidth }}
                                autoCapitalize="none"
                                autoCorrect={false}
                                enablesReturnKeyAutomatically
                                returnKeyType="done"
                                onSubmitEditing={handlePasswordSubmit}
                                theme={theme}
                                secureTextEntry
                                value={password}
                            />
                        </View>
                    )}
                </View>

                <View style={styles.bottomContainer}>
                    <DualFooterButtons
                        onLeftButtonPress={leftButtonPress}
                        onRightButtonPress={rightButtonPress}
                        leftButtonText={leftButtonText}
                        rightButtonText={rightButtonText}
                        disableRightButton={!rightButtonEnabled}
                    />
                </View>
            </View>
        );
    }
}

const mapDispatchToProps = {
    set2FAStatusYubikey,
    setPassword,
    generateAlert,
};

const mapStateToProps = (state) => ({
    theme: getThemeFromState(state),
    password: state.wallet.password,

    is2FAEnabledYubikey: state.settings.is2FAEnabledYubikey,
    yubikeyAndroidReaderMode: state.settings.yubikeyAndroidReaderMode,
    yubikeySlot: state.settings.yubikeySlot,

    wallet: state.wallet,
});

export default withNamespaces(['twoFA', 'global'])(connect(mapStateToProps, mapDispatchToProps)(TwoFactorSetupYubikey));
