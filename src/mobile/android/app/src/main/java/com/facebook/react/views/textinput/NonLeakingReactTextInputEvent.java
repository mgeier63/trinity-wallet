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
 * Event emitted by EditText native view when text changes.
 * VisibleForTesting from {@link TextInputEventsTestCase}.
 */
public class NonLeakingReactTextInputEvent extends Event<NonLeakingReactTextInputEvent> {

  public static final String EVENT_NAME = "topTextInput";

  private char[] mText;
  private char[] mPreviousText;
  private int mRangeStart;
  private int mRangeEnd;

  public NonLeakingReactTextInputEvent(
      int viewId,
      char[] text,
      char[] previousText,
      int rangeStart,
      int rangeEnd) {
    super(viewId);
    mText = text;
    mPreviousText = previousText;
    mRangeStart = rangeStart;
    mRangeEnd = rangeEnd;
  }

  @Override
  public String getEventName() {
    return EVENT_NAME;
  }

  @Override
  public boolean canCoalesce() {
    // We don't want to miss any textinput event, as event data is incremental.
    return false;
  }

  @Override
  public void dispatch(RCTEventEmitter rctEventEmitter) {
    rctEventEmitter.receiveEvent(getViewTag(), getEventName(), serializeEventData());
  }

  private WritableMap serializeEventData() {
    WritableMap eventData = Arguments.createMap();
    WritableMap range = Arguments.createMap();
    range.putDouble("start", mRangeStart);
    range.putDouble("end", mRangeEnd);

    eventData.putArray("text", charArrayToWritableArray(mText));
    eventData.putArray("previousText", charArrayToWritableArray(mPreviousText));
    eventData.putMap("range", range);

    eventData.putInt("target", getViewTag());
    return eventData;
  }
}
