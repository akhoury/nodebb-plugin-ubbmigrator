var ubb = require("./library.js");
ubb.migrate({

    // or just "debug" for all
    //log: "info,warn,error",
    log: "debug",

    // ubb db config
    ubbDbConfig: {
        host: "localhost",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },

    // re-setup my nodebb installation, basically calling node app.js --setup={...} with the configs sepcified
    nbbReSetup: {
        run: true,
        flushdb: true,

        // these will be stringified into a string and passed to --setup
        config: {
            'admin:username': 'admin',
            'admin:password': 'password',
            'admin:password:confirm': 'password',
            'admin:email': 'you@example.com',

            'base_url': 'http://localhost',
            'port': '4567',
            'use_port': 'y',
            'redis:host': '127.0.0.1',
            'redis:port': 6379,
            'redis:password': '',
            'redis:database': 0,
            'bind_address': '0.0.0.0',
            'secret': ''
        }
    },

    // optional, that's the default
    ubbTablePrefix: "ubbt_",

    // the stuff below for dev purposes, take them out
    // hard timestamp in seconds limit on some stuff since they're huge
    ubbqTestLimitToBeforeTimestampSeconds: {
        // before 2004 sometime
        users: null, //1049942244, // null, //1081478244,
        topics: null, // null, //1049942244,
        posts: null // null //1049942244
    }
});
