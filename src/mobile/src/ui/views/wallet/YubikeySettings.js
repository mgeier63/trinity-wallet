import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import { setSetting } from 'shared-modules/actions/wallet';
import { setYubikey } from 'shared-modules/actions/settings';
import { withNamespaces } from 'react-i18next';
import { width, height } from 'libs/dimensions';
import RadioForm, { RadioButton, RadioButtonInput, RadioButtonLabel } from 'react-native-simple-radio-button';
import Fonts from 'ui/theme/fonts';
import { isAndroid } from 'libs/device';
import { Icon } from 'ui/theme/icons';
import { Styling } from 'ui/theme/general';
import { leaveNavigationBreadcrumb } from 'libs/bugsnag';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bottomContainer: {
        flex: 1,
        width,
        paddingHorizontal: width / 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    innerContainer: {
        flex: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topContainer: {
        flex: 5,
        justifyContent: 'flex-start',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    subTitle: {
        fontFamily: Fonts.secondary,
        fontSize: Styling.fontSize3,
        backgroundColor: 'transparent',
        textAlign: 'center',
        paddingTop: width / 20,
        paddingBottom: width / 35,
    },
    radioText: {
        fontFamily: Fonts.secondary,
        fontSize: Styling.fontSize3,
        backgroundColor: 'transparent',
        textAlign: 'center',
    },
    titleTextLeft: {
        color: 'white',
        fontFamily: 'SourceSansPro-Regular',
        fontSize: Styling.fontSize3,
        backgroundColor: 'transparent',
        marginLeft: width / 20,
    },
    titleTextRight: {
        color: 'white',
        fontFamily: 'SourceSansPro-Regular',
        fontSize: Styling.fontSize3,
        backgroundColor: 'transparent',
        marginRight: width / 20,
    },
});

/** Currency Selection component */
export class YubikeySettings extends Component {
    static propTypes = {
        /** @ignore */
        yubikeySettings: PropTypes.object.isRequired,
        /** @ignore */
        setYubikey: PropTypes.func.isRequired,
        /** @ignore */
        setSetting: PropTypes.func.isRequired,
        /** @ignore */
        t: PropTypes.func.isRequired,
        /** @ignore */
        theme: PropTypes.object.isRequired,
        /** @ignore */
    };

    constructor(props) {
        super(props);

        this.state = {
            slot: this.props.yubikeySettings.slot,
            androidReaderMode: this.props.yubikeySettings.androidReaderMode,
        };
    }

    componentDidMount() {
        leaveNavigationBreadcrumb('YubikeySettings');
    }

    renderBackOption() {
        const { theme, t } = this.props;

        return (
            <TouchableOpacity
                onPress={() => this.props.setSetting('advancedSettings')}
                hitSlop={{ top: height / 55, bottom: height / 55, left: width / 55, right: width / 55 }}
            >
                <View style={styles.itemLeft}>
                    <Icon name="chevronLeft" size={width / 28} color={theme.body.color} />
                    <Text style={[styles.titleTextLeft, { color: theme.body.color }]}>{t('global:back')}</Text>
                </View>
            </TouchableOpacity>
        );
    }

    renderSaveOption() {
        const { t, theme } = this.props;
        const { slot, androidReaderMode } = this.state;
        return (
            <TouchableOpacity
                onPress={() =>
                    this.props.setYubikey({
                        slot: slot,
                        androidReaderMode: androidReaderMode,
                    })
                }
                hitSlop={{ top: height / 55, bottom: height / 55, left: width / 55, right: width / 55 }}
            >
                <View style={styles.itemRight}>
                    <Text style={[styles.titleTextRight, { color: theme.body.color }]}>{t('global:save')}</Text>
                    <Icon name="tick" size={width / 28} color={theme.body.color} />
                </View>
            </TouchableOpacity>
        );
    }

    render() {
        const { t, theme: { label, primary } } = this.props;
        const { slot, androidReaderMode } = this.state;
        const radioPropsSlot = [{ label: t('slot1'), value: 1 }, { label: t('slot2'), value: 2 }];
        const radioPropsNfc = [
            { label: t('nfcSettingDefault'), value: false },
            { label: t('nfcSettingReadermode'), value: true },
        ];
        return (
            <View style={styles.container}>
                <View style={styles.topContainer}>
                    <Text style={[styles.subTitle, { color: primary.color }]}>{t('slotSettings')}</Text>
                    <RadioForm>
                        {radioPropsSlot.map((obj, i) => {
                            return (
                                <RadioButton labelHorizontal key={i}>
                                    <RadioButtonInput
                                        obj={obj}
                                        index={i}
                                        isSelected={slot === obj.value}
                                        onPress={(value) => {
                                            if (value) {
                                                this.setState({ slot: obj.value });
                                            }
                                        }}
                                        borderWidth={1}
                                        buttonSize={12}
                                        buttonInnerColor={primary.color}
                                        buttonOuterColor={primary.color}
                                        buttonWrapStyle={{ marginLeft: 10 }}
                                    />
                                    <RadioButtonLabel
                                        obj={obj}
                                        index={i}
                                        labelHorizontal
                                        onPress={(value) => {
                                            if (value) {
                                                this.setState({ slot: obj.value });
                                            }
                                        }}
                                        labelStyle={[styles.radioText, { color: label.color }]}
                                        labelWrapStyle={{}}
                                    />
                                </RadioButton>
                            );
                        })}
                    </RadioForm>

                    {isAndroid && (
                        <View>
                            <Text style={[styles.subTitle, { color: primary.color }]}>{t('nfcSettings')}</Text>
                            <RadioForm>
                                {radioPropsNfc.map((obj, i) => {
                                    return (
                                        <RadioButton labelHorizontal key={i}>
                                            <RadioButtonInput
                                                obj={obj}
                                                index={i}
                                                isSelected={androidReaderMode === obj.value}
                                                onPress={() => this.setState({ androidReaderMode: obj.value })}
                                                borderWidth={1}
                                                buttonSize={12}
                                                buttonInnerColor={primary.color}
                                                buttonOuterColor={primary.color}
                                                buttonWrapStyle={{ marginLeft: 10 }}
                                            />
                                            <RadioButtonLabel
                                                obj={obj}
                                                index={i}
                                                labelHorizontal
                                                onPress={() => this.setState({ androidReaderMode: obj.value })}
                                                labelStyle={[styles.radioText, { color: label.color }]}
                                                labelWrapStyle={{}}
                                            />
                                        </RadioButton>
                                    );
                                })}
                            </RadioForm>
                        </View>
                    )}
                </View>
                <View style={styles.bottomContainer}>
                    {this.renderBackOption()}
                    {this.renderSaveOption()}
                </View>
            </View>
        );
    }
}

const mapStateToProps = (state) => ({
    yubikeySettings: state.settings.yubikey,
    theme: state.settings.theme,
});

const mapDispatchToProps = {
    setSetting,
    setYubikey,
};

export default withNamespaces(['yubikey', 'global'])(connect(mapStateToProps, mapDispatchToProps)(YubikeySettings));
