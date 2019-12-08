package com.vmandroid.smspay;

import android.annotation.TargetApi;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;
import android.widget.Toast;

import static android.content.ContentValues.TAG;

public class SMSReceiver extends BroadcastReceiver {
    private static SMSListener listener;

    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle data  = intent.getExtras();

        Object[] pdus = (Object[]) data.get("pdus");

        for(int i=0;i<pdus.length;i++) {
            SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdus[i]);

            String sender = smsMessage.getDisplayOriginatingAddress();
            //Check the sender to filter messages which we require to read

            String messageBody = smsMessage.getMessageBody();
            //Pass the message text to interface
           listener.messageReceived(messageBody);
        }
    }

    public static void bindListener(SMSListener listenerObj) {
        listener = listenerObj;
    }
}
