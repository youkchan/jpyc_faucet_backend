"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express = require("express");
var web3_1 = __importDefault(require("web3"));
var cors = require('cors');
var HDWalletProvider = require("@truffle/hdwallet-provider");
var axios = require("axios");
var url = require('url');
var bodyParser = require('body-parser');
var dotenv = __importStar(require("dotenv"));
var admin = __importStar(require("firebase-admin"));
var constant_1 = __importDefault(require("./constant"));
dotenv.config();
var PORT = Number(process.env.PORT) || 8081;
var BEARER_TOKEN = process.env.BEARER_TOKEN;
var TWITTER_URL = "https://api.twitter.com/2";
var GOOGLE_RECAPTCHA_URL = "https://www.google.com/recaptcha/api/siteverify";
var SCAN_URL = "https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=";
var TIPBOT_ID = "1474541604673560578";
var THRESHOLD_BALANCE = "10000000000000000";
var SUFFICIENT_BALANCE = "100000000000000000";
var SEND_AMOUNT = "20000000000000000";
var FIREBASE_TWITTER_ACCOUNTS_REF = "twitterAccountList";
var FIREBASE_ADDRESSES_REF = "addressList";
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.DB_NAME
});
var db = admin.database();
var provider = new HDWalletProvider({
    mnemonic: process.env.MNEMONIC,
    providerOrUrl: process.env.PROVIDER_POLYGON,
    chainId: 137
});
provider.engine._blockTracker._pollingInterval = 1800000;
var web3 = new web3_1["default"](provider);
var app = express();
app.use(cors({
    origin: [
        process.env.APPURL
    ]
}));
var address_whitelist = [];
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.post("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tweet, token, parse, response_1, result, response_2, twitterAuthorID, response_3, twitterAccountListRef, twitterAccountSnapshot, response_4, address, response_5, response_6, addressListRef, addressSnapshot, response_7, tx, response, e_1, response;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 11, , 12]);
                tweet = req.body.tweet;
                token = req.body.token;
                parse = url.parse(tweet).pathname.split("/");
                return [4 /*yield*/, isBalanceSufficient()];
            case 1:
                if (!(_a.sent())) {
                    response_1 = {
                        status: "error",
                        code: 80,
                        message: constant_1["default"].INSUFFICIENT_FUNDS
                    };
                    res.json(JSON.stringify(response_1));
                    return [2 /*return*/];
                }
                return [4 /*yield*/, axios.post(GOOGLE_RECAPTCHA_URL + "?secret=" + process.env.SITESECRET + "&response=" + token)];
            case 2:
                result = _a.sent();
                if (!result.data.success) {
                    response_2 = {
                        status: "error",
                        code: 20,
                        message: constant_1["default"].INVALID_RECAPTCHA
                    };
                    res.json(JSON.stringify(response_2));
                    return [2 /*return*/];
                }
                return [4 /*yield*/, getTwitterAccountFromRequest(res, parse[3])];
            case 3:
                twitterAuthorID = _a.sent();
                if (twitterAuthorID == 0) {
                    response_3 = {
                        status: "error",
                        code: 30,
                        message: constant_1["default"].INVALID_PARAMETER_URL
                    };
                    res.json(JSON.stringify(response_3));
                    return [2 /*return*/];
                }
                twitterAccountListRef = db.ref(FIREBASE_TWITTER_ACCOUNTS_REF).orderByChild("account").equalTo(String(twitterAuthorID));
                return [4 /*yield*/, twitterAccountListRef.get()];
            case 4:
                twitterAccountSnapshot = _a.sent();
                if (twitterAccountSnapshot.exists()) {
                    response_4 = {
                        status: "error",
                        code: 40,
                        message: constant_1["default"].EXCEED_TWITTER_ACCOUNT_LIMITATION
                    };
                    res.json(JSON.stringify(response_4));
                    return [2 /*return*/];
                }
                return [4 /*yield*/, getValidAddressFromRequest(res, parse[3])];
            case 5:
                address = _a.sent();
                if (address == null) {
                    response_5 = {
                        status: "error",
                        code: 50,
                        message: constant_1["default"].INVALID_PARAMETER_URL
                    };
                    res.json(JSON.stringify(response_5));
                    return [2 /*return*/];
                }
                return [4 /*yield*/, isEnoughBalance(address)];
            case 6:
                if (_a.sent()) {
                    response_6 = {
                        status: "error",
                        code: 60,
                        message: constant_1["default"].EXCEED_MATIC_TOKEN_LIMITATION
                    };
                    res.json(JSON.stringify(response_6));
                    return [2 /*return*/];
                }
                addressListRef = db.ref(FIREBASE_ADDRESSES_REF).orderByChild("address").equalTo(address);
                return [4 /*yield*/, addressListRef.get()];
            case 7:
                addressSnapshot = _a.sent();
                if (addressSnapshot.exists()) {
                    response_7 = {
                        status: "error",
                        code: 70,
                        message: constant_1["default"].EXCEED_ADDESS_LIMITATION
                    };
                    res.json(JSON.stringify(response_7));
                    return [2 /*return*/];
                }
                return [4 /*yield*/, sendGas(String(address))];
            case 8:
                tx = _a.sent();
                return [4 /*yield*/, pushData(db.ref(FIREBASE_TWITTER_ACCOUNTS_REF), {
                        account: String(twitterAuthorID),
                        timestamp: Date.now()
                    })];
            case 9:
                _a.sent();
                return [4 /*yield*/, pushData(db.ref(FIREBASE_ADDRESSES_REF), {
                        address: address,
                        timestamp: Date.now()
                    })];
            case 10:
                _a.sent();
                response = {
                    status: "ok",
                    code: 10,
                    txId: tx.transactionHash,
                    message: constant_1["default"].SENT_TOKEN
                };
                res.json(JSON.stringify(response));
                return [3 /*break*/, 12];
            case 11:
                e_1 = _a.sent();
                console.log(e_1);
                response = {
                    status: "error",
                    code: 99,
                    message: e_1.message
                };
                res.json(JSON.stringify(response));
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
var server = app.listen(PORT, function () {
    console.log("App listening on port ".concat(PORT));
});
var pushData = function (dbRef, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, dbRef.push().set(data)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
var sendGas = function (address) { return __awaiter(void 0, void 0, void 0, function () {
    var accounts, nonce, gasPrice, gasTracker, fastGasPrice, e_2, tx, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, web3.eth.getAccounts()];
            case 1:
                accounts = _a.sent();
                return [4 /*yield*/, web3.eth.getTransactionCount(accounts[0])];
            case 2:
                nonce = _a.sent();
                return [4 /*yield*/, web3.eth.getGasPrice()];
            case 3:
                gasPrice = _a.sent();
                _a.label = 4;
            case 4:
                _a.trys.push([4, 11, , 12]);
                _a.label = 5;
            case 5:
                _a.trys.push([5, 8, , 9]);
                return [4 /*yield*/, axios.get(SCAN_URL + process.env.SCANKEY)];
            case 6:
                gasTracker = _a.sent();
                return [4 /*yield*/, web3.utils.toWei(gasTracker.data.result.FastGasPrice, 'gwei')];
            case 7:
                fastGasPrice = _a.sent();
                gasPrice = fastGasPrice.toString(10);
                return [3 /*break*/, 9];
            case 8:
                e_2 = _a.sent();
                return [3 /*break*/, 9];
            case 9: return [4 /*yield*/, web3.eth.sendTransaction({
                    from: accounts[0],
                    to: address,
                    value: SEND_AMOUNT,
                    gasPrice: gasPrice,
                    nonce: nonce
                })];
            case 10:
                tx = _a.sent();
                console.log(tx);
                return [2 /*return*/, tx];
            case 11:
                e_3 = _a.sent();
                console.log(e_3);
                throw new Error(constant_1["default"].FAILED_TO_SEND_TX);
            case 12: return [2 /*return*/];
        }
    });
}); };
var getWithdrawalAddressFromTweet = function (tweet) { return __awaiter(void 0, void 0, void 0, function () {
    var searchTerm, startIndex, withdrawRequestBody, withdrawRequestBodyArray, amount, address;
    return __generator(this, function (_a) {
        if (tweet == "" || tweet == null) {
            return [2 /*return*/, null];
        }
        searchTerm = "@tipjpyc withdraw ";
        startIndex = tweet.indexOf(searchTerm);
        if (startIndex == -1) {
            return [2 /*return*/, null];
        }
        withdrawRequestBody = tweet.slice(startIndex + searchTerm.length);
        withdrawRequestBodyArray = withdrawRequestBody.split(" ");
        amount = withdrawRequestBodyArray[0];
        if (!isNumber(amount)) {
            return [2 /*return*/, null];
        }
        address = withdrawRequestBodyArray[1].split(/\n/);
        if (!web3.utils.isAddress(address[0])) {
            return [2 /*return*/, null];
        }
        return [2 /*return*/, address[0]];
    });
}); };
var isEnoughBalance = function (address) { return __awaiter(void 0, void 0, void 0, function () {
    var balance;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, web3.eth.getBalance(address)];
            case 1:
                balance = _a.sent();
                return [2 /*return*/, balance >= THRESHOLD_BALANCE];
        }
    });
}); };
var isBalanceSufficient = function () { return __awaiter(void 0, void 0, void 0, function () {
    var accounts, balance;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, web3.eth.getAccounts()];
            case 1:
                accounts = _a.sent();
                return [4 /*yield*/, web3.eth.getBalance(accounts[0])];
            case 2:
                balance = _a.sent();
                return [2 /*return*/, balance >= SUFFICIENT_BALANCE];
        }
    });
}); };
var isRequestAccepted = function (tweets, originalTweetIndex) {
    var length = tweets.length;
    var isAccepted = false;
    for (var i = 0; i < length; i++) {
        var conversation = tweets[i];
        if (conversation.author_id != TIPBOT_ID) {
            continue;
        }
        var startIndex = conversation.text.indexOf(constant_1["default"].REQUEST_ACCEPTED);
        if (startIndex == -1) {
            continue;
        }
        if (i + 1 == originalTweetIndex) {
            isAccepted = true;
        }
    }
    return isAccepted;
};
var findOriginalTweetIndex = function (tweets, originalTweetId, conversationId) {
    var length = tweets.length;
    if (originalTweetId == conversationId) {
        return length + 1;
    }
    for (var i = 0; i < length; i++) {
        var conversation = tweets[i];
        if (conversation.id == originalTweetId) {
            return i;
        }
    }
    return -1; //error
};
var isNumber = function (val) {
    var regexp = new RegExp(/^[0-9]+(\.[0-9]+)?$/);
    return regexp.test(val);
};
var getTwitterAccountFromRequest = function (res, tweetId) { return __awaiter(void 0, void 0, void 0, function () {
    var response, body, e_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, axios.get(TWITTER_URL + '/tweets?ids=' + tweetId + "&expansions=author_id", {
                        headers: {
                            Authorization: "Bearer ".concat(BEARER_TOKEN)
                        }
                    })];
            case 1:
                response = _a.sent();
                body = response.data.data;
                return [2 /*return*/, body[0].author_id];
            case 2:
                e_4 = _a.sent();
                return [2 /*return*/, 0];
            case 3: return [2 /*return*/];
        }
    });
}); };
var getValidAddressFromRequest = function (res, tweetId) { return __awaiter(void 0, void 0, void 0, function () {
    var response, body, address, conversationResponse, length_1, originalTweetIndex, isAccepted, e_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, axios.get(TWITTER_URL + '/tweets?ids=' + tweetId + "&tweet.fields=conversation_id", {
                        headers: {
                            Authorization: "Bearer ".concat(BEARER_TOKEN)
                        }
                    })];
            case 1:
                response = _a.sent();
                body = response.data.data;
                return [4 /*yield*/, getWithdrawalAddressFromTweet(body[0].text)];
            case 2:
                address = _a.sent();
                if (address == null) {
                    return [2 /*return*/, null];
                }
                return [4 /*yield*/, axios.get(TWITTER_URL + '/tweets/search/recent?query=conversation_id:' + body[0].conversation_id + "&tweet.fields=author_id", {
                        headers: {
                            Authorization: "Bearer ".concat(BEARER_TOKEN)
                        }
                    })];
            case 3:
                conversationResponse = _a.sent();
                length_1 = conversationResponse.data.data.length;
                originalTweetIndex = findOriginalTweetIndex(conversationResponse.data.data, tweetId, body[0].conversation_id);
                if (originalTweetIndex == -1) {
                    return [2 /*return*/, null];
                }
                isAccepted = isRequestAccepted(conversationResponse.data.data, originalTweetIndex);
                if (!isAccepted) {
                    return [2 /*return*/, null];
                }
                return [2 /*return*/, address];
            case 4:
                e_5 = _a.sent();
                return [2 /*return*/, null];
            case 5: return [2 /*return*/];
        }
    });
}); };
var logJSON = function (logLevel, message) {
    return JSON.stringify({
        severity: logLevel,
        message: message
    });
};
//# sourceMappingURL=index.js.map