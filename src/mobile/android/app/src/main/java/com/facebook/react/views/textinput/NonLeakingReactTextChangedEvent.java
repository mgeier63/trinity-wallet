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
public class NonLeakingReactTextChangedEvent extends Event<NonLeakingReactTextChangedEvent> {

  public static final String EVENT_NAME = "topChange";

  private char[] mText;
  private int mEventCount;

  public NonLeakingReactTextChangedEvent(
      int viewId,
      char[] text,
      int eventCount) {
    super(viewId);
    mText = text;
    mEventCount = eventCount;
  }

  @Override
  public String getEventName() {
    return EVENT_NAME;
  }

  @Override
  public void dispatch(RCTEventEmitter rctEventEmitter) {
    rctEventEmitter.receiveEvent(getViewTag(), getEventName(), serializeEventData());
  }

  private WritableMap serializeEventData() {
    WritableMap eventData = Arguments.createMap();
    eventData.putArray("text", charArrayToWritableArray(mText));
    eventData.putInt("eventCount", mEventCount);
    eventData.putInt("target", getViewTag());
    return eventData;
  }
}
