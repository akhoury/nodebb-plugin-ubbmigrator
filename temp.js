var ubb = require("./library.js");
ubb.migrate({

    ubbDbConfig: {
        host: "127.0.0.1",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },

    // hard limit on the posts since they're huge
    ubbqTestLimit: {
        posts: 10000
    }
});