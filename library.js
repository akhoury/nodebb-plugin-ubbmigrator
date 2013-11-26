/*
 if you're reading this source please not that "NodeBB" == "nbb" ==  "Nbb" == "NBB" as a terminology
 and ubb means the UBB Threads Forum Software, here's a link => http://www.ubbcentral.com/

 This Converter is written and tested for UBB 7.5.7 which was released sometime in 2013, that migrates to NodeBB 0.1.1
 */

// todo !!!!! HITTING MEMORY LIMITS OVER 18k POSTS !!
// todo maybe go through all users who has user.customPicture == true, and test each image url if 200 or not and filter the ones pointing to my old forum avatar dir
// todo go through all the html content and Markdown it

// todo still, make sure the old [YOUR_UBB_PATH]/images/avatars/* is still normally accessible to keep the old avatars
// todo generate my nginx rewrite rules from the logs

// todo create a nodebb-theme that works with the site
// todo create a nodebb-plugin that submits all the new user's emails to my mailchimp account
// todo send emails to all users with temp passwords

// todo if I have time, maybe implement a nbb plugin that enforces the 1 time use of temp passwords.
// todo nothing is really skippable at the moment, the nodebb db needs to be flushed, run node app.js --setup, then node app.js --upgrade
// todo TEST yo


"use strict";


var Group, Meta, User, Topics, Posts, Categories, RDB;

// todo: the plugins page says to use this 'var User = module.parent.require('./user');' but that's not working for some reason
try {
    Group = module.parent.require('./groups.js');
    Meta = module.parent.require('./meta.js');
    User = module.parent.require('./user.js');
    Topics = module.parent.require('./topics.js');
    Posts = module.parent.require('./posts.js');
    Categories = module.parent.require('./categories.js');
    RDB = module.parent.require('./redis.js');
} catch (e) {
    console.log("HA! ");
    Group = require('../../src/groups.js');
    Meta = require('../../src/meta.js');
    User = require('../../src/user.js');
    Topics = require('../../src/topics.js');
    Posts = require('../../src/posts.js');
    Categories = require('../../src/categories.js');
    RDB = require('../../src/redis.js');
}


var

    // nodebb utils, useful
    utils = require('../../public/src/utils.js'),

    // some useful modules

    // mysql to talk to ubb db
    mysql = require("mysql"),

    // exactly what it means, ubb uses html for some posts, nbb uses markdown, right?
    // todo: too fucking slow ! and a memory hog !!
    htmlToMarkdown = require("html-md"),

    // I'm lazy
    $ = require("jquery"),
    async = require("async"),
    fs = require("fs.extra"),
    http = require("http"),

    // a quick logger
    Logger = require("./logger.js"),
    // later to be initialized with config in init()
    logger,

    nbbData = {
        groups: {
            Administrators: {},
            Moderators: {}
        }
    };

