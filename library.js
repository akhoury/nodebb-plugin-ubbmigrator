/*
 if you're reading this source please not that "NodeBB" == "nbb" ==  "Nbb" == "NBB" as a terminology
 and ubb means the UBB Threads Forum Software, here's a link => http://www.ubbcentral.com/

 This Converter is written and tested for UBB 7.5.7, released in 2013,
 so.. if you're reading this in 2200, it's probably outdated.
 */

// todo moderators?

// todo generate my nginx rewrite rules
// todo still, make sure the [YOUR_UBB_PATH]/images/avatars/* is still normally accessible to keep the old avatars
// todo clear the default categories in nodebb/install so I would start with fresh categories.

// todo send emails to all users with temp passwords
// todo if I have time, maybe implement a nbb plugin that enforces the 1 time use of temp passwords.
// todo TEST yo


"use strict";

var

// nbb Objects, required, these paths assume that the plugin lives in /NodeBB/node_modules/nodebb-plugin-ubbmigrator
// todo: the plugins page says to use this 'var User = module.parent.require('./user');' but that's working for some reason
    User = module.parent.require('../../src/user.js'),
    Topics = module.parent.require('../../src/topics.js'),
    Posts = module.parent.require('../../src/posts.js'),
    Categories = module.parent.require('../../src/categories.js'),
    utils = module.parent.require('../../public/src/utils.js'),

// some useful modules

// mysql to talk to ubb db
    mysql = require("mysql"),

// exactly what it means, ubb uses html for some posts, nbb uses markdown, right?
    htmlToMarkdown = require("html-md"),

// I'm lazy
    $ = require("jquery"),
    async = require("async"),
    fs = require("fs.extra"),
    http = require("http"),

// my quick logger
    Logger = require("./logger.js"),
    logger; //later to be initialized with configs

