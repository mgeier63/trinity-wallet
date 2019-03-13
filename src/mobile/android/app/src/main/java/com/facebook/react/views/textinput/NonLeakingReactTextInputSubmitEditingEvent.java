package com.facebook.react.views.textinput;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import static org.iota.mobile.Converter.charArrayToWritableArray;

/**
 * Event emitted by EditText native view when the user submits the text.
 */
/* package */ class NonLeakingReactTextInputSubmitEditingEvent
        extends Event<ReactTextInputSubmitEditingEvent> {

  private static final String EVENT_NAME = "topSubmitEditing";

  private char[] mText;

  public NonLeakingReactTextInputSubmitEditingEvent(
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
