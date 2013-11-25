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
    // hard timestamp in seconds limit on some stuff since they're huge
    ubbqTestLimitToBeforeTimestampSeconds: {
        // before 2004 sometime
        users: 1081478244,
        topics: 1049942244,
        posts: 1049942244
    },

    // don't put anything to nbb db
    dontSaveToNbb: false,
    dontGetFromUbb: false
});
