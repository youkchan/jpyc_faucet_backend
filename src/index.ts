import express = require("express");
import Web3 from "web3";
const cors = require('cors');
const HDWalletProvider = require("@truffle/hdwallet-provider");
const axios = require("axios");
const url = require('url')
const bodyParser = require('body-parser');
import * as dotenv from "dotenv";
import * as admin from "firebase-admin";
import constant from './constant'
dotenv.config();
const PORT = Number(process.env.PORT) || 8081;
const BEARER_TOKEN = process.env.BEARER_TOKEN;
const TWITTER_URL = "https://api.twitter.com/2";
const GOOGLE_RECAPTCHA_URL = "https://www.google.com/recaptcha/api/siteverify";
const SCAN_URL = "https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=";
const TIPBOT_ID = "1474541604673560578";
const THRESHOLD_BALANCE = "10000000000000000";
const SUFFICIENT_BALANCE = "100000000000000000";
const SEND_AMOUNT = "20000000000000000";
const FIREBASE_TWITTER_ACCOUNTS_REF = "twitterAccountList";
const FIREBASE_ADDRESSES_REF = "addressList";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: process.env.DB_NAME
});
var db = admin.database();

const provider = new HDWalletProvider({
  mnemonic: process.env.MNEMONIC,
  providerOrUrl: process.env.PROVIDER_POLYGON,
  chainId: 137,
});
provider.engine._blockTracker._pollingInterval = 1800000;

const web3 = new Web3(provider);


const app = express();
app.use(cors(
    {
        origin: [
            process.env.APPURL
        ]
    },
));
const address_whitelist = [
];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/", async (req, res) => {
    try {

        const tweet = req.body.tweet
        const token = req.body.token
        const parse = url.parse(tweet).pathname.split("/")
       
        if(!(await isBalanceSufficient())){
            const response = {
                status: "error", 
                code: 80, 
                message: constant.INSUFFICIENT_FUNDS
            };

            res.json(JSON.stringify(response));
            return;
        }


        const result = await axios.post(GOOGLE_RECAPTCHA_URL + "?secret=" + process.env.SITESECRET + "&response=" + token);
        if(!result.data.success) {
            const response = {
                status: "error", 
                code: 20, 
                message: constant.INVALID_RECAPTCHA
            };

            res.json(JSON.stringify(response));
            return;

        }

        const twitterAuthorID = await getTwitterAccountFromRequest(res, parse[3]);
        if(twitterAuthorID == 0){
            const response = {
                status: "error", 
                code: 30, 
                message: constant.INVALID_PARAMETER_URL
            };

            res.json(JSON.stringify(response));
            return;
        }

        const twitterAccountListRef = db.ref(FIREBASE_TWITTER_ACCOUNTS_REF).orderByChild("account").equalTo(String(twitterAuthorID));
        const twitterAccountSnapshot = await twitterAccountListRef.get();

        if(twitterAccountSnapshot.exists()){
            const response = {
                status: "error", 
                code: 40, 
                message: constant.EXCEED_TWITTER_ACCOUNT_LIMITATION
            };

            res.json(JSON.stringify(response));
            return;
        }

        const address = await getValidAddressFromRequest(res, parse[3]);
        if(address == null){
            const response = {
                status: "error", 
                code: 50, 
                message: constant.INVALID_PARAMETER_URL
            };

            res.json(JSON.stringify(response));
            return;
        }

        if(await isEnoughBalance(address)) {
            const response = {
                status: "error", 
                code: 60, 
                message: constant.EXCEED_MATIC_TOKEN_LIMITATION
            };

            res.json(JSON.stringify(response));
            return;
        }

        const addressListRef = db.ref(FIREBASE_ADDRESSES_REF).orderByChild("address").equalTo(address);
        const addressSnapshot = await addressListRef.get();
        if(addressSnapshot.exists()){
            const response = {
                status: "error", 
                code: 70, 
                message: constant.EXCEED_ADDESS_LIMITATION
            };

            res.json(JSON.stringify(response));
            return;
        }


        const tx = await sendGas(String(address));
        await pushData(db.ref(FIREBASE_TWITTER_ACCOUNTS_REF), 
            {
              account: String(twitterAuthorID),
              timestamp: Date.now(),
            }
        );

        await pushData(db.ref(FIREBASE_ADDRESSES_REF), 
            {
              address: address,
              timestamp: Date.now(),
            }
        );
        const response = {
            status: "ok", 
            code: 10, 
            txId: tx.transactionHash, 
            message: constant.SENT_TOKEN
        };

        res.json(JSON.stringify(response));

    } catch(e: any) {
        console.log(e);
        const response = {
            status: "error", 
            code: 99, 
            message: e.message 
        };

        res.json(JSON.stringify(response));
    }

});

const server = app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

const pushData = async (dbRef: any, data: object) => {
    await dbRef.push().set(data);
};

