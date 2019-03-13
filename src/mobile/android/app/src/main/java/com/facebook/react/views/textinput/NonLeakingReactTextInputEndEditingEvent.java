/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.views.textinput;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import static org.iota.mobile.Converter.charArrayToWritableArray;

/**
 * Event emitted by EditText native view when text editing ends,
 * because of the user leaving the text input.
 */
class NonLeakingReactTextInputEndEditingEvent extends Event<NonLeakingReactTextInputEndEditingEvent> {

  private static final String EVENT_NAME = "topEndEditing";

  private char[] mText;

  public NonLeakingReactTextInputEndEditingEvent(
      int viewId,
      char[] text) {
    super(viewId);
    mText = text;
  }

  @Override
  public String getEventName() {
    return EVENT_NAME;
  }

  @Override
  public boolean canCoalesce() {
    return false;
  }

  @Override
  public void dispatch(RCTEventEmitter rctEventEmitter) {
    rctEventEmitter.receiveEvent(getViewTag(), getEventName(), serializeEventData());
  }

  private WritableMap serializeEventData() {
    WritableMap eventData = Arguments.createMap();
    eventData.putInt("target", getViewTag());
    eventData.putArray("text", charArrayToWritableArray(mText));
    return eventData;
  }
}
