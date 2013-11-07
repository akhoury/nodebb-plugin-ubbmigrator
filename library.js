var 
    
    //rdb = require('../../src/redis.js'),
    mysql = require("mysql"),

    //todo move this to a config file
    ubbConfig =  {
        host: "127.0.0.1",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },
    ubbConnected = false,
    ubbConnection = mysql.createConnection(ubbConfig),
    
    UBBMigrator = {
        // connect to the ubb database
        ubbConnect: function(cb){
            cb = typeof cb == "function" ? cb : function(){};
        
            if (!ubbConnected) {
                ubbConnection.connect(function(err){
                    if (err) {
                        ubbConnected = false;
                        throw err;
                    }
                    ubbConnected = true;
                    cb();
                });
            } else {
                cb();    
            }
        },
    
        // disconnect from the ubb mysql database
        ubbDisconnect: function(){
            ubbConnection.end();
            ubbConnected = false;
        },

        // query ubb mysql database
        ubbq: function(q, cb){
            this.ubbConnect(function(){
                ubbConnection.query(q, cb);
            });
        },

        // get ubb users
        ubbGetUsers: function() {},

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