const sendGas = async (address: string) => {
    const accounts = await web3.eth.getAccounts();
    const nonce = await web3.eth.getTransactionCount(accounts[0]);
    let gasPrice = await web3.eth.getGasPrice()
    try {

        try {
          const gasTracker = await axios.get(SCAN_URL + process.env.SCANKEY);
          const fastGasPrice = await web3.utils.toWei(gasTracker.data.result.FastGasPrice, 'gwei');
          gasPrice = fastGasPrice.toString(10);
        } catch (e) {
            /* no execution. use default */
        }
        const tx = await web3.eth.sendTransaction({
          from: accounts[0],
          to: address,
          value: SEND_AMOUNT,
          gasPrice: gasPrice,
          nonce: nonce,
        }); 
        console.log(tx);
        return tx;
    } catch (e) {
        console.log(e);
        throw new Error(constant.FAILED_TO_SEND_TX);
    }
}

const getWithdrawalAddressFromTweet = async (tweet: string) => {
    if(tweet == "" || tweet == null) {
        return null;
    }
    const searchTerm = "@tipjpyc withdraw ";
    const startIndex = tweet.indexOf(searchTerm);
    if(startIndex == -1) {
        return null;
    }
    const withdrawRequestBody = tweet.slice(startIndex + searchTerm.length);
    const withdrawRequestBodyArray = withdrawRequestBody.split(" ");
    const amount = withdrawRequestBodyArray[0];
    if(!isNumber(amount)) {
        return null;
    }
    const address = withdrawRequestBodyArray[1].split(/\n/);
    if(!web3.utils.isAddress(address[0])) {
        return null;
    }
    return address[0];
}

const isEnoughBalance = async (address: string) => {
    const balance = await web3.eth.getBalance(address);
    return balance >= THRESHOLD_BALANCE;
}

const isBalanceSufficient = async () => {
    const accounts = await web3.eth.getAccounts();
    const balance = await web3.eth.getBalance(accounts[0]);
    return balance >= SUFFICIENT_BALANCE;
}


const isRequestAccepted = (tweets: Array<any>, originalTweetIndex: number) => {
    const length = tweets.length;
    let isAccepted = false;
    for(let i = 0; i < length; i++) {
        const conversation = tweets[i];
        if(conversation.author_id != TIPBOT_ID) {
            continue;
        }

        const startIndex = conversation.text.indexOf(constant.REQUEST_ACCEPTED);
        if(startIndex == -1) {
            continue;
        }

        if(i + 1 == originalTweetIndex) {
            isAccepted = true;
        }
    }
    return isAccepted;
}

const findOriginalTweetIndex =  (tweets: Array<any>, originalTweetId: string, conversationId: string) => {
    const length = tweets.length;
    if(originalTweetId == conversationId) {
        return length + 1;
    }
    for(let i = 0; i < length; i++) {
        const conversation = tweets[i];
        if(conversation.id == originalTweetId) {
            return i;
        }
    }
    return -1; //error
}

const isNumber = (val: string) => {
  var regexp = new RegExp(/^[0-9]+(\.[0-9]+)?$/);
  return regexp.test(val);
}

const getTwitterAccountFromRequest = async (res: any, tweetId: string) => {
    try {
        const response = await axios.get(TWITTER_URL + '/tweets?ids=' + tweetId + "&expansions=author_id" , {
          headers: {
            Authorization: `Bearer ${BEARER_TOKEN}`,
          }
        });

        const body = response.data.data;
        return body[0].author_id;
    } catch (e) {
        return 0;
    }

}
const getValidAddressFromRequest = async (res: any, tweetId: string) => {
    try {
        const response = await axios.get(TWITTER_URL + '/tweets?ids=' + tweetId + "&tweet.fields=conversation_id" , {
          headers: {
            Authorization: `Bearer ${BEARER_TOKEN}`,
          }
        });

        const body = response.data.data;

        const address = await getWithdrawalAddressFromTweet(body[0].text);
        if(address == null){
            return null;
        }

        const conversationResponse = await axios.get(TWITTER_URL + '/tweets/search/recent?query=conversation_id:' + body[0].conversation_id + "&tweet.fields=author_id", {
          headers: {
            Authorization: `Bearer ${BEARER_TOKEN}`,
          }
        })
        const length = conversationResponse.data.data.length;
        const originalTweetIndex = findOriginalTweetIndex(conversationResponse.data.data, tweetId, body[0].conversation_id);

        if(originalTweetIndex == -1) {
            return null;
        }

        const isAccepted = isRequestAccepted(conversationResponse.data.data, originalTweetIndex) ;

        if(!isAccepted) {
            return null;
        }

        return address;
    } catch (e) {
        return null;
    }

};


const logJSON = (logLevel : string , message : string) => {
  return JSON.stringify({
    severity: logLevel,
    message: message,
  });
}
