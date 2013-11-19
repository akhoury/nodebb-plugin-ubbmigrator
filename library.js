var

    // NodeBB Objects
    Categories = module.parent.require('./categories'),
    User = module.parent.require('./user'),
    Topic = module.parent.require('./topics'),
    Posts = module.parent.require('./posts'),

    // some useful modules
    // mysql to talk to ubb db
    mysql = require("mysql"),
    // exactly what it means, ubb uses html for some posts, nbb uses markdown, right?
    htmlToMarkdown = require("html-md"),
    // I'm lazy
    $ = require("jquery"),
    // you know what that is if you're looking at this source
    fs = require("fs"),

    //todo move this to a config file
    ubbConfig =  {
        host: "127.0.0.1",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },
    ubbPrefix = "ubbt_",

    // mysql connection to ubb database
    ubbConnection = mysql.createConnection(ubbConfig),
    // ubbData in memory for a little while
    ubbData = {
        users: [],
        usersProfiles: [],
        categories: [],
        forums: [],
        posts: []
    },

    // ubb to nbb map in memory
    MAP = {
        categories: {},
        users: {},
        topics: {},
        posts: {}
    };

module.exports = {

    // save the UBB categories to NodeBB's redis
    nbbSaveCategories: function(){
        var categories = require("./tmp/ubb/categories.json");

        // iterate over each
        Object.keys(categories).forEach(function(key, ci){
            // get the data from db
            var data = categories[key];

            // set some defaults since i don't have them
            data.icon = "icon-comment";
            data.blockclass = "category-blue";

            // order based on index i guess
            data.order = ci + 1;

            Categories.create(data, function(err, category){
                if (err) throw err;

                // save a reference from the old category to the new one
                MAP.categories[data.id] = category;

                console.log("[ubb][" + data.id + "]--->[nbb][/category/" + category.cid + "/" + category.slug);
            })
        });
    },

    // save the UBB users to NodeBB's redis
    nbbSaveUsers: function() {
        var self = this;
        var users = require("./tmp/ubb/users.json");
        var chars = '!@#$?)({}*.^qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890';

        // iterate over each
        Object.keys(users).forEach(function(key, ci){
            // get the data from db
            var data = users[key];

            // just being safe
            data.email = data.email ? data.email.toLowerCase() : "";
            data.username = data.username ? data.username.toLowerCase() : "";

            // I don't know about you about I noticed a lot my users have incomplete urls
            data.avatar = self._isValidUrl(data.avatar) ? data.avatar : undefined;
            data.homepage = self._isValidUrl(data.homepage) ? data.homepage : undefined;

            // generate a temp password, don't worry i'll add the clear text to the map so you can email it to the user
            // todo maybe make these 2 params as configs
            data.password = this._genRandPwd(13, chars);

            User.create(data.username, data.password, data.email, function(err, uid){
                if (err) throw err;

                User.getUserField(uid, "userslug", function(err, userslug){

                    // todo take out the password out of the log
                    console.log("[ubb][" + data.id + "]--->[nbb][/user/" + userslug + "?udi=" + uid + "&pwd=" + data.password);

                    // set some of the fields got from the ubb
                    User.setUserFields(uid, {
                        signature: htmlToMarkdown(data.signature),
                        website: data.homepage || "",
                        picture: data.avatar || undefined,
                        gravatarpicture: data.avatar || undefined,
                        banned: data.banned,
                        location: data.location,
                        joindate: data.created_at
                    });
                });

            })
        });
    },


    // connect to the ubb database
    ubbConnect: function(cb){
        cb = typeof cb == "function" ? cb : function(){};
        var self = this;

        console.log("ubbConnect Called; ubbConnected: " + self.ubbConnected);

        if (!self.ubbConnected) {
            ubbConnection.connect(function(err){
                if (err) {
                    self.ubbConnected = false;
                    // debugger;
                    // throw err;
                    cb();
                } else {
                    self.ubbConnected = true;
                    cb();
                }
            });
        } else {
            cb();
        }
    },

    // disconnect from the ubb mysql database
    ubbDisconnect: function(){
        ubbConnection.end();
        this.ubbConnected = false;
    },

    // query ubb mysql database
    ubbq: function(q, cb){
        this.ubbConnect(function(){
            ubbConnection.query(q, cb);
        });
    },

    writeJSONtoFile: function(file, json, cb){
        fs.writeFile(file, JSON.stringify(json, null, 4), cb);
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
        var self = this;
        this.throttleSelectQuery(
            // select
            "USER_ID as id, USER_LOGIN_NAME as username, USER_REGISTRATION_EMAIL as email,"
                + " USER_MEMBERSHIP_LEVEL as level, USER_REGISTERED_ON as created_at,"
                + " USER_IS_APPROVED as approved, USER_IS_banned as banned",
            // from
            "ubbPrefixUSERS",
            {
                queryCallback: function(err, rows, fields, lastOne){
                    if (err) throw err;
                    ubbData.users = ubbData.users.concat(rows);


                    if (lastOne) {
                        console.log("USERS: " + ubbData.users.length);
                        ubbData.users = self.convertListToMap(ubbData.users, "id");
                        self.ubbGetUsersProfiles(ubbData.users);
                    }
                }
            }
        );
    },

    convertListToMap: function(list, key){
        var map = {};
        list.forEach(function(item, ii) {
            map[item[key]] = item;
        });
        return map;
    },

    // get ubb users profiles
    ubbGetUsersProfiles: function(users) {
        var self = this;
        this.throttleSelectQuery(

            // select
            "USER_ID as id, USER_SIGNATURE as signature, USER_HOMEPAGE as homepage,"
                + " USER_OCCUPATION as occupation, USER_LOCATION as location,"
                + " USER_AVATAR as avatar, USER_TITLE as title,"
                + " USER_POSTS_PER_TOPIC as posts_per_topic, USER_TEMPORARY_PASSWORD as temp_password,"
                + " USER_TOTAL_POSTS as total_posts, USER_RATING as rating,"
                + " USER_TOTAL_RATES as total_rates, USER_BIRTHDAY as birthday,"
                + " USER_UNVERIFIED_EMAIL as unverified_email",
            // from
            "ubbPrefixUSER_PROFILE",
            {
                queryCallback: function(err, rows, fields, lastOne){
                    if (err) throw err;
                    ubbData.usersProfiles = ubbData.usersProfiles.concat(rows);

                    if (lastOne) {
                        console.log("USERS PROFILE: " + ubbData.usersProfiles.length);
                        ubbData.usersProfiles.forEach(function(profile){
                            ubbData.users[profile.id] = $.extend({}, profile, ubbData.users[profile.id]);
                        });

                        self.writeJSONtoFile("tmp/ubb/users.json", ubbData.users, function(err){
                            if(!err)
                                console.log("USERS-SAVED");
                            else
                                console.log("USERS-SAVING ERROR: " + err);
                        })
                    }
                }
            }
        );
    },

    // get ubb categories
    ubbGetCategories: function() {
        var self = this;
        this.throttleSelectQuery(
            // select
            "CATEGORY_ID as oid, CATEGORY_TITLE as name, CATEGORY_DESCRIPTION as description",
            // from
            "ubbPrefixCATEGORIES",
            {
                queryCallback: function(err, rows, fields, lastOne){
                    if (err) throw err;
                    ubbData.categories = ubbData.categories.concat(rows);
                    if (lastOne) {
                        console.log("CATEGORIES: " + ubbData.categories.length);
                        self.writeJSONtoFile("tmp/ubb/categories.json", ubbData.categories, function(err){
                            if(!err)
                                console.log("CATEGORIES-SAVED");
                            else
                                console.log("CATEGORIES-SAVING ERROR: " + err);
                        })
                    }

                }
            }
        );
    },

    _normalizeCategoties: function(rows){
        return rows.map(function(row, i){
            row["blockclass"] = ""
        });
    },

    // get ubb forums
    ubbGetForums: function() {
        var self = this;
        this.throttleSelectQuery(
            // select
            "FORUM_ID as id, FORUM_TITLE as title, FORUM_DESCRIPTION as description,"
                + " CATEGORY_ID as category_id, FORUM_CREATED_ON as created_at",
            // from
            "ubbPrefixFORUMS",
            {
                queryCallback: function(err, rows, fields, lastOne){
                    if (err) throw err;
                    ubbData.forums = ubbData.forums.concat(rows);
                    if (lastOne) {
                        console.log("FORUMS: " + ubbData.forums.length);
                        self.writeJSONtoFile("tmp/ubb/forums.json", ubbData.forums, function(err){
                            if(!err)
                                console.log("FORUMS-SAVED");
                            else
                                console.log("FORUMS-SAVING ERROR: " + err);
                        })
                    }
                }
            }
        );
    },

    // get ubb forums
    ubbGetPosts: function() {
        var self = this;
        this.throttleSelectQuery(
            // select
            "POST_ID as id, POST_PARENT_ID as parent, POST_PARENT_USER_ID as parent_user_id, TOPIC_ID as topic_id,"
                + " POST_POSTED_TIME as created_at, POST_SUBJECT as subject,"
                + " POST_BODY as body, POST_DEFAULT_BODY as default_body,",
            + " USER_ID as user_id, POST_DEFAULT_BODY as default_body,",
            + " POST_MARKUP_TYPE as markup, POST_IS_APPROVED as approved",
            // from
            "ubbPrefixPOSTS",
            {
                queryCallback: function(err, rows, fields, lastOne){
                    if (err) throw err;
                    ubbData.posts = ubbData.posts.concat(rows);
                    if (lastOne) {
                        console.log("POSTS: " + ubbData.posts.length);
                        self.writeJSONtoFile("tmp/ubb/posts.json", ubbData.posts, function(err){
                            if(!err)
                                console.log("POSTS-SAVED");
                            else
                                console.log("POSTS-SAVING ERROR: " + err);
                        })
                    }
                }
            }
        );
    },

    // check if valid url
    _isValidUrl: function(url){

        var pattern = new RegExp(
            + "^(https?:\\/\\/)?"
            + "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|"
            + "((\\d{1,3}\\.){3}\\d{1,3}))"
            + "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*"
            + "(\\?[;&a-z\\d%_.~+=-]*)?"
            + "(\\#[-a-z\\d_]*)?$", "i");

        if(!pattern.test(url)) {
            return false;
        } else {
            return true;
        }
    },

    // a helper method to generate temporary passwords
    _genRandPwd: function(len, chars) {
        var index = (Math.random() * (chars.length - 1)).toFixed(0);
        return len > 0 ? chars[index] + this._genRandPwd(len - 1, chars) : '';
    }
};