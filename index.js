/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Find Gail!

This script receives a /whereisgail slash command from Slack and looks up
Gail's current location via her channel #whereisgail.

The channel's topic is read an output back to the user as a private message.

Finds Gail in three steps:

 * Authenticate users with Slack using OAuth
 * Receive messages using the slash_command event
 * Reply to Slash command both publicly and privately

 Created a Slack app via: https://api.slack.com/applications/new

 Used localtunnel to setup local webserver testing:
 
 clientId=<my client id> clientSecret=<my client secret> PORT=3000 node bot.js
   
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var botId = process.env.BOT_ID;
var channelId = "C0EGJMMM5";
var config = {};

if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({
            mongoUri: process.env.MONGOLAB_URI
        }),
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
    };
}

var controller = Botkit.slackbot(config).configureSlackApp({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    scopes: ['commands', 'bot'],
});

controller.setupWebserver(process.env.PORT, function(err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, function(err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});

const bot = controller.spawn({
    token: botId
});

bot.startRTM((err, bot, payload) => {
    if (err) {
        throw new Error('Blarg, could not connect to Slack:' + err);
    }
});

controller.on('rtm_open', (bot, message) => {
    console.info('** The whereisgail service just connected!');
});
controller.on('rtm_close', (bot, message) => {
    console.info('** The whereisgail service just closed!');
});

const Http = new XMLHttpRequest();
const url = 'https://slack.com/api/channels.info?token='+botId'+&channel=C0EGJMMM5';

Http.onreadystatechange = (e) => {
    console.info("Received response: " + Http.responseText);
    try {
        if (this.readyState == 4 && this.status == 200) {
            var json = JSON.parse(this.responseText);
            // channel -> topic -> value
            var response = json.channel.topic.value;
            bot.replyPrivate(response);
        } else {
            bot.replyPrivate("Blarg! Something went wrong. Try again later.");
        }
    } catch (err) {
        bot.replyPrivate("Blarg! Something went wrong. Try again later.");
    }
}

controller.on('slash_command', function(bot, message) {
    switch (message.command) {
        case "/whereisgail":
            // make sure the token matches!
            if (message.token !== process.env.VERIFICATION_TOKEN) return; //just ignore it.
            
            bot.replyPrivate(message, "Received slash command! url = " + url + " :: " + message.command);
      
            //Http.open("GET", url);
            //Http.send();
            break;
        default:
            bot.replyPrivate(message, "Huh!?  This shouldn't happen." + message.command);
    }
});
