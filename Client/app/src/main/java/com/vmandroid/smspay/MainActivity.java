package com.vmandroid.smspay;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsManager;
import android.telephony.SmsMessage;
import android.view.View;
import android.widget.EditText;
import android.widget.Toast;

public class MainActivity extends AppCompatActivity {
    private static final String SERVER_PHONE_NUMBER = "+15026842009";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        SMSReceiver.bindListener(new SMSListener() {
            @Override
            public void messageReceived(String messageText) {
                String messageContent[] = messageText.split(" ");
                if (messageContent.length == 4) {
                    if (messageContent[0].equalsIgnoreCase("pay")) {
                        String receiver = messageContent[1];
                        double amount = Double.parseDouble(messageContent[2]);
                        String transactionId = messageContent[3].substring(messageContent[3].indexOf("=")+1);
                        showAlertBox(receiver, amount, transactionId);
                    }
                }
            }
        });
    }

    public void showAlertBox(String receiver, double amount, final String transactionId) {
        new AlertDialog.Builder(MainActivity.this)
            .setIcon(R.drawable.ic_launcher_background)
            .setTitle("Transaction Alert")
            .setMessage("pay " + receiver + " " + amount + " transactionId=" + transactionId)
            .setPositiveButton("Confirm", new DialogInterface.OnClickListener()
            {
                @Override
                public void onClick(DialogInterface dialog, int which)
                {
                    sendTransactionConfirmationMessage(transactionId);
                    Toast.makeText(MainActivity.this, "Transaction Confirmed", Toast.LENGTH_SHORT).show();
                }
            })
            .setNegativeButton("Cancel", new DialogInterface.OnClickListener()
            {
                @Override
                public void onClick(DialogInterface dialog, int which)
                {
                    Toast.makeText(MainActivity.this, "Transaction Cancelled", Toast.LENGTH_SHORT).show();
                }
            }).show();
    }

    public void sendTransactionConfirmationMessage(String transactionId) {
        String sms = "ok " + transactionId;

        try {
            SmsManager smsManager = SmsManager.getDefault();
            smsManager.sendTextMessage(SERVER_PHONE_NUMBER, null, sms, null, null);
            Toast.makeText(getApplicationContext(), "SMS Sent=" + sms,
                    Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(getApplicationContext(), e.getMessage().toString(),
                    Toast.LENGTH_LONG).show();
        }
    }

    public void sendMessage(View view) {
        EditText amountText = (EditText) findViewById(R.id.amountText);
        EditText phoneText = (EditText) findViewById(R.id.phoneText);

        String amount = amountText.getText().toString();
        String phone = phoneText.getText().toString();

        String sms = "pay " + phone + " " + amount;

        try {
            SmsManager smsManager = SmsManager.getDefault();
            smsManager.sendTextMessage(SERVER_PHONE_NUMBER, null, sms, null, null);
            Toast.makeText(getApplicationContext(), "SMS Sent=" + sms,
                    Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(getApplicationContext(), e.getMessage().toString(),
                    Toast.LENGTH_LONG).show();
        }

        amountText.setText("");
        phoneText.setText("");
    }
}