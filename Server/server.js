const express = require('express');
const bodyParser = require("body-parser");
const http = require("http");

const app = express();
const querystring = require('querystring');
const idGenerator = require('shortid');

app.use(bodyParser.urlencoded({extended: true}));

var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/demo");

const MessagingResponse = require('twilio').twiml.MessagingResponse;

const accountSid = '<fill this>';
const authToken = '<fill this>';
const twilioClient = require('twilio')(accountSid, authToken);
var twilioPhoneNumber = "<fill this>";
var User = require('./models/User');
var TransactionData = require('./models/TransactionData');

app.post('/sms', (req, res) => {
	var sms = req.body.Body;
	var smsFields = sms.split(" ");
	var sender = req.body.From;
	/*
		check if SMS received is transaction confirmation or initiation
	*/
	if (smsFields.length == 2) {
		var transactionId = smsFields[1];
		var msg = smsFields[0];
		
		// if this is transaction confirmation then complete the transaction
		if (msg === 'ok') {
			TransactionData.find({"id":transactionId}, function(err, transactionDataList) {
				if (err) {
					console.log(err);
				} else {
					if (transactionDataList.length == 0) {
						console.log("invalid transaction id " + transactionId);
						// send error sms
					} else {
						var transactionData = transactionDataList[0];

						if (transactionData.from == sender) {
							completeTransaction(transactionData);
						} else {
							console.log("no transaction with id " + transactionId + " for " + sender);
						}
					}
				}
			});
		} else {
			console.log("invalid request: " + sms);
		}
	} else if (smsFields.length == 3) {
		var msg = smsFields[0];
		
		if (msg === "pay") {
			var toInfo = smsFields[1];
			var fromInfo = sender;
			var amountInfo = smsFields[2];
			var transactionId = idGenerator.generate();
			var transactionData = new TransactionData(
				{
					id: transactionId,
					from: fromInfo,
					to: toInfo,
					amount: amountInfo
				}
			);
			initiateTransaction(transactionData);
		} else if (msg === "receive") {
			var toInfo = sender
			var fromInfo = smsFields[1];
			var amountInfo = smsFields[2];
			var transactionId = idGenerator.generate();
			var transactionData = new TransactionData(
				{
					id: transactionId,
					from: fromInfo,
					to: toInfo,
					amount: amountInfo
				}
			);

			initiateTransaction(transactionData);
		} else {
			console.log("invalid request: " + sms);
		}
	} else {
		console.log("invalid request: " + sms);
	}

	res.send("Payment Server");
});


app.get('/', function (req, res) {
	res.send("Payment Server");
})

app.listen("8075", "10.1.0.4", function(){
	console.log("Server has started!");
});

function completeTransaction(transactionData) {
	completeTransactionForSender(transactionData);
}

function completeTransactionForSender(transactionData) {
	var from = transactionData.from;
	var to = transactionData.to;
	var amount = transactionData.amount;
	var transactionId = transactionData.id;

	User.find({"phone":from}, function(err, fromUsers) {
		if (err) {
			console.log(err);
		} else {
			var fromUser = fromUsers[0];
			var currentBalance = fromUser.balance;
			
			if (amount <= currentBalance) {
				currentBalance -= amount;
				User.findOneAndUpdate({"phone":from}, {$set: {"balance":currentBalance}}, {upsert: false}, function(err, user) {
					if (err) {
						console.log(err);
					} else {
						console.log("User with phone = " + fromUser.phone + " wallet debited by amount " + amount + 
							", new wallet balance=" + currentBalance);
						completeTransactionForReceiver(transactionData);
					}
				});
			} else {
				console.log("User with phone = " + fromUser.phone + " has low balance");
			}
		}
	});
}

function completeTransactionForReceiver(transactionData) {
	var from = transactionData.from;
	var to = transactionData.to;
	var amount = transactionData.amount;
	var transactionId = transactionData.id;

	User.find({"phone":to}, function(err, toUsers) {
		if (err) {
			console.log(err);
		} else {
			var toUser = toUsers[0];
			var currentBalance = toUser.balance;
			currentBalance += amount;
			User.findOneAndUpdate({"phone":to}, {$set: {"balance":currentBalance}}, {upsert:false}, function(err, user) {
				if (err) {
					console.log(err);
				} else {
					console.log("User with phone = " + toUser.phone + " wallet credited by amount " + amount + 
						", new wallet balance=" + currentBalance);
					deleteTransactionData(transactionData);
				}
			});
		}
	});
}

function deleteTransactionData(transactionData) {
	var transactionId = transactionData.id;
	
	TransactionData.findOneAndRemove({"id":transactionId}, function(err, transaction){
		if (err) {
			console.log(err);
		} else {
			console.log("Transaction Completed : " + transaction.id);
		}
	});
}

function initiateTransaction(transactionData) {
	var from = transactionData.from;
	var to = transactionData.to;
	var amount = transactionData.amount;
	var transactionId = transactionData.id;

	transactionData.save(function(err, data) {
		if (err) {
			console.log(err);
		} else {
			console.log("transaction created: " + data.id);
			sendInitTransactionSMS(transactionData);
		}
	});
}

function sendInitTransactionSMS(transactionData) {
	var sms = "pay " + transactionData.to + " " + transactionData.amount + " txid=" + transactionData.id;
	console.log("sending SMS=<" + sms + "> to " + transactionData.from); 
	twilioClient.messages
  	.create({
     		body: sms,
     		from: twilioPhoneNumber,
     		to: transactionData.from
   	}).then(message => console.log(message.sid));
}

