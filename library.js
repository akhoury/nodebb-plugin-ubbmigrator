var //rdb = require('../../src/redis.js'),
    mysql = require("mysql"),

    //todo move this to a config file
    ubbConfig =  {
        host: "127.0.0.1",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },
    ubbConnected = false,
    ubbConnection = mysql.createConnection(ubbConfig);

var UBBMigrator = {

    ubbConnect: function(){
        if (!ubbConnected) {
            ubbConnection.connect();
            ubbConnected = true;
        }
    },

    ubbq: function(q, cb){
        this.ubbConnect();
        ubbConnection.query(q, cb);
    },

    // get ubb users
    getUBBUsers: function() {},

    ubbGetBannedUsers: function() {},

    ubbGetBannedEmails: function() {},

    ubbGtBannedHosts: function(){},


    // get ubb categories
    getUBBTopics: function() {},

    // get ubb topics
    getUBBTopics: function() {},

    // get ubb posts
    getUBBPosts: function() {}
};

module.exports = UBBMigrator;