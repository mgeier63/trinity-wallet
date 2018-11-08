import React, { Component } from 'react';
import { View, Text, Button, Platform, TouchableOpacity, Linking, TextInput, ScrollView } from 'react-native';
import authenticator from 'authenticator';

import {
    getStartDiscoverNfcFn,
    getStopDiscoverNfcFn,
    getIsNfcSupportedFn,
    getIsNfcEnabledFn,
    getShowNfcSettingsFn,
} from 'libs/nativeModules';

class XxxApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            supported: true,
            enabled: false,
            authKey: authenticator.generateKey(),
        };
    }

    componentDidMount() {
        const fnx = getIsNfcSupportedFn();
        if (fnx !== null) {
            fnx().then((supported) => {
                this.setState({ supported });
                if (supported) {
                    //maybe do something
                }
            });
        }

        const fn = getIsNfcEnabledFn();
        if (fn !== null) {
            fn().then((enabled) => {
                this.setState({ enabled });
                if (enabled) {
                    //maybe do something
                }
            });
        }
    }

    componentWillUnmount() {
        // if (this._stateChangedSubscription) {
        //     this._stateChangedSubscription.remove();
        // }
    }

    render() {
        const { supported, enabled } = this.state;
        return (
            <ScrollView style={{ flex: 1 }}>
                {Platform.OS === 'ios' && <View style={{ height: 60 }} />}

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>{`TODOTODO Is NFC supported ? ${supported}`}</Text>
                    <Text>{`TODOTODO Is NFC enabled (Android only)? ${enabled}`}</Text>

                    <TouchableOpacity style={{ marginTop: 20 }} onPress={this._startDiscoverNfc}>
                        <Text style={{ color: 'white' }}>XX Start</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={{ marginTop: 20 }} onPress={this._stopDiscoverNfc}>
                        <Text style={{ color: 'white' }}>XX Stop</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={{ marginTop: 20 }} onPress={this._goToNfcSetting}>
                        <Text>(android) Go to NFC setting</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    _startDiscoverNfc = () => {
        const fn = getStartDiscoverNfcFn();
        if (fn !== null) {
            fn().then((value) => console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXX _startDiscoverNfc : ' + value));
        }
    };

    _stopDiscoverNfc = () => {
        const fn = getStopDiscoverNfcFn();
        if (fn !== null) {
            fn().then((value) => console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXX_stopDiscoverNfc: ' + value));
        }
    };

    _goToNfcSetting = () => {
        const fn = getShowNfcSettingsFn();
        if (fn !== null) {
            fn();
        }
    };

    /*
    _requestFormat = () => {
        let {isWriting} = this.state;
        if (isWriting) {
            return;
        }

        this.setState({isWriting: true});
        NfcManager.requestNdefWrite(null, {format: true})
            .then(() => console.log('format completed'))
            .catch(err => console.warn(err))
            .then(() => this.setState({isWriting: false}));
    }

    _requestNdefWrite = () => {
        let {isWriting, urlToWrite, rtdType} = this.state;
        if (isWriting) {
            return;
        }

        let bytes;

        if (rtdType === RtdType.URL) {
            bytes = buildUrlPayload(urlToWrite);
        } else if (rtdType === RtdType.TEXT) {
            bytes = buildTextPayload(urlToWrite);
        }

        this.setState({isWriting: true});
        NfcManager.requestNdefWrite(bytes)
            .then(() => console.log('write completed'))
            .catch(err => console.warn(err))
            .then(() => this.setState({isWriting: false}));
    }

    _cancelNdefWrite = () => {
        this.setState({isWriting: false});
        NfcManager.cancelNdefWrite()
            .then(() => console.log('write cancelled'))
            .catch(err => console.warn(err))
    }

    _requestAndroidBeam = () => {
        let {isWriting, urlToWrite, rtdType} = this.state;
        if (isWriting) {
            return;
        }

        let bytes;

        if (rtdType === RtdType.URL) {
            bytes = buildUrlPayload(urlToWrite);
        } else if (rtdType === RtdType.TEXT) {
            bytes = buildTextPayload(urlToWrite);
        }

        this.setState({isWriting: true});
        NfcManager.setNdefPushMessage(bytes)
            .then(() => console.log('beam request completed'))
            .catch(err => console.warn(err))
    }

    _cancelAndroidBeam = () => {
        this.setState({isWriting: false});
        NfcManager.setNdefPushMessage(null)
            .then(() => console.log('beam cancelled'))
            .catch(err => console.warn(err))
    }

    _startNfc() {
        NfcManager.start({
            onSessionClosedIOS: () => {
                console.log('ios session closed');
            }
        })
            .then(result => {
                console.log('start OK', result);
            })
            .catch(error => {
                console.warn('start fail', error);
                this.setState({supported: false});
            })

        if (Platform.OS === 'android') {
            NfcManager.getLaunchTagEvent()
                .then(tag => {
                    console.log('launch tag', tag);
                    if (tag) {
                        this.setState({ tag });
                    }
                })
                .catch(err => {
                    console.log(err);
                })
            NfcManager.isEnabled()
                .then(enabled => {
                    this.setState({ enabled });
                })
                .catch(err => {
                    console.log(err);
                })
            NfcManager.onStateChanged(
                event => {
                    if (event.state === 'on') {
                        this.setState({enabled: true});
                    } else if (event.state === 'off') {
                        this.setState({enabled: false});
                    } else if (event.state === 'turning_on') {
                        // do whatever you want
                    } else if (event.state === 'turning_off') {
                        // do whatever you want
                    }
                }
            )
                .then(sub => {
                    this._stateChangedSubscription = sub; 
                    // remember to call this._stateChangedSubscription.remove()
                    // when you don't want to listen to this anymore
                })
                .catch(err => {
                    console.warn(err);
                })
        }
    }

    _onTagDiscovered = tag => {
        console.log('Tag Discovered XX', tag);
        this.setState({ tag });
        let url = this._parseUri(tag);
        if (url) {
            console.log('Tag sent URL: ', url);
            Linking.openURL(url)
                .catch(err => {
                    console.warn(err);
                })
        }

        let text = this._parseText(tag);
        this.setState({parsedText: text});
    }

    _startChallengeOTP = () => {
        NfcManager.registerTagEvent(this._onTagDiscovered, 'XyzzyFloo', true)
            .then((result) => {
                console.log('_startChallengeOTP registerTagEvent OK AAAAAAAAAAAAa', result)
                this._startChallengeOTP2();
            })
            .catch((error) => {
                console.warn('_startChallengeOTP registerTagEvent fail', error)
            });
    }

    _startChallengeOTP2 = () => {
        NfcManager.requestTechnology(NfcTech.IsoDep)
            .then((result) => {
                console.log('_startChallengeOTP2 requestTechnology OK', result)
                this._startChallengeOTP3();


            })
            .catch((error) => {
                console.warn('_startChallengeOTP2 requestTechnology fail', error)
            });
    }

    _startChallengeOTP3 = () => {
        NfcManager.getTag()
            .then((result) => {
                console.log('_startChallengeOTP3 getTag OK', result)

                const techTypes = result.techTypes
                const hasIsoDep = techTypes.includes('android.nfc.tech.IsoDep')

                console.log('_startChallengeOTP3 hasIsoDep=', hasIsoDep)

                if (hasIsoDep) {
                    doChallengeYubiKeyIsoDep(1);

                }
                else {
                    console.warn('_startChallengeOTP3 getTag fail -> no *isoDep* technology found on tag')
                }

            })
            .catch((error) => {
                console.warn('_startChallengeOTP3 getTag fail', error)
            }).then(() => {
            NfcManager.closeTechnology();
            });

    }




    _startDetection = () => {
        NfcManager.registerTagEvent(this._onTagDiscovered)
            .then((result) => {
                console.log('registerTagEvent OK', result)
            })
            .catch((error) => {
                console.warn('registerTagEvent fail', error)
            })
    }

    _stopDetection = () => {
        NfcManager.unregisterTagEvent()
            .then(result => {
                console.log('unregisterTagEvent OK', result)
            })
            .catch(error => {
                console.warn('unregisterTagEvent fail', error)
            })
    }

    _clearMessages = () => {
        this.setState({tag: null});
    }



    _parseUri = (tag) => {
        try {
            if (Ndef.isType(tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
                return Ndef.uri.decodePayload(tag.ndefMessage[0].payload);
            }
        } catch (e) {
            console.log(e);
        }
        return null;
    }

    _parseText = (tag) => {
        try {
            if (Ndef.isType(tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
                return Ndef.text.decodePayload(tag.ndefMessage[0].payload);
            }
        } catch (e) {
            console.log(e);
        }
        return null;
    }
    */
}

export default XxxApp;
