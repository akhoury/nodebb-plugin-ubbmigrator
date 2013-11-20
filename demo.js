var ubb = require("./library.js");
ubb.migrate({
    // ubb db config
    ubbDbConfig: {
        host: "127.0.0.1",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },
    // optional, that's the default
    ubbTablePrefix: "ubbt_",

    // the stuff below for dev purposes, take them out
    // hard limit on the posts since they're huge
    ubbqTestLimit: {
        posts: 10000
    },
    // skip any of the these from get and put?
    skip: {
        users: false,
        categories: false,
        topics: false,
        posts: false
    },
    // don't put anything to nbb db
    dontSaveToNbb: true
});