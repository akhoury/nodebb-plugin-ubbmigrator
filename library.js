/*
 if you're reading this source please not that "NodeBB" == "nbb" ==  "Nbb" == "NBB" as a terminology
 and ubb means the UBB Threads Forum Software, here's a link => http://www.ubbcentral.com/

 This Converter is written and tested for UBB 7.5.7, released in 2013,
 so.. if you're reading this in 2200, it's probably outdated.
 */

// todo user ranking formula to preserve the karma
// todo write up the posts from ubb migrator
// todo write up the topics to nbb migrator
// todo write up the posts to nbb migrator

// todo generate my nginx rewrite rules
// todo still, make sure the [YOUR_UBB_PATH]/images/avatars/* is still normally accessible to keep the old avatars
// todo clear the default categories in nodebb/install so I would start with fresh categories.

// todo send emails to all users with temp passwords
// todo if I have time, maybe implement a nbb plugin that enforces the 1 time use of temp passwords.
// todo TEST yo

"use strict";

var

// nbb Objects
//    Categories = module.parent.require('./categories'),
//    User = module.parent.require('./user'),
//    Topics = module.parent.require('./topics'),
//    Posts = module.parent.require('./posts'),

    Categories = {},
    User = {},
    Topics = {},
    Posts = {},

// some useful modules
// mysql to talk to ubb db
    mysql = require("mysql"),
// exactly what it means, ubb uses html for some posts, nbb uses markdown, right?
    htmlToMarkdown = require("html-md"),
// I'm lazy
    $ = require("jquery"),
    async = require("async"),
// you know what these are if you're looking at this source
    fs = require("fs"),
    http = require("http");

