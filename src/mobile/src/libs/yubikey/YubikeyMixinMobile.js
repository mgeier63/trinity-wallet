import { YubikeyMixin } from 'shared-modules/libs/yubikey/YubikeyMixin';
import { YUBIKEY_STATE } from 'shared-modules/libs/yubikey/YubikeyApi';
import React from 'react';
import { hashBytes } from 'libs/keychain';
import { StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import tinycolor from 'tinycolor2';
import blackLoadingAnimation from 'shared-modules/animations/loading-black';
import whiteLoadingAnimation from 'shared-modules/animations/loading-white';
import Fonts from 'ui/theme/fonts';
import { Styling } from 'ui/theme/general';
import SingleFooterButton from 'ui/components/SingleFooterButton';
import { width, height } from 'libs/dimensions';
import { Icon } from 'ui/theme/icons';
import { isYubikeyBackendImplemented } from 'libs/nativeModules';

// Show some dummy progress for this amount of milliseconds, to provide feedback to the user that something
// is beeing done with the YubiKey.
// Set to 0 to completely disable that progress screen.
// This is mostly intended for USB mode, where the key stays connected.
const YUBIKEY_COMMUNICATING_SPLASH_TIMEOUT = 0;

const yubikeyNativeBackend = require('./YubikeyNativeBackend');

//const yubikeyNativeBackend = require('./YubikeyMockBackend');
// console.log("**********************************************")
// console.log("************** using Mock backend ************")
// console.log("**********************************************")

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: height / 16,
    },
    midContainer: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomContainer: {
        flex: 1.5,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    animationLoading: {
        justifyContent: 'center',
        width: 50,
        height: 50,
    },
    animationContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
    waitingText: {
        fontFamily: Fonts.secondary,
        fontSize: Styling.fontSize5,
        textAlign: 'center',
        backgroundColor: 'transparent',
        width: 250,
    },
});

export function applyYubikeyMixinMobile(target, yubikeySlot, yubikeyAndroidReaderMode) {
    if (isYubikeyBackendImplemented()) {
        Object.assign(target, new YubikeyMixinMobile(target, yubikeySlot, yubikeyAndroidReaderMode, yubikeyNativeBackend));
    } else {
        Object.assign(target, new YubikeyMixinNoop(target));
    }
}

class YubikeyMixinNoop {
    constructor(target) {
        target.renderYubikey = () => {
            return;
        };

        target.isYubikeyIdle = () => {
            return true;
        };

        this.doStartYubikey = () => {};

        this.doStopYubikey = () => {};

        this.shouldStartYubikey = () => {
            return false;
        };
    }
}

class YubikeyMixinMobile extends YubikeyMixin {
    constructor(target, yubikeySlot, yubikeyAndroidReaderMode, yubikeyBackend) {
        super(target, yubikeySlot, yubikeyAndroidReaderMode, yubikeyBackend, YUBIKEY_COMMUNICATING_SPLASH_TIMEOUT);

        target.isYubikeyIdle = () => {
            const { yubikeyState } = target.state;
            return typeof yubikeyState === 'undefined' || yubikeyState === YUBIKEY_STATE.INACTIVE;
        };

        // eslint-disable-next-line react/display-name
        target.renderYubikey = () => {
            const { yubikeyState } = target.state;
            const { theme: { body }, t } = target.props;
            const isBgLight = tinycolor(body.bg).isLight();
            const loadingAnimationPath = isBgLight ? blackLoadingAnimation : whiteLoadingAnimation;
            const textColor = { color: body.color };
            if (yubikeyState === YUBIKEY_STATE.COMMUNICATING && YUBIKEY_COMMUNICATING_SPLASH_TIMEOUT > 0) {
                return (
                    <View style={styles.animationContainer}>
                        <View>
                            <LottieView
                                ref={(animation) => {
                                    this.animation = animation;
                                    if (animation !== null) {
                                        animation.play();
                                    }
                                }}
                                source={loadingAnimationPath}
                                style={styles.animationLoading}
                                loop
                            />
                        </View>
                    </View>
                );
            }
            if (yubikeyState === YUBIKEY_STATE.WAITING) {
                return (
                    <View style={[styles.container, { backgroundColor: body.bg }]}>
                        <View style={styles.topContainer}>
                            <Icon name="iota" size={width / 8} color={target.props.theme.body.color} />
                        </View>
                        <View style={styles.midContainer}>
                            <Text style={[styles.waitingText, textColor]}>{t('yubikey:insertOrTapToken')}</Text>
                        </View>
                        <View style={styles.bottomContainer}>
                            <View style={styles.bottomWrapper}>
                                <SingleFooterButton
                                    onButtonPress={() => this.doStopYubikey()}
                                    buttonStyle={{
                                        wrapper: { backgroundColor: target.props.theme.primary.color },
                                        children: { color: target.props.theme.primary.body },
                                    }}
                                    buttonText={t('global:cancel')}
                                />
                            </View>
                        </View>
                    </View>
                );
            }
            return null;
        };

        this.doChallengeResponseThenSaltedHash = async (challenge) => {
            const challengeResponse = await this.yubikeyApi.doChallengeResponse(challenge);
            //HMAC-SHA1 response is 20 bytes, so we can't directly use that, rather hash it again
            return await hashBytes(challengeResponse);
        };
    }
}