module.exports = {

    migrate: function(config){
        var self = this;
        async.series([
            function(next){
                self.init(config, next);
            },
            function(next){
                self.setup(next);
            },
            function(next){
                self.ubbGetAll(next);
            },
            function(next){
                self.nbbSaveAll(next);
            },
            function(){
                self.ubbDisconnect();
                process.exit(1);
            }
        ]);
    },

    init: function(config, next){
        config = config || {};

        this.config = $.extend({}, {

            log: "error",

            ubbDbConfig: null,
            ubbTablePrefix: "ubbt_",

            ubbTmpFiles: {
                users: "./tmp/ubb/users.json",
                categories: "./tmp/ubb/categories.json",
                forums: "./tmp/ubb/forums.json",
                topics: "./tmp/ubb/topics.json",
                posts: "./tmp/ubb/posts.json"
            },

            nbbTmpFiles: {
                users: "./tmp/nbb/users.json",
                // forums become categories in NBB, and I loose UBB categories
                categories: "./tmp/nbb/categories.json",
                topics: "./tmp/nbb/topics.json",
                posts: "./tmp/nbb/posts.json"
            },

            ubbToNbbMapFile: "./tmp/ubbToNbbMap.json",

            ubbqTestLimit: {
                users: null,
                categories: null,
                forums: null,
                topics: null,
                posts: null
            },

            skip: {
                users: false,
                categories: false,
                forums: false,
                topics: false,
                posts: false
            },

            // meaning this will reuse the ubb tmp files
            dontGetFromUbb: false,
            // meaning this won't insert into nbb db
            dontSaveToNbb: false,

            passwordGen: {
                chars: "!@#$?)({}*.^qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890",
                len: 13
            },

            nginx: {
                // if you want to append the each generated nginx rewrite rute to a file, enter the path of the file here
                // if you add "info" to the log config i,e "error,info" you will see the resulted logs in stdout
                writeTo: null,
                // this may not be neccessary
                pathsEncodeURI: false,

                // ONLY replace the MY_UBB_PATH and MY_NBB_PATH and leave the ${FROM} and ${TO} as they will be replaced appropriately
                // example: rewrite ^/MY_UBB_PATH/users/123(.*)$ /MY_NBB_PATH/user/elvis/$1 last;
                rule: " rewrite ^/MY_UBB_PATH/${FROM}(.*)$ /MY_NBB_PATH/${TO}$1 permanent;"
            }

        }, config);

        logger = Logger.init("debug");

        if (typeof next == "function")
            next();
    },

    setup: function(next){
        var self = this;

        // create a map from ubb ids to new nbb data
        // useful for saving clear temp passwords for users
        // and creating ReWriteRules
        this.ubbToNbbMap = {
            users: {},
            categories: {},
            topics: {},
            posts: {},
            skippedUsers: {}
        };

        // in memory ubbData lists
        this.ubbData = {
            users: [],
            usersProfiles: [],
            categories: [],
            forums: [],
            topics: [],
            posts: []
        };

        if (!this.config.ubbDbConfig) throw new Error("config.ubbDbConfig needs to be passed in to migrate()");

        // mysql connection to ubb database
        this.ubbConnection = mysql.createConnection(this.config.ubbDbConfig);
        this.ubbConnection.connect();

        if (!this.config.dontGetFromUbb)
            Object.keys(this.config.ubbTmpFiles).forEach(function(key){
                fs.createFileSync(self.config.ubbTmpFiles[key]);
            });

        Object.keys(this.config.nbbTmpFiles).forEach(function(key){
            fs.createFileSync(self.config.ubbTmpFiles[key]);
        });

        fs.createFileSync(this.config.ubbToNbbMapFile);

        if (typeof next == "function")
            next();
    },


    ubbGetAll: function(next) {
        var self = this;
        if (!self.config.dontGetFromUbb) {
            async.series([
                function (next) {
                    if (self.config.skip.users)
                        next();
                    else
                        self.ubbGetUsers(next);
                },
                function (next) {
                    if (self.config.skip.categories)
                        next();
                    else
                        self.ubbGetCategories(next);
                },
                function (next) {
                    if (self.config.skip.forums)
                        next();
                    else
                        self.ubbGetForums(next);
                },
                function (next) {
                    if (self.config.skip.topics)
                        next();
                    else
                        self.ubbGetTopics(next);
                },
                function (next) {
                    if (self.config.skip.posts)
                        next();
                    else
                        self.ubbGetPosts(next);
                }
            ]);
        } else {
            if (typeof next == "function")
                next();
        }
    },

    // get ubb users
    ubbGetUsers: function(next) {
        var self = this;
        this.ubbq(
            "SELECT USER_ID as _ouid, USER_LOGIN_NAME as _username, USER_DISPLAY_NAME as _userDisplayName, USER_REGISTRATION_EMAIL as _email,"
                + " USER_MEMBERSHIP_LEVEL as _level, USER_REGISTERED_ON as _joindate,"
                + " USER_IS_APPROVED as _approved, USER_IS_banned as _banned"
                + " FROM " + self.config.ubbTablePrefix + "USERS"
                + (self.config.ubbqTestLimit.users ? " LIMIT " + self.config.ubbqTestLimit.users : ""),

            function(err, rows){
                self.ubbData.users = self.ubbData.users.concat(rows);
                self.ubbData.users = self._convertListToMap(self.ubbData.users, "_ouid");
                // todo: combine the usersProfiles and users in one query, seriously bro?
                self.ubbGetUsersProfiles(next);
            });
    },

    // get ubb users profiles
    ubbGetUsersProfiles: function(next) {
        var self = this;
        this.ubbq(
            "SELECT USER_ID as _ouid, USER_SIGNATURE as _signature, USER_HOMEPAGE as _website,"
                + " USER_OCCUPATION as _occupation, USER_LOCATION as _location,"
                + " USER_AVATAR as _avatar, USER_TITLE as _title,"
                + " USER_POSTS_PER_TOPIC as _postsPerTopic, USER_TEMPORARY_PASSWORD as _tempPassword,"
                + " USER_TOTAL_POSTS as _totalPosts, USER_RATING as _rating,"
                + " USER_TOTAL_RATES as _totalRates, USER_BIRTHDAY as _birthday,"
                + " USER_UNVERIFIED_EMAIL as _unverifiedEmail"
                + " FROM " + self.config.ubbTablePrefix + "USER_PROFILE"
                + (self.config.ubbqTestLimit.users ? " LIMIT " + self.config.ubbqTestLimit.users : ""),

            function(err, rows){
                if (err) throw err;

                logger.debug(" UsersProfiles query came back with " + rows.length + " records, now filtering then writing to tmp dir, please be patient.");
                self.ubbData.usersProfiles = rows;

                self.ubbData.usersProfiles.forEach(function(profile){
                    // merging the userProfiles with users
                    self.ubbData.users[profile._ouid] = $.extend({}, profile, self.ubbData.users[profile._ouid]);
                });

                self._filterSaveUbbUsers(self.ubbData.users);
                self._mdUbbUsersSignatures();
            });
    },


    _makeValidNbbUsername: function(_username, _userDisplayName, _ouid) {
        var self = this
            , validUsername = false
            , username = _username ? self.cleanUsername(_username.toLowerCase()) : ""
            , userslug = utils.slugify(username || "");

        // if it's invalid by NodeBB's rules, i'll give the ubb.userDisplayName a try before I give up on that user account
        if (!utils.isUserNameValid(username) || !userslug) {

            logger.warn("[" + _ouid + "] " + "username: " + _username + " invalid... trying the user's display name...");
            username = _userDisplayName ? self.cleanUsername(_userDisplayName) : "";
            userslug = utils.slugify(username || "");

            if (!utils.isUserNameValid(username) || !userslug) {
                logger.warn("username: " + username + " still invalid, skipping ...");
            } else {
                validUsername = true;
            }

        } else {
            validUsername = true;
        }

        return {username: username, userslug: userslug,  validUsername: validUsername, _username: _username, _userDisplayName: _userDisplayName};
    },

    _filterSaveUbbUsers: function(users) {
        var self = this, counter = 0, first = true;
        var arr = Object.keys(users);

        fs.writeFileSync(self.config.ubbTmpFiles.users, "");

        arr.forEach(function(_ouid, ui){
            var user = users[_ouid];
            if (user._username && user._joindate && user._email) {

                user = $.extend({}, user, self._makeValidNbbUsername(user._username, user._userDisplayName, user._ouid));
                if (user.validUsername) {

                    // nbb forces signatures to be less than 150 chars
                    user.signature = self.truncateStr(user._signature || "", 150);

                    // lower case the email as well, but I won't use it for the creation of the user
                    // nbb tries to send an email at the creation of the user account
                    // so after looking at nbb source, it looks like i can get away with setting some
                    // email that doesn't work, but still validates, then after I set it back to the original email
                    user._email = user._email.toLowerCase();
                    // todo: i should probably move that to a config, just in case you don't want to do that
                    // also that will mess up the gravatar generated url, so I fix that at the end of each iteration, keep scrolling
                    user.email = "unique.email.that.doesnt.work." + user._ouid + "@but.still.validates.nbb.check";

                    // I don't know about you about I noticed a lot my users have incomplete urls
                    //user.avatar = self._isValidUrl(user._avatar) ? user._avatar : "";
                    //user.website = self._isValidUrl(user._website) ? user._website : "";
                    // the one above was taking too long
                    user.avatar = self._isValidUrlSimple(user._avatar) ? user._avatar : "";
                    user.website = self._isValidUrlSimple(user._website) ? user._website : "";

                    // generate a temp password, don't worry i'll add the clear text to the map so you can email it to the user
                    user.password = self._genRandPwd(self.config.passwordGen.len, self.config.passwordGen.chars);

                    //users[_ouid] = user;

                    fs.appendFileSync(self.config.ubbTmpFiles.users, (first ? "[" : ",\n") + JSON.stringify(user, null, 4));

                    if (first)
                        first = false;

                    if (counter % 1000 == 0)
                        logger.info(" saved " + counter + " users so far.");

                    users[_ouid] = user;
                    counter++;
                } else {
                    logger.debug("[!username] skipping user " + user._username + ":" + user._email + " _ouid: " + _ouid);
                    delete users[_ouid];
                }
            } else {
                logger.debug("[!_username | !_joindate | !_email] skipping user " + user._username + ":" + user._email + " _ouid: " + _ouid);
                delete users[_ouid];
            }
        });
        fs.appendFileSync(self.config.ubbTmpFiles.users, "]");

        logger.info(" saved " + counter + " users.");
        logger.debug("filtering " + arr.length + " users done");
        return users;
    },

    _mdUbbUsersSignatures: function() {
        var self = this, counter = 0;
        var users = require(self.config.ubbTmpFiles.users);
        var arr = Object.keys(users);

        fs.writeFileSync(self.config.ubbTmpFiles.users + ".md", "");

        arr.forEach(function(_ouid, ui){
            var user = users[_ouid];
            user.signatureMd = self.hazHtml(user.signature) ? htmlToMarkdown(user.signature) : user.signature;
            fs.appendFileSync(self.config.ubbTmpFiles.users + ".md", JSON.stringify(user, null, 4) + ",\n");

            if (counter % 1000 == 0)
                logger.info("'Markdowning' signatures processed " + counter + " users so far.");

            counter++;
        });
        logger.info("'Markdowning' signatures processed " + counter + " users.");
        logger.debug("Markdowning " + arr.length + " users done");
        return users;
    },

    // get ubb categories
    // I don't actually use these?
    // since the ubb.forums become the nbb.categories
    // if you want them .. use them.
    ubbGetCategories: function(next) {
        var self = this;
        this.ubbq(
            "SELECT CATEGORY_ID as ocid, CATEGORY_TITLE as name, CATEGORY_DESCRIPTION as description"
                + " FROM " + self.config.ubbTablePrefix + "CATEGORIES"
                + (self.config.ubbqTestLimit.categories ? " LIMIT " + self.config.ubbqTestLimit.categories : ""),

            function(err, rows){
                logger.debug(" Categories query came back with " + rows.length + " records, now writing to tmp dir, please be patient.");
                if (err) throw err;
                self.ubbData.categories = self._convertListToMap(rows, "ocid");

                self.slowWriteJSONtoFile(self.config.ubbTmpFiles.categories, self.ubbData.categories, function(err){
                    if(!err)
                        logger.debug(rows.length + " UBB Categories saved in " + self.config.ubbTmpFiles.categories);
                    else
                        logger.debug("Could not save UBB Categories " + err);

                    if (typeof next == "function")
                        next();
                });

            });
    },

    // get ubb forums
    ubbGetForums: function(next) {
        var self = this;
        this.ubbq(
            "SELECT FORUM_ID as ofid, FORUM_TITLE as title, FORUM_DESCRIPTION as description,"
                + " CATEGORY_ID as categoryId, FORUM_CREATED_ON as datetime"
                + " FROM " + self.config.ubbTablePrefix + "FORUMS"
                + (self.config.ubbqTestLimit.forums ? " LIMIT " + self.config.ubbqTestLimit.forums : ""),

            function(err, rows){
                logger.debug(" Forums query came back with " + rows.length + " records, now writing to tmp dir, please be patient.");
                if (err) throw err;
                self.ubbData.forums = self._convertListToMap(rows, "ofid");

                self.slowWriteJSONtoFile(self.config.ubbTmpFiles.forums, self.ubbData.forums, function(err){
                    if(!err)
                        logger.debug(" " + rows.length + " UBB Forums saved in " + self.config.ubbTmpFiles.forums);
                    else
                        logger.debug(" Could not save UBB Forums " + err);

                    if (typeof next == "function")
                        next();
                });
            });
    },

    // get ubb topics
    ubbGetTopics: function(next) {
        var self = this;
        this.ubbq(
            "SELECT TOPIC_ID as otid, FORUM_ID as forumId, POST_ID as postId,"
                + " USER_ID as userId, TOPIC_VIEWS as views,"
                + " TOPIC_SUBJECT as subject, TOPIC_REPLIES as replies,"
                + " TOPIC_TOTAL_RATES as totalRates, TOPIC_RATING as rating,"
                + " TOPIC_CREATED_TIME as datetime, TOPIC_IS_APPROVED as approved,"
                + " TOPIC_STATUS as status, TOPIC_IS_STICKY as pinned"
                + " FROM " + self.config.ubbTablePrefix + "TOPICS"
                + (self.config.ubbqTestLimit.topics ? " LIMIT " + self.config.ubbqTestLimit.topics : ""),

            function(err, rows){
                logger.debug(" Topics query came back with " + rows.length + " records, now writing to tmp dir, please be patient.");
                if (err) throw err;
                self.ubbData.topics = self._convertListToMap(rows, "otid");

                self.slowWriteJSONtoFile(self.config.ubbTmpFiles.topics, self.ubbData.topics, function(err){
                    if(!err)
                        logger.debug(" " + rows.length + " UBB Topics saved in " + self.config.ubbTmpFiles.topics);
                    else
                        logger.debug(" Could not save UBB Topics " + err);

                    if (typeof next == "function")
                        next();
                });
            });
    },

    // get ubb forums
    ubbGetPosts: function(next) {
        var self = this;
        this.ubbq(
            "SELECT POST_ID as opid, POST_PARENT_ID as parent, POST_PARENT_USER_ID as parentUserId, TOPIC_ID as topicId,"
                + " POST_POSTED_TIME as datetime, POST_SUBJECT as subject,"
                + " POST_BODY as body, POST_DEFAULT_BODY as defaultBody, USER_ID as userId,"
                + " POST_MARKUP_TYPE as markup, POST_IS_APPROVED as approved"
                + " FROM " + self.config.ubbTablePrefix + "POSTS"
                + (self.config.ubbqTestLimit.posts ? " LIMIT " + self.config.ubbqTestLimit.posts : ""),

            function(err, rows){
                logger.debug(" Posts query came back with " + rows.length + " records, now writing to tmp dir, please be patient.");
                if (err) throw err;
                self.ubbData.posts = self._convertListToMap(rows, "opid");
                self.slowWriteJSONtoFile(self.config.ubbTmpFiles.posts, self.ubbData.posts, function(err){
                    if(!err)
                        logger.debug(" " + rows.length + " UBB Posts saved in " + self.config.ubbTmpFiles.posts);
                    else
                        logger.debug(" Could not save UBB Posts " + err);

                    if (typeof next == "function")
                        next();
                });
            });
    },

    // save to Nbb
    nbbSaveAll: function(next){
        var self = this;
        if (!self.config.dontSaveToNbb) {
            async.series([
                function(next){
                    if (self.config.skip.users)
                        next();
                    else
                        self.nbbSaveUsers(next);
                },
                function(next){
                    // ubb.forums ===> nbb.categories
                    if (self.config.skip.forums)
                        next();
                    else
                        self.nbbSaveCategories(next);
                },
                function(next){
                    if (self.config.skip.topics)
                        next();
                    else
                        self.nbbSaveTopics(next);
                },
                function(next){
                    if (self.config.skip.posts)
                        next();
                    else
                        self.nbbSavePosts(next);
                }
            ]);
        } else {
            if (typeof next == "function")
                next();
        }
    },

// save the UBB users to nbb's redis
    nbbSaveUsers: function(next) {
        var self = this;
        var users = require(this.config.ubbTmpFiles.users);
        var _users = Object.keys(users);

        // iterate over each
        _users.forEach(function(key, ui) {
            // get the data from db
            var user = users[key];

            logger.debug("saving username: " + data.username + " [" + ui + "]");

            async.waterfall([
                function(cb){
                    User.create(user.username, user.password, user.email, function(err, uid) {
                        if (err) {
                            logger.error(" username: " + user.username + " : " + err);
                            cb(err, uid);
                        } else {
                            cb(null, uid);
                        }
                    });
                },
                function(err, uid, cb) {
                    if (err) cb(err);

                    // saving that for the map
                    user.uid = uid;

                    // set some of the fields got from the ubb
                    User.setUserFields(uid, {
                        // preseve the signature and website if there is any
                        signature: user.signatureMd,
                        website: user.website || "",
                        // if that user is banned, we would still h/im/er to be
                        banned: user._banned,
                        // reset the location
                        location: user._location || "",
                        // preserse the  joindate, luckily here, ubb uses timestamps too
                        joindate: user._joindate,
                        // now I set the real email back in
                        email: user._email
                    });

                    cb(null, null, user.userslug);
                },
                function(err, userslug, cb){
                    if (err)
                        cb(err);

                    user.redirectRule = self.redirectRule("users/" + data.ouid + "/" + data.originalUsername + "/", "user/" + userslug);
                    self.ubbToNbbMap.users[user._ouid] = user;

                    cb(err);
                }
            ], function(err){
                // just save a copy in my big ubbToNbbMap for later, minus the correct website and avatar, who cares for now.
                if (!err) {
                    self.slowWriteJSONtoFile(self.config.nbbTmpFiles.users, self.ubbToNbbMap.users, function(error) {
                        if (!error)
                            logger.info(_users.length + " NBB Users saved, MAP in " + self.config.nbbTmpFiles.users);
                        else
                            logger.error("Could not write NBB Users " + err);
                    });
                }
            });
        });
    },

    redirectRule: function(from, to) {
        var res = this.config.nginx.rule.replace("${FROM}", from).replace("${TO}", to);
        logger.info(res);
        return res;
    },

// save the UBB categories to nbb's redis
// ubb.forums == nbb.categories
    nbbSaveCategories: function(next){
        var categories = require(this.config.ubbTmpFiles.forums);
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

            logger.debug(" saving category: " + data.title);
            Categories.create(data, function(err, category) {
                if (err) throw err;

                // you will need these to create "RewriteRules", i'll let you figure that out
                category._redirect = {
                    from: "[YOUR_UBB_PATH]/ubbthreads.php/forums/" + data.ofid + "/*",
                    to: "[YOUR_NBB_PATH]/category/" + category.cid + "/" + category.slug
                };

                // save a reference from the old category to the new one
                self.ubbToNbbMap.categories[data.ofid] = category;

                logger.debug("[redirect]" + category._redirect.from + " ---> " + category._redirect.to);

                // is this the last one?
                if (ci == _categories.length) {
                    if (typeof next == "function")
                        next();
                }
            })
        });

        this.slowWriteJSONtoFile(this.config.nbbTmpFiles.categories, this.ubbToNbbMap.categories, function(err){
            if(!err) {
                logger.debug(" " + _categories.length + " NBB Categories saved, MAP in " + self.config.nbbTmpFiles.categories);

                if (typeof next == "function")
                    next();
            } else {
                logger.debug(" Could not write NBB Categories " + err);
            }
        });
    },