module.exports = {

    migrate: function(config){
        var self = this;
        async.series([
            function(next){
                self.cleanUp(config);
                next();
            },
            function(next){
                self.init(config, next);
            },
            function(next){
                self.ubbGetUsers(next);
            },
            function(next){
                self.ubbGetCategories(next);
            },
            function(next){
                self.ubbGetForums(next);
            },
            function(next){
                self.ubbGetPosts();
            },
            function(next){
                //self.nbbSaveCategories();
            },
            function(next){
                //self.nbbSaveUsers();
            },
            function(next){
                //self.nbbSaveTopics();
            },
            function(next){
                //self.nbbSavePosts();
            },
            function(next){
                self.ubbDisconnect();
                process.exit(1);
            }
        ]);

    },
    init: function(config, next){
        config = config || {};

        // todo: move this to a config file
        // todo: remove the defaults for user, password and database
        this.config = $.extend({}, {

            ubbDbConfig: null,
            ubbTablePrefix: "ubbt_",

            ubbTmpFiles: {
                users: "tmp/ubb/users.json",
                categories: "tmp/ubb/categories.json",
                forums: "tmp/ubb/forums.json",
                posts: "tmp/ubb/posts.json"
            },

            nbbTmpFiles: {
                users: "tmp/nbb/users.json",
                categories: "tmp/nbb/categories.json",
                topics: "tmp/nbb/topics.json",
                posts: "tmp/nbb/posts.json"
            },

            ubbToNbbMapFile: "tmp/ubbToNbbMap.json",

            ubbqTestLimit: {
                users: null,
                categories: null,
                forums: null,
                posts: null
            }
        }, config);

        // create a map from ubb ids to new nbb data
        // useful for saving clear temp passwords for users
        // and creating ReWriteRules
        this.ubbToNbbMap = {
            categories: {},
            users: {},
            topics: {},
            posts: {}
        };

        // in memory ubbData lists
        this.ubbData = {
            users: [],
            usersProfiles: [],
            categories: [],
            forums: [],
            posts: []
        };

        if (!this.config.ubbDbConfig) throw new Error("config.ubbDbConfig needs to be passed in to migrate()");

        // mysql connection to ubb database
        this.ubbConnection = mysql.createConnection(this.config.ubbDbConfig);
        this.ubbConnection.connect();

        if (typeof next == "function")
            next();

    },
    cleanUp: function(){},


    // save the UBB categories to nbb's redis
    nbbSaveCategories: function(next){
        var categories = require(this.config.ubbTmpFiles.categories);
        var self = this;
        var _categories = Object.keys(categories);

        // iterate over each
        _categories.forEach(function(key, ci){
            // get the data from db
            var data = categories[key];

            // set some defaults since i don't have them
            data.icon = "icon-comment";
            data.blockclass = "category-blue";

            // order based on index i guess
            data.order = ci + 1;

            Categories.create(data, function(err, category) {
                if (err) throw err;

                // you will need these to create "RewriteRules", i'll let you figure that out
                category._redirect = {
                    from: "[YOUR_UBB_PATH]/ubbthreads.php/category/" + data.ocid + "/*",
                    to: "[YOUR_NBB_PATH]/category/" + category.cid + "/" + category.slug
                };

                // save a reference from the old category to the new one
                self.ubbToNbbMap.categories[data.ocid] = category;

                console.log("[ubbmigrator][redirect]" + category._redirect.from + " ---> " + category._redirect.to);
            })
        });

        this.slowWriteJSONtoFile(this.config.nbbTmpFiles.categories, this.ubbToNbbMap.categories, function(err){
            if(!err)
                console.log("[ubbmigrator] " + _categories.length + " NBB Categories saved, MAP in " + self.config.nbbTmpFiles.categories);
            else
                console.log("[ubbmigrator][ERROR] Could not write NBB Categories " + err);
        });

        if (typeof next == "function")
            next();
    },

    // save the UBB users to nbb's redis
    nbbSaveUsers: function(next) {
        var self = this;
        var users = require(this.config.ubbTmpFiles.users);
        var chars = "!@#$?)({}*.^qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
        var _users = Object.keys(users);

        // iterate over each
        _users.forEach(function(key, ui){
            // get the data from db
            var data = users[key];

            if (!data.joindate) return;

            // just being safe
            data.originalUsername = data.username;
            data.username = data.username ? data.username.toLowerCase() : "";

            // nbb forces signtures to be less than 150 chars
            data.originalSignature = data.signature;
            data.signature = self.truncateStr(data.signature, 150);
            data.signatureMd = htmlToMarkdown(data.signature);

            // lower case the email as well, but I won't use it for the creation of the user
            // nbb tries to send an email at the creation of the user account
            // so after looking at nbb source, it looks like i can get away with setting some
            // email that doesn't work, but still validates, then after I set it back to the original email
            data.realEmail = data.email ? data.email.toLowerCase() : "";
            // todo: i should probably move that to a config, just in case you don't want to do that
            // also that will mess up the gravatar generated url, so I fix that at the end of each iteration, keep scrolling
            data.email = "unique.email.that.doesnt.work." + ui + "@but.still.validates.nbb.check.so";

            // I don't know about you about I noticed a lot my users have incomplete urls
            data.avatar = self._isValidUrl(data.avatar) ? data.avatar : undefined;
            data.website = self._isValidUrl(data.website) ? data.website : undefined;


            // generate a temp password, don't worry i'll add the clear text to the map so you can email it to the user
            // todo: maybe make these 2 params as configs
            data.clearPassword = this._genRandPwd(13, chars);

            User.create(data.username, data.clearPassword, data.email, function(err, uid){
                if (err) throw err;

                // saving that for the map
                data.uid = uid;

                User.getUserField(uid, "userslug", function(err, userslug){

                    data.userslug = userslug;

                    // set some of the fields got from the ubb
                    User.setUserFields(uid, {
                        // preseve the signature and website if there is any
                        signature: data.signatureMd,
                        website: data.website || "",
                        // if that user is banned, we would still h/im/er to be
                        banned: data.banned,
                        // reset the location
                        location: data.location || "",
                        // preserse the  joindate, luckily here, ubb uses timestamps too
                        joindate: data.joindate,
                        // now I set the real email back in
                        email: data.realEmail
                    });

                    // saving that for the map
                    data.email = data.realEmail;

                });

                // some sanity async checks
                if (data.website) {
                    self._checkUrlResponse(data.website, function(result){
                        // if it's not good
                        if (!result) {
                            User.setUserField(uid, "website", "", function(){
                                console.log("[ubbmigrator] User[" + uid + "].website[" + data.website + "] reset.");
                            });
                        }
                    });
                }

                if (data.avatar) {
                    self._checkUrlResponse(data.avatar, function(result){
                        var picUrl;

                        // if it's not good
                        if (!result) {
                            // nbb creates an avatar url so, if the user have an older one and still good, we keep it
                            // if not we try to create a gravatar from the realEmail not the fake one we created on top
                            picUrl = User.createGravatarURLFromEmail(data.realEmail);
                        } else {
                            picUrl = data.avatar;
                        }

                        User.setUserField(uid, "picture", picUrl, function(){
                            console.log("[ubbmigrator] User[" + uid + "].picture:[" + data.avatar + "] set to " + picUrl);
                        });
                        User.setUserField(uid, "gravatarpicture", picUrl, function(){
                            console.log("[ubbmigrator] User[" + uid + "].gravatarpicture:[" + data.avatar + "] set to " + picUrl);
                        });
                    });
                }

                data._redirect = {
                    from: "[YOUR_UBB_PATH]/ubbthreads.php/users/" + data.ouid + "/" + data.originalUsername + "*",
                    to: "[YOUR_NBB_PATH]/user/" + data.userslug
                };
                console.log("[ubbmigrator][redirect]" + data._redirect.from + " ---> " + data._redirect.to);

                // just save a copy in my big ubbToNbbMap for later, minus the correct website and avatar, who cares for now.
                self.ubbToNbbMap.users[data.ouid] = data;
            })
        });

        this.slowWriteJSONtoFile(this.config.nbbTmpFiles.users, this.ubbToNbbMap.users, function(err){
            if(!err)
                console.log("[ubbmigrator] " + _users.length + " NBB Users saved, MAP in " + self.config.nbbTmpFiles.users);
            else
                console.log("[ubbmigrator][ERROR] Could not write NBB Users " + err);
        });

        if (typeof next == "function")
            next();
    },


    // save the UBB topics to nbb's redis
    nbbSaveTopics: function(next){
        // topics chez nbb are forums chez ubb
        var topics = require(this.config.ubbTmpFiles.forums);
        var self = this;
        var _topics = Object.keys(topics);

        // iterate over each
        _topics.forEach(function(key, ti){
            // get the data from db
            var data = topics[key];

            Topics.create(data, function(err, topic){
                if (err) throw err;
                // save a reference from the old category to the new one
                self.ubbToNbbMap.topics[data.ofid] = topic;

                console.log("[ubbmigrator] [ubb][" + data.ofid + "]--->[nbb][/topic/" + topic.tid + "/" + topic.slug);
            });
        });

        this.slowWriteJSONtoFile(this.config.nbbTmpFiles.topics, this.ubbToNbbMap.topics, function(err){
            if(!err)
                console.log("[ubbmigrator] " + _topics.length + " NBB Topics saved, MAP in " + self.config.nbbTmpFiles.topics);
            else
                console.log("[ubbmigrator][ERROR] Could not write NBB Topics " + err);
        });

        if (typeof next == "function")
            next();
    },

    // save the UBB posts to nbb's redis
    nbbSavePosts: function(next){
        var posts = require("./tmp/ubb/posts.json");
        var self = this;
        var _posts = Object.keys(posts);

        // iterate over each
        _posts.forEach(function(key, pi){
            // get the data from db
            var data = topics[key];

            Posts.create(data, function(err, post){
                if (err) throw err;
                // save a reference from the old category to the new one
                self.ubbToNbbMap.topics[data.opid] = post;

                console.log("[ubbmigrator] [ubb][" + data.opid + "]--->[nbb][/post/" + post.pid + "/" + post.slug);
            })
        });

        this.slowWriteJSONtoFile(this.config.nbbTmpFiles.topics, this.ubbToNbbMap.topics, function(err){
            if(!err)
                console.log("[ubbmigrator] " + _posts.length + " NBB Topics saved, MAP in " + self.config.nbbTmpFiles.topics);
            else
                console.log("[ubbmigrator][ERROR] Could not write NBB Topics " + err);
        });

        if (typeof next == "function")
            next();
    },

    // get ubb users
    ubbGetUsers: function(next) {
        var self = this;
        this.ubbq(
            "SELECT USER_ID as ouid, USER_LOGIN_NAME as username, USER_REGISTRATION_EMAIL as email,"
                + " USER_MEMBERSHIP_LEVEL as level, USER_REGISTERED_ON as joindate,"
                + " USER_IS_APPROVED as approved, USER_IS_banned as banned"
                + " FROM " + self.config.ubbTablePrefix + "USERS"
                + (self.config.ubbqTestLimit.users ? " LIMIT " + self.config.ubbqTestLimit.users : ""),

            function(err, rows){
                self.ubbData.users = self.ubbData.users.concat(rows);
                self.ubbData.users = self._convertListToMap(self.ubbData.users, "ouid");
                self.ubbGetUsersProfiles(next);
            });
    },

    // get ubb users profiles
    ubbGetUsersProfiles: function(next) {
        var self = this;
        this.ubbq(
            "SELECT USER_ID as ouid, USER_SIGNATURE as signature, USER_HOMEPAGE as website,"
                + " USER_OCCUPATION as occupation, USER_LOCATION as location,"
                + " USER_AVATAR as avatar, USER_TITLE as title,"
                + " USER_POSTS_PER_TOPIC as PostsPerTopic, USER_TEMPORARY_PASSWORD as tempPassword,"
                + " USER_TOTAL_POSTS as totalPosts, USER_RATING as rating,"
                + " USER_TOTAL_RATES as totalRates, USER_BIRTHDAY as birthday,"
                + " USER_UNVERIFIED_EMAIL as unverifiedEmail"
                + " FROM " + self.config.ubbTablePrefix + "USER_PROFILE"
                + (self.config.ubbqTestLimit.users ? " LIMIT " + self.config.ubbqTestLimit.users : ""),

            function(err, rows){
                console.log("[ubbmigrator] UsersProfiles query came back with " + rows.length + " records, now writing to tmp dir, please be patient.");
                if (err) throw err;
                self.ubbData.usersProfiles = self.ubbData.usersProfiles.concat(rows);

                self.ubbData.usersProfiles.forEach(function(profile){
                    // mergin the userProfiles with users
                    self.ubbData.users[profile.ouid] = $.extend({}, profile, self.ubbData.users[profile.ouid]);
                });

                self.slowWriteJSONtoFile(self.config.ubbTmpFiles.users, self.ubbData.users, function(err){
                    if(!err)
                        console.log("[ubbmigrator] " + rows.length + " UBB Users saved in " + self.config.ubbTmpFiles.users);
                    else
                        console.log("[ubbmigrator][ERROR] Could not save UBB Users " + err);

                    if (typeof next == "function")
                        next();
                });
            });
    },

    // get ubb categories
    ubbGetCategories: function(next) {
        var self = this;
        this.ubbq(
            "SELECT CATEGORY_ID as ocid, CATEGORY_TITLE as name, CATEGORY_DESCRIPTION as description"
                + " FROM " + self.config.ubbTablePrefix + "CATEGORIES"
                + (self.config.ubbqTestLimit.categories ? " LIMIT " + self.config.ubbqTestLimit.categories : ""),

            function(err, rows){
                console.log("[ubbmigrator] Categories query came back with " + rows.length + " records, now writing to tmp dir, please be patient.");
                if (err) throw err;
                self.ubbData.categories = self.ubbData.categories.concat(rows);

                self.slowWriteJSONtoFile(self.config.ubbTmpFiles.categories, self.ubbData.categories, function(err){
                    if(!err)
                        console.log("[ubbmigrator] " + rows.length + " UBB Categories saved in " + self.config.ubbTmpFiles.categories);
                    else
                        console.log("[ubbmigrator][ERROR] Could not save UBB Categories " + err);

                    if (typeof next == "function")
                        next();
                });

            });
    },

    // get ubb forums
    // aka topics in nbb speak
    ubbGetForums: function(next) {
        var self = this;
        this.ubbq(
            "SELECT FORUM_ID as ofid, FORUM_TITLE as title, FORUM_DESCRIPTION as description,"
                + " CATEGORY_ID as categoryId, FORUM_CREATED_ON as joindate"
                + " FROM " + self.config.ubbTablePrefix + "FORUMS"
                + (self.config.ubbqTestLimit.forums ? " LIMIT " + self.config.ubbqTestLimit.forums : ""),

            function(err, rows){
                console.log("[ubbmigrator] Forums query came back with " + rows.length + " records, now writing to tmp dir, please be patient.");
                if (err) throw err;
                self.ubbData.forums = self.ubbData.forums.concat(rows);

                self.slowWriteJSONtoFile(self.config.ubbTmpFiles.forums, self.ubbData.forums, function(err){
                    if(!err)
                        console.log("[ubbmigrator] " + rows.length + " UBB Forums saved in " + self.config.ubbTmpFiles.forums);
                    else
                        console.log("[ubbmigrator][ERROR] Could not save UBB Forums " + err);

                    if (typeof next == "function")
                        next();
                });
            });
    },

    // get ubb forums
    ubbGetPosts: function(next) {
        var self = this;
        this.ubbq(
            "SELECT POST_ID as poid, POST_PARENT_ID as parent, POST_PARENT_USER_ID as parentUserId, TOPIC_ID as topicId,"
                + " POST_POSTED_TIME as datetime, POST_SUBJECT as subject,"
                + " POST_BODY as body, POST_DEFAULT_BODY as defaultBody, USER_ID as userId,"
                + " POST_MARKUP_TYPE as markup, POST_IS_APPROVED as approved"
                + " FROM " + self.config.ubbTablePrefix + "POSTS"
                + (self.config.ubbqTestLimit.posts ? " LIMIT " + self.config.ubbqTestLimit.posts : ""),

            function(err, rows){
                console.log("[ubbmigrator] Posts query came back with " + rows.length + " records, now writing to tmp dir, please be patient.");
                if (err) throw err;
                self.ubbData.posts = self.ubbData.posts.concat(rows);
                self.slowWriteJSONtoFile(self.config.ubbTmpFiles.posts, self.ubbData.posts, function(err){
                    if(!err)
                        console.log("[ubbmigrator] " + rows.length + " UBB Posts saved in " + self.config.ubbTmpFiles.posts);
                    else
                        console.log("[ubbmigrator][ERROR] Could not save UBB Posts " + err);

                    if (typeof next == "function")
                        next();
                });
            });
    },

    // disconnect from the ubb mysql database
    ubbDisconnect: function(){
        this.ubbConnection.end();
    },

    // query ubb mysql database
    ubbq: function(q, callback){
        this.ubbConnection.query(q, callback);
    },

    // writing json to file slowly, prop by prop to avoid Out of memory errors
    slowWriteJSONtoFile: function(file, json, callback) {
        fs.writeFileSync(file, "{");
        var first = true;
        for(var prop in json) {
            if(json.hasOwnProperty(prop)) {
                if(first)
                    first = false;
                else
                    fs.appendFileSync(file, ",\n");

                fs.appendFileSync(file, JSON.stringify(prop, null, 4) + ":" + JSON.stringify(json[prop], null, 4));
            }
        }
        fs.appendFileSync(file, "}\n");

        callback(null);
    },

    // writing json to file prop by prop to avoid Out of memory errors
    writeJSONtoFile: function(file, json, callback) {
        fs.writeFile(file, JSON.stringify(json, null, 4), callback);
    },

    // yea, for faster lookup
    _convertListToMap: function(list, key){
        var map = {};
        list.forEach(function(item) {
            map[item[key]] = item;
        });
        return map;
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

        return pattern.test(url);
    },

    // a helper method to generate temporary passwords
    _genRandPwd: function(len, chars) {
        var index = (Math.random() * (chars.length - 1)).toFixed(0);
        return len > 0 ? chars[index] + this._genRandPwd(len - 1, chars) : '';
    },

    _checkUrlResponse: function(url, callback) {
        http.get(url, function(res) {
            res.on("data", function(c){
                callback(true);
            });
            res.on("end", function() {
            });
            res.on("error", function() {
                callback(false)
            });
        });
    },

    truncateStr: function(str, len) {
        str = "" + str;
        len = len ? len - 3 : 30;

        if (str.length > len)
            return str.substring(0, len) + "...";
        else
            return str;
    }
};