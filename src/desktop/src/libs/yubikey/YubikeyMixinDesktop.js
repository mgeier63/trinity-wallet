/* global Electron */
import { YubikeyMixin } from 'shared-modules/libs/yubikey/YubikeyMixin';
import { YUBIKEY_STATE } from 'shared-modules/libs/yubikey/YubikeyApi';
import React from 'react';
import Loading from 'ui/components/Loading';
import Button from 'ui/components/Button';
import Modal from 'ui/components/modal/Modal';
import { hashBytes } from 'libs/crypto';

// Show some dummy progress for this amount of milliseconds, to provide feedback to the user that something
// is beeing done with the YubiKey.
// Set to 0 to completely disable that progress screen.
const YUBIKEY_COMMUNICATING_SPLASH_TIMEOUT = 0;

export function applyYubikeyMixinDesktop(target, yubikeySettings, customRenderLoading = null) {
    Object.assign(
        target,
        new YubikeyMixinDesktop(target, yubikeySettings, Electron.yubikeyUsbBackend, customRenderLoading),
    );
}

class YubikeyMixinDesktop extends YubikeyMixin {
    constructor(target, yubikeySettings, yubikeyUsbBackend, customRenderLoading) {
        super(target, yubikeySettings, yubikeyUsbBackend, YUBIKEY_COMMUNICATING_SPLASH_TIMEOUT);

        this._render = target.render;

        // eslint-disable-next-line react/display-name
        this.render = () => {
            const { t } = target.props;
            const { yubikeyState } = target.state;

            if (yubikeyState === YUBIKEY_STATE.COMMUNICATING && YUBIKEY_COMMUNICATING_SPLASH_TIMEOUT > 0) {
                if (customRenderLoading !== null) {
                    return customRenderLoading.apply(target);
                }
                return (
                    <Loading loop title={t('yubikey:communicating')} subtitle={t('yubikey:communicatingExplanation')} />
                );
            }

            if (yubikeyState === YUBIKEY_STATE.WAITING) {
                return (
                    <Modal variant="confirm" isOpen onClose={() => this.doStopYubikey()}>
                        <h1>{t('yubikey:insertToken')}</h1>
                        <footer>
                            <Button onClick={() => this.doStopYubikey()} variant="dark">
                                {t('back')}
                            </Button>
                        </footer>
                    </Modal>
                );
            }

            return this._render.apply(target);
        };

        this.doChallengeResponseThenSaltedHash = async (challenge) => {
            const challengeResponse = await this.yubikeyApi.doChallengeResponse(challenge);
            //HMAC-SHA1 response is 20 bytes, so we can't directly use that, rather hash it again
            return await hashBytes(challengeResponse);
        };
    }
}