// save the UBB topics to nbb's redis
    nbbSaveTopics: function(next){
        // topics chez nbb are forums chez ubb
        var topics = require(this.config.ubbTmpFiles.forums);
        var posts = require(this.config.ubbTmpFiles.posts);

        var self = this;
        var _topics = Object.keys(topics);

        // iterate over each
        _topics.forEach(function(key, ti){
            // get the data from db
            var data = topics[key];

            var categoryId = self.ubbToNbbMap.categories[data.forumId].cid;
            var uid = self.ubbToNbbMap.users[data.userId].uid;
            var content = htmlToMarkdown(posts[data.postId].body);
            var title = data.title ? data.subject[0].toUpperCase() + data.title.substr(1) : "Untitled";

            logger.debug(" saving topic: " + title);
            Topics.create(uid, title, content, categoryId, function(err, ret){
                if (err) throw err;

                ret.topicData._redirect = {
                    from: "[YOUR_UBB_PATH]/ubbthreads.php/topics/" + data.ofid + "/*",
                    to: "[YOUR_NBB_PATH]/topic/" + ret.topicData.tid + "/" + ret.topicData.slug
                };

                ret.topicData = $.extend({}, ret.topicData, {timestamp: data.datetime, viewcount: data.views, pinned: data.pinned});

                Topics.setTopicField(ret.topicData.tid, "timestamp", data.datetime);
                Topics.setTopicField(ret.topicData.tid, "viewcount", data.views);
                Topics.setTopicField(ret.topicData.tid, "pinned", data.pinned);

                // save a reference from the old category to the new one
                self.ubbToNbbMap.topics[data.ofid] = ret.topicData;
                logger.debug("[redirect]" + ret.topicData._redirect.from + " ---> " + ret.topicData._redirect.to);
            });
        });

        this.slowWriteJSONtoFile(this.config.nbbTmpFiles.topics, this.ubbToNbbMap.topics, function(err){
            if(!err) {
                logger.debug(" " + _topics.length + " NBB Topics saved, MAP in " + self.config.nbbTmpFiles.topics);

                if (typeof next == "function")
                    next();
            } else {
                logger.debug(" Could not write NBB Topics " + err);
            }
        });
    },

