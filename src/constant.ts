const constant =  Object.create({
    REQUEST_ACCEPTED: "JPYCの出金リクエストを受け付けました",
    INVALID_RECAPTCHA: "不正なデータです。リロードして再度実行してください",
    EXCEED_TWITTER_ACCOUNT_LIMITATION: "一つのTwitterアカウントから利用できる回数には制限があります",
    INVALID_PARAMETER_URL: "無効なURLです",
    EXCEED_MATIC_TOKEN_LIMITATION: "0.01Matic以上、トークンを保持しています",
    EXCEED_ADDESS_LIMITATION: "一つのアドレスで利用できる回数には制限があります",
    SENT_TOKEN: "トークンを送信しました!",
    FAILED_TO_SEND_TX: 'トランザクション 送信に失敗しました...',
    INSUFFICIENT_FUNDS: '残高が不足しています',
});

export default Object.freeze(constant);
