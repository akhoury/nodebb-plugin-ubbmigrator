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

    writeJSONtoFile: function(){

    },

    throttleSelectQuery: function(columnsString, table, options) {
        options = options || {};
        options.limit = options.limit || 1000;
        options.queryCallback = options.queryCallback || function(){};

        var self = this;

        var total = 0;
        this.ubbq("SELECT COUNT(*) as total FROM " + table, function(err, rows){

            if (rows.length)
                total = rows[0]['total'] || 0;

            var funcs = [];

            var createfunc = function (i, total) {
                return function(a, b, c) {
                    return options.queryCallback(a, b, c, i >= total);
                };
            };

            for (var i = options.limit; i < total + options.limit; ) {
                funcs[i] = createfunc(i, total);
                i += options.limit;
            }

            console.log("TOTAL: " + total);
            for (var j = options.limit; j < total + options.limit; ) {
                var q = "SELECT " + columnsString + " FROM " + table + " LIMIT " + (j - options.limit) + ", "+ options.limit;
                // console.log(q);
                self.ubbq(q, funcs[j]);
                j += options.limit;
            }
        });
    },

    // get ubb users
    ubbGetUsers: function() {
        var users = [];
        this.throttleSelectQuery(
            // select
            "USER_ID as id, USER_LOGIN_NAME as username, USER_REGISTRATION_EMAIL as email, USER_IS_APPROVED as approved, USER_IS_banned as banned",
            // from
            "ubbt_USERS",
            {
                queryCallback: function(err, rows, fields, lastOne){
                    if (err) throw err;
                    users = users.concat(rows);
                    if (lastOne)
                        console.log(users.length);
                }
            }
        );
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
    getUBBPosts: function() {}
};