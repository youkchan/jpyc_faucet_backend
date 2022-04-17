import express = require("express");
import Web3 from "web3";
const cors = require('cors');
const HDWalletProvider = require("@truffle/hdwallet-provider");
const axios = require("axios");
const url = require('url')
const bodyParser = require('body-parser');
import * as dotenv from "dotenv";
import * as admin from "firebase-admin";
dotenv.config();
const PORT = Number(process.env.PORT) || 8081;
const CRON_ENV = process.env.CRON_ENV;
const BEARER_TOKEN = process.env.BEARER_TOKEN;
const TWITTER_URL = "https://api.twitter.com/2";
const TIPBOT_ID = "1474541604673560578";
const REQUEST_ACCEPTED = "JPYCの出金リクエストを受け付けました";
const THRESHOLD_BALANCE = "100000000000000000";
const SEND_AMOUNT = "100000000000000000";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: process.env.DB_NAME
});
var db = admin.database();

const provider = new HDWalletProvider({
  mnemonic: process.env.MNEMONIC,
  providerOrUrl: process.env.PROVIDER_MUMBAI,
  chainId: 80001,
});
provider.engine._blockTracker._pollingInterval = 1800000;

const web3 = new Web3(provider);


const app = express();
app.use(cors(
    {
        origin: [
            'http://localhost:8080',
            'https://jpyc-faucet.web.app'
        ]
    },
));
const address_whitelist = [
];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/", async (req, res) => {
    try {
        //res.header('Access-Control-Allow-Origin', process.env.APPURL as string)
        const tweet = req.body.tweet
        const parse = url.parse(tweet).pathname.split("/")
        const twitterAuthorID = await getTwitterAccountFromRequest(res, parse[3]);
        if(twitterAuthorID == 0){
            const response = {
                status: "error", 
                code: 20, 
                message: "Invalid URL"
            };

            //res.json('{ "status": "error", "code": 20, "message": "Invalid URL" }');
            res.json(JSON.stringify(response));
            return;
        }

        const twitterAccountListRef = db.ref("twitterAccountList").orderByChild("account").equalTo(String(twitterAuthorID));
        const twitterAccountSnapshot = await twitterAccountListRef.get();

        if(twitterAccountSnapshot.exists()){
            const response = {
                status: "error", 
                code: 30, 
                message: "Twitter Account Exceeded Limit!"
            };

            res.json(JSON.stringify(response));
            return;
        }

        const address = await getValidAddressFromRequest(res, parse[3]);
        if(!address){
            const response = {
                status: "error", 
                code: 40, 
                message: "Invalid Request"
            };

            res.json(JSON.stringify(response));
            return;
        }
        //const address = "0xfc976D96ccc57bC9D04AeA92A4a66Abd71926298";

        const addressListRef = db.ref("addressList").orderByChild("address").equalTo(address);
        const addressSnapshot = await addressListRef.get();
        if(addressSnapshot.exists()){
        }


        //await sendGas(address);
        await pushData(db.ref("twitterAccountList"), 
            {
              account: String(twitterAuthorID),
              timestamp: Date.now(),
            }
        );

        await pushData(db.ref("addressList"), 
            {
              address: address,
              timestamp: Date.now(),
            }
        );
        const response = {
            status: "ok", 
            code: 10, 
            message: "Sent assets to address!"
        };

        res.json(JSON.stringify(response));

    } catch(e: any) {
        const response = {
            status: "error", 
            code: 99, 
            //message: "Unexpected ERROR!"
            message: e.message 
        };

        res.json(JSON.stringify(response));
    }

});

/*app.get("/", async (req, res) => {

    //const tweet = "https://twitter.com/nuko973663/status/1509018961509175298?s=20&t=THqWaA_pHtb4KbHNSqLSbw"
    //const txid = "0x85a1b2a082f6eab46839f06631864071c42991c6a5ead49cea38cda553240e2f";
    //await validateTx(res, txid); 
    const tweet = req.query.tweet
    const parse = url.parse(tweet).pathname.split("/")
    const address = await getValidAddressFromRequest(res, parse[3]);
    if(!address){
        res.json('{ status: "error", result: "invalid request" }');
        return;
    }
    await sendGas(address);
    res.json('{ status: "ok", result: "sent assets to address" }');
    //txidで検索
    //whitelistのアドレスから送金があるかどうか確認
    //署名を検証してアドレス取得
    //アドレスのmatic残高を確認0.1以下じゃないと使えない
    //アドレスにmaticを送金
    //txidを保存（二回使えない様に
});*/

const server = app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

const pushData = async (dbRef: any, data: object) => {
    await dbRef.push().set(data);
};

const sendGas = async (address: string) => {
    const accounts = await web3.eth.getAccounts();
    const nonce = await web3.eth.getTransactionCount(accounts[0]);
    try {
        const tx = await web3.eth.sendTransaction({
          from: accounts[0],
          to: address,
          value: SEND_AMOUNT,
          nonce: nonce,
        }); 
        console.log(tx);
    } catch (e) {
        throw new Error('Tx cant send...');
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

const isRequestAccepted = (tweets: Array<any>, originalTweetIndex: number) => {
    const length = tweets.length;
    let isAccepted = false;
    for(let i = 0; i < length; i++) {
        const conversation = tweets[i];
        if(conversation.author_id != TIPBOT_ID) {
            continue;
        }

        const startIndex = conversation.text.indexOf(REQUEST_ACCEPTED);
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

/*const validateTx = async (res: any, txid: string) => {
    const tx = await web3.eth.getTransaction(txid);
    console.log(tx);
};*/

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
            return false;
        }
        const conversationResponse = await axios.get(TWITTER_URL + '/tweets/search/recent?query=conversation_id:' + body[0].conversation_id + "&tweet.fields=author_id", {
          headers: {
            Authorization: `Bearer ${BEARER_TOKEN}`,
          }
        })
        const length = conversationResponse.data.data.length;
        const originalTweetIndex = findOriginalTweetIndex(conversationResponse.data.data, tweetId, body[0].conversation_id);
        if(originalTweetIndex == -1) {
            return false;
        }

        const isAccepted = isRequestAccepted(conversationResponse.data.data, originalTweetIndex) ;

        if(await isEnoughBalance(address)) {
            return false;
        }
        return address;
    } catch (e) {
        return false;
    }

};


const logJSON = (logLevel : string , message : string) => {
  return JSON.stringify({
    severity: logLevel,
    message: message,
  });
}
