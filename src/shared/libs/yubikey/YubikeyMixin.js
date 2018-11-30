import { YubikeyApi, YUBIKEY_STATE } from './YubikeyApi';

export class YubikeyMixin {
    constructor(target, yubikeySettings, yubikeybackend, splashTimeout) {
        target.state = { ...target.state, yubikeyState: YUBIKEY_STATE.INACTIVE };
        this.target = target;

        this.doStartYubikey = () => {
            target.setState({ yubikeyState: YUBIKEY_STATE.WAITING });
            yubikeybackend
                .getOrWaitForBackend(yubikeySettings.androidReaderMode)
                .then(
                    async (backend) => {
                        target.setState({ yubikeyState: YUBIKEY_STATE.COMMUNICATING });
                        this.yubikeyApi = new YubikeyApi(backend, yubikeySettings.slot === 2);
                        try {
                            await target.doWithYubikey(this.yubikeyApi, this.postResultDelayed, this.postError);
                        } finally {
                            yubikeybackend.cancelWaitForBackend();
                            if (this.yubikeyApi !== null) {
                                this.yubikeyApi.close();
                            }
                            this.yubikeyApi = null;
                        }
                    },
                    () => {
                        /*user cancelled*/
                    },
                )
                .catch((err) => {
                    target.props.generateAlert(
                        'error',
                        target.props.t('yubikey:yubikeyError'),
                        target.props.t('yubikey:yubikeyErrorExplanation', { error: err }),
                    );
                    this.doStopYubikey();
                });
        };

        this.doStopYubikey = () => {
            yubikeybackend.cancelWaitForBackend();
            target.setState({ yubikeyState: YUBIKEY_STATE.INACTIVE });
        };

        this.shouldStartYubikey = (condition) => {
            const { is2FAEnabledYubikey } = target.props;
            if (is2FAEnabledYubikey && condition) {
                this.doStartYubikey();
                return true;
            }
            return false;
        };

        this.postResultDelayed = (fn) => {
            if (splashTimeout === 0) {
                this.doStopYubikey();
                fn();
            } else {
                setTimeout(async () => {
                    this.doStopYubikey();
                    fn();
                }, splashTimeout);
            }
        };

        this.postError = (title, text) => {
            this.doStopYubikey();
            target.props.generateAlert('error', title, text);
        };
    }
}