module.exports = {

    migrate: function(config){
        var self = this;
        async.series([
            function(next){
                self.init(config, next);
            },
            function(next) {
                if (self.config.nbbReSetup && self.config.nbbReSetup.run) {
                    self.nbbReSetup(next);
                }
            },
            function(next){
                logger.debug("setup()");
                self.initialSetup(next);
            },
            function(next){
                logger.debug("backupNbbConfigs()");
                self.backupNbbConfigs(next);
            },
            function(next){
                logger.debug("tempSetNbbConfigs()");
                self.tempSetNbbConfigs(next);
            },
            function(next){
                logger.debug("emptyNbbDefaultCategories()");
                self.emptyNbbDefaultCategories(next);
            },
            function(next){
                logger.debug("setupNbbGroups()");
                self.setupNbbGroups(next);
            },
            function (next) {
                    logger.debug("ubbGetUsers()");
                    self.ubbGetUsers(next);
            },
            function (next) {
                    logger.debug("ubbGetForums()");
                    self.ubbGetForums(next);
            },
            function (next) {
                    logger.debug("ubbGetTopics()");
                    self.ubbGetTopics(next);
            },
            function (next) {
                    logger.debug("ubbGetPosts()");
                    self.ubbGetPosts(next);
            },
            function(next) {
                    logger.debug("nbbSaveUsers()");
                    self.nbbSaveUsers(next);
            },
            function(next) {
                // ubb.forums ===> nbb.categories
                    logger.debug("nbbSaveCategories()");
                    self.nbbSaveCategories(next);
            },
            function(next) {
                    logger.debug("nbbSaveTopics()");
                    self.nbbSaveTopics(next);
            },
            function(next) {
                    logger.debug("nbbSavePosts()");
                    self.nbbSavePosts(next);
            },
            function(next) {
                self.restoreNbbConfigs(next);
            },
            function(){
                self.exit();
            }
        ]);
    },

    init: function(config, next){
        config = config || {};

        this.config = $.extend({}, {

            log: "error",

            ubbDbConfig: null,
            ubbTablePrefix: "ubbt_",

            nbbReSetup: {
                run: false,
                flushdb: true,
                config: {
                    "admin:username": "admin",
                    "admin:password": "password",
                    "admin:password:confirm": "password",
                    "admin:email": "you@example.com",

                    // i'll let nodebb decide the defaults here
                    "redis:host": "",
                    "redis:port": null,
                    "redis:password": "",
                    "redis:database": "",
                    "bind_address": "",
                    "secret": ""
                }
            },

            // these NEED to start with ./whatever.json NOT whatever.json since I'm using require() to load them. I know, don't judge me pls.
            ubbToNbbMapFile: "./tmp/ubbToNbbMap.json",

            // this is mainly for test, or if you want to time travel
            // a TIMESTAMP in SECONDS can be assigned to each which will limit the
            // MySQL query to find only if each's record's time is < TIMESTAMP
            // todo: add > option
            ubbqTestLimitToBeforeTimestampSeconds: {
                users: null,
                forums: null,
                topics: null,
                posts: null
            },

            // generate passwords for the users, yea
            passwordGen: {
                chars: "!@#$?)({}*.^qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890",
                len: 13
            },


            // to be randomly selected from migrating the ubb.forums
            nbbCategoriesColorClasses: ["category-darkblue", "category-blue", "category-purple"],
            nbbCategoriesIcons: ["icon-comment"],

            // this will set the nodebb "email:*:confirm" records to true
            // and will del all the "confirm:*KEYS*:emails" too
            // if you want to auto confirm the user's accounts..
            nbbAutoConfirmEmails: true,


            // will create a nbb group for the ubb migrated moderators
            // this Group, till 11/26/2013 does not mean they have Moderators privileges
            ubbToNbbModeratorsGroupName : "GlodClub",
            ubbToNbbModeratorsGroupDescription: "Old timers forums moderators",
            // per nbb default setup, 1000+ reputation makes you a moderator
            // this what sets them to moderators, Reputation yo !
            ubbToNbbModeratorsAddedReputation: 1000,

            nginx: {
                // ONLY replace the 'MY_UBB_PATH' and 'MY_NBB_PATH' and leave the ${FROM} and ${TO} as they will be replaced appropriately
                // or i guess if you know what you're doing then modify at will
                // example: rewrite ^/MY_UBB_PATH/users/123(.*)$ /MY_NBB_PATH/user/elvis/$1 last;
                rule: " rewrite ^/MY_UBB_PATH/${FROM}(.*)$ /MY_NBB_PATH/${TO}$1 permanent;"
            }

        }, config);

        logger = Logger.init(this.config.log);
        logger.debug("init()");

        if (typeof next == "function")
            next();
    },

    nbbReSetup: function(next){
        var execSync = require("exec-sync")
            , setupVal = JSON.stringify(this.config.nbbReSetup.config)
            , node, result, command;

        var setup = function(){
            logger.debug("stating nodebb setup");
            try {

                // todo: won't work on windows
                // todo: do i even need this?
                node = execSync("which node", true).stdout;
                logger.debug("node lives here: " + node);

                // assuming we're in nodebb/node_modules/nodebb-plugin-ubbmigrator
                command = node + " ../../app.js --setup='" + setupVal + "'";
                logger.info("Calling this command on your behalf: \n");
                logger.info(command);
                result = execSync(command, true);

            } catch (e){
                logger.error(e);
                logger.info("COMMAND");
                logger.info(result);
                this.exit(1);
            }
            if (result.stdout.indexOf("NodeBB Setup Completed") > -1) {
                logger.info("\n\nNodeBB re-setup completed.");
                next();
            } else {
                logger.error(result);
                throw new Error("NodeBB automated setup didn't too well. ");
            }
        };

        if (this.config.nbbReSetup.flushdb) {
            RDB.flushdb(function(err, res){
                if (err) throw err;
                logger.info("flushdb done. " + res);
                setup();
            });
        } else {
            setup();
        }
    },

    initialSetup: function(next){
        var self = this;

        // create a map from ubb ids to new nbb data
        // useful for saving clear temp passwords for users
        // and creating ReWriteRules
        this.ubbToNbbMap = {
            users: {},
            forums: {},
            topics: {},
            posts: {}
        };

        if (!this.config.ubbDbConfig) throw new Error("config.ubbDbConfig needs to be passed in to migrate()");

        // mysql connection to ubb database
        this.ubbConnection = mysql.createConnection(this.config.ubbDbConfig);
        this.ubbConnection.connect();

        fs.createFileSync(this.config.ubbToNbbMapFile);

        next();
    },

    emptyNbbDefaultCategories: function(next){

        // deleting the first 12 default categories by nbb
        RDB.keys("category:*", function(err, arr) {
            arr.forEach(function(k){
                RDB.del(k);
            });
            RDB.del("categories:cid", function(){
                next();
            });
        });
    },

    setupNbbGroups: function(next){
        var self = this;
        Group.getGidFromName("Administrators", function(err, gid) {
            // save a reference for the admins gid
            nbbData.groups.Administrators.gid = gid;
            // create an moderators group from the users who are ubb Moderators
            Group.create(self.config.ubbToNbbModeratorsGroupName, self.config.ubbToNbbModeratorsGroupDescription, function(err, group) {
                if (err) {
                    if (err.message == "group-exists") {
                        Group.getGidFromName(self.config.ubbToNbbModeratorsGroupName, function(err, gid){
                            // save a reference to the gid to use it when needed, bro
                            nbbData.groups.Moderators.gid = gid;
                            next();
                        });
                    }
                } else {
                    // save a reference to the gid to use it when needed, bro
                    nbbData.groups.Moderators.gid = group.gid;
                    next();
                }
            });

        });
    },

    backupNbbConfigs: function(next){
        var self = this;
        RDB.hgetall("config", function(err, data){
            if (err) throw err;
            self.config.nbbConfigs = data || {};
            next();
        });
    },

    tempSetNbbConfigs: function(next){
        var nbbTempConfigs = this.config.nbbConfigs;

        // yea.. i dont know .. i have a bad feeling about this
        nbbTempConfigs.postDelay = 0;
        nbbTempConfigs.minimumPostLength = 1;
        nbbTempConfigs.minimumTitleLength = 1;
        nbbTempConfigs.maximumUsernameLength = 50;
        nbbTempConfigs.maximumProfileImageSize = 1024;

        // if you want to auto confirm email, set the host to null, if there is any
        // this will prevent User.sendConfirmationEmail from setting expiration time on the email address
        // per https://github.com/designcreateplay/NodeBB/blob/master/src/user.js#L458
        if (this.config.nbbAutoConfirmEmails)
            nbbTempConfigs['email:smtp:host'] = "this.mail.host.is.set.by.ubbmigrator.todisable.email.confirmation.i.hope.this.wont.work";

        RDB.hmset("config", nbbTempConfigs, function(err){
            if (err) throw err;
            next();
        });
    },

    // im nice
    restoreNbbConfigs: function(next){
        var self = this;
        RDB.hmset("config", this.config.nbbConfigs, function(err){
            if (err) {
                logger.error("Something went wrong while restoring your nbb configs");
                logger.warn("here are your backedup configs, you do it.");
                logger.warn(self.config.nbbConfig);
                throw err;
            }
            next();
        });
    },

    // get ubb users
    ubbGetUsers: function(next) {
        var self = this, prefix = self.config.ubbTablePrefix;
        this.ubbq(
            "SELECT "
                + prefix + "USERS.USER_ID as _ouid, "
                + prefix + "USERS.USER_LOGIN_NAME as _username, "
                + prefix + "USERS.USER_DISPLAY_NAME as _userDisplayName, "
                + prefix + "USERS.USER_REGISTRATION_EMAIL as _email, "
                + prefix + "USERS.USER_MEMBERSHIP_LEVEL as _level, "
                + prefix + "USERS.USER_REGISTERED_ON as _joindate, "
                + prefix + "USERS.USER_IS_APPROVED as _approved, "
                + prefix + "USERS.USER_IS_banned as _banned, "

                + prefix + "USER_PROFILE.USER_SIGNATURE as _signature, "
                + prefix + "USER_PROFILE.USER_HOMEPAGE as _website, "
                + prefix + "USER_PROFILE.USER_OCCUPATION as _occupation, "
                + prefix + "USER_PROFILE.USER_LOCATION as _location, "
                + prefix + "USER_PROFILE.USER_AVATAR as _avatar, "
                + prefix + "USER_PROFILE.USER_TITLE as _title, "
                + prefix + "USER_PROFILE.USER_POSTS_PER_TOPIC as _postsPerTopic, "
                + prefix + "USER_PROFILE.USER_TEMPORARY_PASSWORD as _tempPassword, "
                + prefix + "USER_PROFILE.USER_TOTAL_POSTS as _totalPosts, "
                + prefix + "USER_PROFILE.USER_RATING as _rating, "
                + prefix + "USER_PROFILE.USER_TOTAL_RATES as _totalRates, "
                + prefix + "USER_PROFILE.USER_BIRTHDAY as _birthday, "
                + prefix + "USER_PROFILE.USER_UNVERIFIED_EMAIL as _unverifiedEmail "

                + "FROM " + prefix + "USERS, " + prefix + "USER_PROFILE "
                + "WHERE " + prefix + "USERS.USER_ID = " + prefix + "USER_PROFILE.USER_ID "
                + (self.config.ubbqTestLimitToBeforeTimestampSeconds.users ?
                "AND " + prefix + "USERS.USER_REGISTERED_ON < " + self.config.ubbqTestLimitToBeforeTimestampSeconds.users : ""),

            function(err, rows) {
                if (err) throw err;
                logger.info("Users query came back with " + rows.length + " records, now preparing, please be patient.");
                self.ubbToNbbMap.users = self._ubbNormalizeUsers(rows);
                next();
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

    _ubbNormalizeUsers: function(users) {
        var self = this, kept = 0;

        users.forEach(function(user, ui) {
            var _ouid = user._ouid;
            if (user._username && user._joindate && user._email) {

                user = $.extend({}, user, self._makeValidNbbUsername(user._username, user._userDisplayName, user._ouid));
                if (user.validUsername) {

                    // nbb forces signatures to be less than 150 chars
                    user.signature = self.truncateStr(user._signature || "", 150);
                    // todo: htmltomarkdown too slow!
                    // user.signatureMd = self.hazHtml(user.signature) ? htmlToMarkdown(user.signature) : user.signature;
                    user.signatureMd = user.signature;

                    // from unix timestamp (s) to JS timestamp (ms)
                    user._joindate = user._joindate * 1000;


                    // lower case the email as well
                    user.email = user._email.toLowerCase();

                    // I don't know about you about I noticed a lot my users have incomplete urls
                    // user.avatar = self._isValidUrl(user._avatar) ? user._avatar : "";
                    // user.website = self._isValidUrl(user._website) ? user._website : "";
                    // this is a little faster, and less agressive
                    user.avatar = self._isValidUrlSimple(user._avatar) ? user._avatar : "";
                    user.website = self._isValidUrlSimple(user._website) ? user._website : "";

                    // generate a temp password, don't worry i'll add the clear text to the map so you can email it to the user
                    user.password = self._genRandPwd(self.config.passwordGen.len, self.config.passwordGen.chars);

                    kept++;
                    users[ui] = user;

                    if (ui % 1000 == 0)
                        logger.info("Prepared " + ui + " users so far.");

                } else {
                    logger.warn("[!username] skipping user " + user._username + ":" + user._email + " _ouid: " + _ouid);
                    delete users[_ouid];
                }
            } else {
                logger.warn("[!_username | !_joindate | !_email] skipping user " + user._username + ":" + user._email + " _ouid: " + _ouid);
                delete users[_ouid];
            }
        });
        logger.info("Preparing users done. kept " + kept + "/" + users.length);
        return self._convertListToMap(users, "_ouid");
    },

    // get ubb forums
    ubbGetForums: function(next) {
        var self = this, prefix = self.config.ubbTablePrefix;
        this.ubbq(
            "SELECT "
                + prefix + "FORUMS.FORUM_ID as _ofid, "
                + prefix + "FORUMS.FORUM_TITLE as _name, "
                + prefix + "FORUMS.FORUM_DESCRIPTION as _description, "
                + prefix + "FORUMS.CATEGORY_ID as _categoryId, "
                + prefix + "FORUMS.FORUM_CREATED_ON as _datetime "
                + "FROM " + self.config.ubbTablePrefix + "FORUMS "
                + (self.config.ubbqTestLimitToBeforeTimestampSeconds.forums ?
                "WHERE " + prefix + "FORUMS.FORUM_CREATED_ON < " + self.config.ubbqTestLimitToBeforeTimestampSeconds.forums : ""),

            function(err, rows){
                if (err) throw err;
                logger.info("Forums query came back with " + rows.length + " records, now preparing, please be patient.");
                self.ubbToNbbMap.forums = self._ubbNormalizeForums(rows);
                next();
            });
    },

    // ubb.forums == nbb.categories
    _ubbNormalizeForums: function(forums) {
        var self = this, kept = 0;

        forums.forEach(function(forum, fi){
            var _ofid = forum._ofid;
            if (forum._name && forum._description) {

                // set some defaults since i don't have them
                forum.icon = self.config.nbbCategoriesIcons[Math.floor(Math.random()*self.config.nbbCategoriesIcons.length)];
                forum.blockclass = self.config.nbbCategoriesColorClasses[Math.floor(Math.random()*self.config.nbbCategoriesColorClasses.length)];

                // order based on index i guess
                forum.order = fi + 1;

                forum.name = forum._name;
                forum.description = forum._description;

                kept++;
                forums[fi] = forum;

                if (fi % 1000 == 0)
                    logger.info("Prepared " + fi + " forums so far.");

            } else {
                logger.warn("skipping forum " + forum._name + ":" + forum._description + " _ofid: " + _ofid);
                delete forums[_ofid];
            }
        });

        logger.info("Preparing forums done. kept " + kept + "/" + forums.length);
        return self._convertListToMap(forums, "_ofid");
    },

    // get ubb topics
    ubbGetTopics: function(next) {
        var self = this, prefix = self.config.ubbTablePrefix;
        var query =
            "SELECT "
            + prefix + "TOPICS.TOPIC_ID as _otid, "
            + prefix + "TOPICS.FORUM_ID as _forumId, "
            + prefix + "TOPICS.POST_ID as _postId, "
            + prefix + "TOPICS.USER_ID as _userId, "
            + prefix + "TOPICS.TOPIC_VIEWS as _views, "
            + prefix + "TOPICS.TOPIC_SUBJECT as _title, "
            + prefix + "TOPICS.TOPIC_REPLIES as _replies, "
            + prefix + "TOPICS.TOPIC_TOTAL_RATES as _totalRates,"
            + prefix + "TOPICS.TOPIC_RATING as _rating, "
            + prefix + "TOPICS.TOPIC_CREATED_TIME as _datetime, "
            + prefix + "TOPICS.TOPIC_IS_APPROVED as _approved, "
            + prefix + "TOPICS.TOPIC_STATUS as _status, "
            + prefix + "TOPICS.TOPIC_IS_STICKY as _pinned, "

            + prefix + "POSTS.POST_PARENT_ID as _postParent, "
            + prefix + "POSTS.TOPIC_ID as _postTopicId, "
            + prefix + "POSTS.POST_BODY as _firstPostBody "

            + "FROM " + prefix + "TOPICS, " + prefix + "POSTS "
            + "WHERE " + prefix + "TOPICS.TOPIC_ID=" + prefix + "POSTS.TOPIC_ID "
            + "AND " + prefix + "POSTS.POST_PARENT_ID=0 "

            + (self.config.ubbqTestLimitToBeforeTimestampSeconds.topics ?
            "AND " + prefix + "TOPICS.TOPIC_CREATED_TIME < " + self.config.ubbqTestLimitToBeforeTimestampSeconds.topics : "");

        this.ubbq(query,
            function(err, rows){
                if (err) throw err;
                logger.info("Topics query came back with " + rows.length + " records, now preparing, please be patient.");
                self.ubbToNbbMap.topics = self._ubbNormalizeTopics(rows);
                next();
            });
    },

    // ubb.forums == nbb.categories
    _ubbNormalizeTopics: function(topics) {
        var self = this, kept = 0;

        //fs.writeFileSync(self.config.ubbTmpFiles.topics, "");
        topics.forEach(function(topic, ti){
            var _otid = topic._otid;

            // if that's the *DoNotDelete* use created by ubb, then let's assign that post to the initial user by nbb
            if (!self.ubbToNbbMap.users[topic._userId] && topic._userId == 1) {
                self.ubbToNbbMap.users[topic._userId] = {
                    uid: 1
                };
            }
            var user = self.ubbToNbbMap.users[topic._userId];

            if (topic._forumId && user) {

                // from s to ms
                var time = topic._datetime * 1000;

                // topic.content = self.hazHtml(topic._firstPostBody || "") ? htmlToMarkdown(topic._firstPostBody || "") : topic._firstPostBody || "";
                topic.content = topic._firstPostBody || "";

                topic.title = topic._title ? topic._title[0].toUpperCase() + topic._title.substr(1) : "Untitled";
                topic.timestamp = time;
                topic.relativeTime = new Date(time).toISOString();
                topic.viewcount = topic._views;
                topic.pinned = topic._pinned;

                kept++;
                topics[ti] = topic;

                if (ti % 1000 == 0)
                    logger.info("Prepared " + ti + " topics so far.");
            } else {
                var requiredValues = [topic._forumId, user];
                var requiredKeys = ["topic._forumId","user"];
                var falsyIndex = self.whichIsFalsy(requiredValues);
                logger.warn("Skipping topic: " + topic._otid + " titled: " + topic._title + " because " + requiredKeys[falsyIndex] + " is falsy. Value: " + requiredValues[falsyIndex]);
                delete topics[_otid];
            }
        });

        logger.info("Preparing topics done. kept " + kept + "/" + topics.length);
        return self._convertListToMap(topics, "_otid")
    },

    // get ubb forums
    ubbGetPosts: function(next) {
        var self = this;
        this.ubbq(
            "SELECT POST_ID as _opid, POST_PARENT_ID as _parent, POST_PARENT_USER_ID as _parentUserId, TOPIC_ID as _topicId, "
                + "POST_POSTED_TIME as _datetime, POST_SUBJECT as _subject, "
                + "POST_BODY as _body, USER_ID as _userId, "
                + "POST_MARKUP_TYPE as _markup, POST_IS_APPROVED as _approved "
                + "FROM " + self.config.ubbTablePrefix + "POSTS "
                + "WHERE POST_PARENT_ID > 0 "

                + (self.config.ubbqTestLimitToBeforeTimestampSeconds.posts ?  "AND POST_POSTED_TIME < " + self.config.ubbqTestLimitToBeforeTimestampSeconds.posts : ""),

            function(err, rows){
                if (err) throw err;
                logger.info("Posts query came back with " + rows.length + " records, now preparing, please be patient.");
                self.ubbToNbbMap.posts = self._ubbNormalizePosts(rows);
                next();
            });
    },

    _ubbNormalizePosts: function(posts) {
        var self = this, kept = 0;

        posts.forEach(function(post, pi){
            var _opid = post._opid;

            var topic = self.ubbToNbbMap.topics[post._topicId];

            // if that's the *DoNotDelete* use created by ubb, then let's assign that post to the initial user by nbb
            if (!self.ubbToNbbMap.users[post._userId] && post._userId == 1) {
                self.ubbToNbbMap.users[post._userId] = {
                    uid: 1
                };
            }

            var user = self.ubbToNbbMap.users[post._userId];

            if (post._parent && topic && user) {

                // from s to ms
                var time = post._datetime * 1000;

                // todo: htmltomarkdown tooo slow!
                // post.content = self.hazHtml(post._body) ? htmlToMarkdown(post._body) : post._body;
                post.content = post._body || "";

                post.timestamp = time;
                post.relativeTime = new Date(time).toISOString();

                kept++;
                self.ubbToNbbMap.posts[post._opid] = post;

                if (pi % 1000 == 0)
                    logger.info("Prepared " + pi + " posts so far.");
            } else {
                var requiredValues = [post._parent, topic, user];
                var requiredKeys = ["post._parent", "topic", "user"];
                var falsyIndex = self.whichIsFalsy(requiredValues);
                logger.warn("Skipping post: " + post._opid + " because " + requiredKeys[falsyIndex] + " is falsy. Value: " + requiredValues[falsyIndex]);
                delete posts[_opid];
            }
        });
        logger.info("Preparing posts done. kept " + kept + "/" + posts.length);
        return self._convertListToMap(posts, "_opid");
    },

    // save the UBB users to nbb's redis
    nbbSaveUsers: function(next) {
        var self = this;

        var users = self.ubbToNbbMap.users;
        var _users = Object.keys(users);

        async.eachSeries(_users, function(key, save) {
            var user = users[key];

            // if that's the admin, skip
            if (user.uid == 1) {
                save();
                return;
            }

            logger.debug("[idx: " + key + "] saving user: " + user.username);
            User.create(user.username, user.password, user.email, function(err, uid) {
                if (err) {
                    logger.error(" username: " + user.username + " -- " + err);
                } else {

                    var reputation = 0;

                    if (user._level == "Moderator") {
                        reputation = self.config.ubbToNbbModeratorsAddedReputation + user._rating;
                        Group.join(nbbData.groups.Moderators.gid, uid, function(){
                            logger.info(user.username + " became a moderator");
                        });
                    } else if (user._level == "Administrator") {
                        reputation = self.config.ubbToNbbModeratorsAddedReputation + user._rating;
                        Group.join(nbbData.groups.Administrators.gid, uid, function(){
                            logger.info(user.username + " became an Administrator");
                        });
                    } else {
                        reputation = user._rating || 0;
                    }

                    // set some of the fields got from the ubb
                    var _u_ = {
                        // preseve the signature and website if there is any
                        signature: user.signatureMd,
                        website: user.website || "",
                        // if that user is banned, we would still h/im/er to be
                        banned: user._banned,
                        // reset the location
                        location: user._location || "",
                        // preserse the  joindate, luckily here, ubb uses timestamps too
                        joindate: user._joindate,
                        // that's the best I could come up with I guess
                        reputation: reputation || 0,
                        profileviews: user._totalRates
                    };

                    if (user.avatar) {
                        _u_.gravatarpicture = user.avatar;
                        _u_.picture = user.avatar;
                        user.customPicture = true;
                    }

                    var redirectRule = self.redirectRule("users/" + user._ouid + "/" + user._username + "/", "user/" + user.userslug);

                    self.ubbToNbbMap.users[user._ouid] = {uid: uid, email: user.email, redirectRule: redirectRule, avatar: user.avatar, customPicture: user.customPicture, password: user.password};
                    User.setUserFields(uid, _u_);
                    if (self.config.nbbAutoConfirmEmails)
                        RDB.set('email:' + user.email + ':confirm', true);
                }
                save();
            });
        }, function(){

            if (self.config.nbbAutoConfirmEmails) {
                RDB.keys("confirm:*:email", function(err, keys){
                    keys.forEach(function(key){
                        RDB.del(key);
                    });
                    next();
                });
            } else {
                next();
            }
        });
    },

    // save the UBB categories to nbb's redis
    // ubb.forums == nbb.categories
    nbbSaveCategories: function(next) {
        var self = this;
        var categories = self.ubbToNbbMap.forums;
        var _categories = Object.keys(categories);

        async.eachSeries(_categories, function(key, save) {
            var category = categories[key];
            logger.debug("[idx:" + key + "] saving category: " + category.name);

            Categories.create(category, function(err, categoryData) {

                if (err) {
                    logger.error(err);
                    save();
                } else {
                    var redirectRule = self.redirectRule("forums/" + category._ofid + "/", "category/" + categoryData.slug);

                    self.ubbToNbbMap.forums[category._ofid] = {cid: categoryData.cid, redirectRule: redirectRule};
                }

                save();
            });
        }, function(){
            next();
        });
    },

    // save the UBB topics to nbb's redis
    nbbSaveTopics: function(next) {
        // topics chez nbb are forums chez ubb
        var self = this;

        var topics = self.ubbToNbbMap.topics;
        var _topics = Object.keys(topics);
        async.eachSeries(_topics, function(key, save) {

                var topic = topics[key];
                topic.cid = self.ubbToNbbMap.forums[topic._forumId].cid;
                topic.uid = self.ubbToNbbMap.users[topic._userId].uid;

                logger.debug("[idx:" + key + "] saving topic: " + topic.title);
                Topics.post(topic.uid, topic.title, topic.content, topic.cid, function(err, ret){
                    if (err) {
                        logger.error(err);
                        save();
                    } else {
                        var redirectRule = self.redirectRule("topics/" + topic._otid + "/", "topic/" + ret.topicData.slug);

                        Topics.setTopicField(ret.topicData.tid, "timestamp", topic.timestamp);
                        Topics.setTopicField(ret.topicData.tid, "viewcount", topic.viewcount);
                        Topics.setTopicField(ret.topicData.tid, "pinned", topic.pinned);
                        Posts.setPostField(ret.postData.pid, "timestamp", topic.timestamp, function (){
                            Posts.setPostField(ret.postData.pid, "relativeTime", topic.relativeTime, function (){
                                save();
                            });
                        });
                        self.ubbToNbbMap.topics[topic._otid] = {tid: ret.topicData.tid, redirectRule: redirectRule};
                    }
                });
            },
            function (){
                next();
            }
        );
    },

    // save the UBB posts to nbb's redis
    nbbSavePosts: function(next) {
        var self = this;
        var posts = self.ubbToNbbMap.posts;
        var _posts = Object.keys(posts);

        async.eachSeries(_posts, function(key, save) {
                var post = posts[key];
                post.tid = self.ubbToNbbMap.topics[post._topicId].tid;
                post.uid = self.ubbToNbbMap.users[post._userId].uid;

                logger.debug("[idx: " + key + "] saving post: " + post._opid);
                Posts.create(post.uid, post.tid, post.content, function(err, postData){

                    if (err) {
                        logger.error(err);
                        save();
                    } else {
                        var redirectRule = self.redirectRule("topics/" + post._topicId + "/(.)*#Post" + post._opid, "topic/" + post.tid + "#" + postData.pid);

                        Posts.setPostField(postData.pid, "timestamp", post.timestamp, function (){
                            Posts.setPostField(postData.pid, "relativeTime", post.relativeTime, function (){
                                self.ubbToNbbMap.posts[post._opid] = {pid: postData.pid, redirectRule: redirectRule};
                                save();
                            });
                        });
                    }
                });
            },
            function(){
                self.exit(0, "All Done.");
            });
    },

    // helpers

    // remove this
    saveMap: function(file, map, length, wat, next, key) {
        if (typeof map == "array" && key)
            map = this._convertListToMap(map, key);
        // just save a copy in my big ubbToNbbMap for later, minus the correct website and avatar, who cares for now.
        this.slowWriteJSONtoFile(file, map, function(_err) {
            if (!_err)
                logger.info(length + " " + wat + " saved, MAP in " + file);
            else
                logger.error("Could not write NBB Users " + _err);

            if (typeof next == "function")
                next();
        });
    },

    redirectRule: function(from, to) {
        var res = this.config.nginx.rule.replace("${FROM}", from).replace("${TO}", to);
        logger.info(res);
        return res;
    },

    exit: function(code, msg){
        logger.info("Exiting ... code: " + code +  " -- " + msg);
        this.ubbDisconnect();
        process.exit(this.isNumber(code) ? code : 0);
    },

    // disconnect from the ubb mysql database
    ubbDisconnect: function(){
        this.ubbConnection.end();
    },

    // query ubb mysql database
    ubbq: function(q, callback){
        this.ubbConnection.query(q, callback);
    },

    // which of the values is falsy
    whichIsFalsy: function(arr){
        for (var i = 0; i < arr.length; i++) {
            if (!arr[i])
                return i;
        }
        return null;
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
    _convertListToMap: function(list, key, fn){
        var map = {};
        var f = typeof fn == "function";

        list.forEach(function(item) {
            if (f)
                item = fn(item);

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

    truncateStr : function (str, len) {
        if (typeof str != "string") return str;
        len = this.isNumber(len) && len > 3 ? len : 20;
        return str.length <= len ? str : str.substr(0, len - 3) + "...";
    },

    isNumber : function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },

    hasNumber : function (n) {
        return !isNaN(parseFloat(n));
    },

    monthWord : function (i) {
        return (function(){return {0: "Jan", 1: "Feb", 2: "Mar", 3: "Apr", 4: "May", 5: "Jun",
            6: "Jul", 7: "Aug", 8: "Sep", 9: "Oct", 10: "Nov", 11: "Dec" }})()[i];
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