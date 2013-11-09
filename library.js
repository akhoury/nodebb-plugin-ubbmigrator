var

//rdb = require('../../src/redis.js'),
    mysql = require("mysql"),
    bcrypt = require("bcrypt"),

//todo move this to a config file
    ubbConfig =  {
        host: "127.0.0.1",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },
    ubbPrefix = "ubbt_",
    ubbConnected = false,
    ubbConnection = mysql.createConnection(ubbConfig);

module.exports = {
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
    ubbGetUsers: function() {
        var users = [];
        var self = this;

        this.ubbq("", function(){

        });
    },

    ubbGetBannedUsers: function(cb) {
        var banned = {};
        this.ubbq("SELECT * FROM " + ubbPrefix + "BANNED_USERS;", function(err, rows){
            if (err) throw err;

            rows.forEach(function(row){
                banned[row.USER_ID] = row.BAN_REASON || "UNKNOWN";
            });

            console.log(banned);
            //cb(banned);
        });
    },

    ubbGetBannedEmails: function() {},

    ubbGtBannedHosts: function(){},

    // get ubb categories
    getUBBTopics: function() {},

    // get ubb topics
    getUBBTopics: function() {},

    // get ubb posts
    getUBBPosts: function() {},

    hashPassword: function(password, saltRounds) {
        bcrypt.genSalt(saltRounds, function(err, salt) {
            console.log(saltRounds + " salt: " + salt);
            bcrypt.hash(password, salt, function(err, pwd){
                if (err) throw err;
                console.log("saltRounds: " + saltRounds + ", " + password +  " --> " + pwd);
            });
        });
    }
};