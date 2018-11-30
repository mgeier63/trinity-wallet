import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { generateAlert } from 'shared-modules/actions/alerts';
import { connect } from 'react-redux';
import { Navigation } from 'react-native-navigation';
import { StyleSheet, View, Text, BackHandler } from 'react-native';
import { withNamespaces } from 'react-i18next';
import RadioForm, { RadioButton, RadioButtonInput } from 'react-native-simple-radio-button';
import Fonts from 'ui/theme/fonts';
import { width, height } from 'libs/dimensions';
import { Icon } from 'ui/theme/icons';
import { Styling } from 'ui/theme/general';
import { leaveNavigationBreadcrumb } from 'libs/bugsnag';
import Button from 'ui/components/Button';
import { isIPhoneX } from 'libs/device';
import { isYubikeyBackendImplemented } from 'libs/nativeModules';

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
    subHeaderText: {
        fontFamily: Fonts.secondary,
        fontSize: Styling.fontSize4,
        textAlign: 'center',
        backgroundColor: 'transparent',
        marginBottom: height / 8,
    },
    radioText: {
        fontFamily: Fonts.secondary,
        fontSize: Styling.fontSize4,
        backgroundColor: 'transparent',
        textAlign: 'left',
        marginLeft: 20,
    },
    explanationText: {
        fontFamily: Fonts.secondary,
        fontSize: Styling.fontSize2,
        backgroundColor: 'transparent',
        textAlign: 'left',
    },
});

/** Two factor authentication method chooser component */
class TwoFactorSetupChooseMethod extends Component {
    static propTypes = {
        /** Component ID */
        componentId: PropTypes.string.isRequired,
        /** @ignore */
        theme: PropTypes.object.isRequired,
        /** @ignore */
        t: PropTypes.func.isRequired,
        /** @ignore */
        is2FAEnabled: PropTypes.bool.isRequired,
        /** @ignore */
        is2FAEnabledYubikey: PropTypes.bool.isRequired,
    };

    constructor() {
        super();

        this.goBack = this.goBack.bind(this);
        this.goNext = this.goNext.bind(this);

        this.state = {
            method: '',
        };
    }

    componentDidMount() {
        leaveNavigationBreadcrumb('twoFactorSetupChooseMethod');
        BackHandler.addEventListener('hardwareBackPress', () => {
            this.goBack();
            return true;
        });
    }

    componentWillUnmount() {
        BackHandler.removeEventListener('hardwareBackPress');
    }

    /**
     * Pops the active screen from the navigation stack
     * @method goBack
     */
    goBack() {
        Navigation.pop(this.props.componentId);
    }

    goNext() {
        const { theme } = this.props;
        const { method } = this.state;
        let next = '';
        switch (method) {
            case 'otp':
                next = 'twoFactorSetupAddKey';
                break;
            case 'yubikey':
                next = 'twoFASetupYubikey';
                break;
        }
        if (next !== '') {
            Navigation.push('appStack', {
                component: {
                    name: next,
                    options: {
                        animations: {
                            push: {
                                enable: false,
                            },
                            pop: {
                                enable: false,
                            },
                        },
                        layout: {
                            backgroundColor: theme.body.bg,
                            orientation: ['portrait'],
                        },
                        topBar: {
                            visible: false,
                            drawBehind: true,
                            elevation: 0,
                        },
                        statusBar: {
                            drawBehind: true,
                            backgroundColor: theme.body.bg,
                        },
                    },
                },
            });
        }
    }

    render() {
        const { theme, t } = this.props;
        const { method } = this.state;
        const backgroundColor = { backgroundColor: theme.body.bg };
        const textColor = theme.body.color;

        const { is2FAEnabled, is2FAEnabledYubikey } = this.props;

        if (is2FAEnabled || is2FAEnabledYubikey) {
            //just got enabled in child component
            setTimeout(() => this.goBack(), 100);
            return null;
        }

        const radioProps = [
            { label: t('twoFaMethod_otp'), explanation: t('twoFaMethod_otp_explanation'), value: 'otp' },
        ];
        if (isYubikeyBackendImplemented()) {
            radioProps.push({
                label: t('twoFaMethod_yubikey'),
                explanation: t('twoFaMethod_yubikey_explanation'),
                value: 'yubikey',
            });
        }

        const borderRadius = isIPhoneX ? parseInt(width / 20) : 0;
        return (
            <View style={[styles.container, backgroundColor]}>
                <View style={styles.topWrapper}>
                    <Icon name="iota" size={width / 8} color={textColor} />
                </View>
                <View style={styles.midWrapper}>
                    <Text style={[styles.subHeaderText, { color: textColor }]}>{t('selectMethod')}</Text>
                    <RadioForm>
                        {radioProps.map((obj, i) => {
                            return (
                                <View
                                    key={i}
                                    style={{
                                        marginBottom: 30,
                                    }}
                                >
                                    <RadioButton labelHorizontal key={i}>
                                        <RadioButtonInput
                                            obj={obj}
                                            index={i}
                                            isSelected={method === obj.value}
                                            onPress={() => {
                                                this.setState({ method: obj.value });
                                            }}
                                            borderWidth={1}
                                            buttonSize={14}
                                            buttonInnerColor={textColor}
                                            buttonOuterColor={textColor}
                                            buttonWrapStyle={{ marginLeft: 10, justifyContent: 'center' }}
                                        />
                                        <Text
                                            style={[styles.radioText, { color: textColor, width: width / 1.5 }]}
                                            onPress={() => {
                                                this.setState({ method: obj.value });
                                            }}
                                        >
                                            {obj.label + '\n'}

                                            <Text
                                                style={[styles.explanationText, { color: textColor }]}
                                                onPress={() => {
                                                    this.setState({ method: obj.value });
                                                }}
                                            >
                                                {obj.explanation}
                                            </Text>
                                        </Text>
                                    </RadioButton>
                                </View>
                            );
                        })}
                    </RadioForm>
                </View>
                <View style={styles.bottomWrapper}>
                    <View
                        style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                        }}
                    >
                        <Button
                            onPress={this.goBack}
                            style={{
                                wrapper: {
                                    backgroundColor: theme.dark.color,
                                    width: isIPhoneX ? Styling.contentWidth / 2 : width / 2,
                                    borderColor: theme.primary.border,
                                    borderWidth: 1,
                                    borderBottomLeftRadius: borderRadius,
                                    borderTopLeftRadius: borderRadius,
                                },
                                children: {
                                    color: theme.dark.body,
                                },
                            }}
                        >
                            {t('global:back')}
                        </Button>
                        <Button
                            onPress={this.goNext}
                            style={{
                                wrapper: {
                                    width: isIPhoneX ? Styling.contentWidth / 2 : width / 2,
                                    backgroundColor: method === '' ? theme.dark.color : theme.primary.color,
                                    borderBottomRightRadius: borderRadius,
                                    borderTopRightRadius: borderRadius,
                                },
                                children: { color: theme.primary.body },
                            }}
                        >
                            {t('global:next')}
                        </Button>
                    </View>
                </View>
            </View>
        );
    }
}

const mapDispatchToProps = {
    generateAlert,
};

const mapStateToProps = (state) => ({
    theme: state.settings.theme,
    is2FAEnabled: state.settings.is2FAEnabled,
    is2FAEnabledYubikey: state.settings.is2FAEnabledYubikey,
});

export default withNamespaces(['twoFA', 'yubikey', 'global'])(
    connect(mapStateToProps, mapDispatchToProps)(TwoFactorSetupChooseMethod),
);