// save the UBB posts to nbb's redis
    nbbSavePosts: function(next){
        var posts = require(this.config.ubbTmpFiles.posts);

        var self = this;
        var _posts = Object.keys(posts);

        // iterate over each
        _posts.forEach(function(key, pi){
            // get the data from db
            var data = posts[key];

            var tid = self.ubbToNbbMap.topics[data.topicId].tid;
            var uid = self.ubbToNbbMap.users[data.userId].uid;
            var content = htmlToMarkdown(data.body);

            // if this is a topic post, used for the topic's content
            if (data.parent == 0) return;

            logger.debug(" saving topic: " + data.opid);
            Posts.create(uid, tid, content, function(err, postData){
                if (err) throw err;

                postData._redirect = {
                    from: "[YOUR_UBB_PATH]/ubbthreads.php/topics/" + data.topicId + "/*#Post" + data.opid,
                    to: "[YOUR_NBB_PATH]/topic/" + tid + "#" + postData.pid
                };

                var relativeTime = new Date(data.datetime).toISOString();
                postData = $.extend({}, ret.topicData, {timestamp: data.datetime, relativeTime: relativeTime});

                Posts.setPostField(ret.topicData.tid, "timestamp", data.datetime);
                Posts.setPostField(ret.topicData.tid, "relativeTime", relativeTime);

                // save a reference from the old category to the new one
                self.ubbToNbbMap.posts[data.opid] = postData;
                logger.debug("[redirect]" + postData._redirect.from + " ---> " + postData._redirect.to);
            });
        });

        this.slowWriteJSONtoFile(this.config.nbbTmpFiles.posts, this.ubbToNbbMap.posts, function(err){
            if(!err) {
                logger.debug(" " + _posts.length + " NBB Posts saved, MAP in " + self.config.nbbTmpFiles.posts);

                if (typeof next == "function")
                    next();
            } else {
                logger.debug(" Could not write NBB Posts " + err);
            }
        });
    },

// helpers


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
        var pattern = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

        if (!url || !url.match(pattern) || url.length > 2083) {
            return false;
        }
        return true;
    },

// check if valid url
    _isValidUrlSimple: function(url){
        // no ftp allowed and length must be > 10 .. whatever.
        return url && url.indexOf("http") == 0 && url.length > 10 && url.length <= 2083;
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
    },

// todo: i think I got that right?
    cleanUsername: function(str) {
        str = str.replace(/[^\u00BF-\u1FFF\u2C00-\uD7FF\-.*\w\s]/gi, '');
        // todo: i don't know what I'm doing HALP
        return str.replace(/ /g,'').replace(/\*/g, '').replace(/æ/g, '').replace(/ø/g, '').replace(/å/g, '');
    },

    hazHtml: function(str){
        return !!str.match(/<[a-z][\s\S]*>/i);
    }
};