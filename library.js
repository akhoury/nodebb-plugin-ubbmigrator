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

    getUBBUsers: function() {
        this.ubbConnect();
        console.log("getUBBUsers called");
    },

    getUBBTopics: function() {
        this.ubbConnect();
        console.log("getUBBTopics called");
    },

    getUBBPosts: function() {
        this.ubbConnect();
        console.log("getUBBPosts called");
    }
};

module.exports = UBBMigrator;