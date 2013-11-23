var ubb = require("./library.js");
ubb.migrate({

    log: "debug",

    // ubb db config
    ubbDbConfig: {
        host: "127.0.0.1",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },

    // these NEED to start with ./whatever.json NOT whatever.json since I'm using require() to load them. I know, don't judge me pls.
    ubbTmpFiles: {
        users: "../tmp/ubb/users.json",
        categories: "../tmp/ubb/categories.json",
        forums: "../tmp/ubb/forums.json",
        topics: "../tmp/ubb/topics.json",
        posts: "../tmp/ubb/posts.json"
    },
    nbbTmpFiles: {
        users: "../tmp/nbb/users.json",
        // forums become categories in NBB, and I loose UBB categories
        categories: "../tmp/nbb/categories.json",
        topics: "../tmp/nbb/topics.json",
        posts: "../tmp/nbb/posts.json"
    },
    ubbToNbbMapFile: "../tmp/ubbToNbbMap.json",

    // optional, that's the default
    ubbTablePrefix: "ubbt_",

    // the stuff below for dev purposes, take them out
    // hard limit on the posts since they're huge
    ubbqTestLimit: {
        users: null,// 10000
        posts: null// 10000
    },
    // skip any of the these from get and put?
    skip: {
        users: false,
        categories: false,
        forums: false,
        topics: false,
        posts: true
    },
    // don't put anything to nbb db
    dontSaveToNbb: false,
    dontGetFromUbb: false
});