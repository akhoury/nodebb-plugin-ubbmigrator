var

// RDB = module.parent.require('./redis'),
// utils = module.parent.require('./../public/src/utils.js'),

    RDB = {
        hmset: function(obj, cb){ console.log("hmset saving:"); console.log(obj);}
    },

    utils = require(""),

    mysql = require("mysql"),

    async = require("async"),
    $ = require("jquery"),
    fs = require("fs"),

//todo move this to a config file
    ubbConfig =  {
        host: "127.0.0.1",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },
    ubbPrefix = "ubbt_",

    ubbConnection = mysql.createConnection(ubbConfig),

    ubbData = {
        users: [],
        usersProfiles: [],
        categories: [],
        forums: [],
        posts: []
    };

module.exports = {

    nbbSaveCategories: function(){
        var categories = require("./tmp/ubb/categories.json");
        Object.keys(categories).forEach(function(key){
            var data = categories[key];

            RDB.incr('global:next_category_id', function(err, cid) {
                if (err) {
                    return callback(err, null);
                }

                var slug = cid + '/' + utils.slugify(data.name);
                RDB.rpush('categories:cid', cid);

                var category = {
                    cid: cid,
                    name: data.name,
                    description: data.description,

                    // hard coded values, i'll just consider them defaults.
                    icon: "icon-comment",
                    blockclass: "category-blue",

                    slug: slug,
                    topic_count: 0,
                    disabled: 0,
                    order: data.order,

                    // saving old id from ubb here
                    _ubb_id: data.id
                };

                RDB.hmset('category:' + cid, category, function(err, data) {
                    callback(err, category);
                });
            });

        });
    },

    nbbSaveUsers: function() {
        var users = require("./tmp/ubb/users.json");

        Object.keys(users).forEach(function(key) {
            var _user = users[key];
            var username = _user.username;
            var email = _user.email;
            var password = "qqqq";

            var userslug = utils.slugify(username);

            username = username.trim();
            if (email !== undefined) {
                email = email.trim();
            }

            RDB.incr('global:next_user_id', function(err, uid) {
                RDB.handle(err);

                var gravatar = User.createGravatarURLFromEmail(email);
                var timestamp = Date.now();

                RDB.hmset('user:' + uid, {
                    'uid': uid,
                    'username': username,
                    'userslug': userslug,
                    'fullname': '',
                    'location': '',
                    'birthday': '',
                    'website': '',
                    'email': email || '',
                    'signature': '',
                    'joindate': timestamp,
                    'picture': gravatar,
                    'gravatarpicture': gravatar,
                    'uploadedpicture': '',
                    'profileviews': 0,
                    'reputation': 0,
                    'postcount': 0,
                    'lastposttime': 0,
                    'banned': 0,
                    'showemail': 0
                });

                RDB.hset('username:uid', username, uid);
                RDB.hset('userslug:uid', userslug, uid);

                if (email !== undefined) {
                    RDB.hset('email:uid', email, uid);
                    User.sendConfirmationEmail(email);
                }

                RDB.incr('usercount', function(err, count) {
                    RDB.handle(err);

                    if (typeof io !== 'undefined') {
                        io.sockets.emit('user.count', {
                            count: count
                        });
                    }
                });

                RDB.zadd('users:joindate', timestamp, uid);
                RDB.zadd('users:postcount', 0, uid);
                RDB.zadd('users:reputation', 0, uid);

                userSearch.index(username, uid);

                if (typeof io !== 'undefined') {
                    io.sockets.emit('user.latest', {
                        userslug: userslug,
                        username: username
                    });
                }

                if (password !== undefined) {
                    User.hashPassword(password, function(err, hash) {
                        User.setUserField(uid, 'password', hash);
                        callback(null, uid);
                    });
                } else {
                    callback(null, uid);
                }
            });
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
            "ubbt_USERS",
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
            "ubbt_USER_PROFILE",
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
            "ubbt_CATEGORIES",
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
            "ubbt_FORUMS",
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
            "ubbt_POSTS",
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

    ubbFilterUsers: function(){
        this.ubbGetBannedUsers(function(banned){
        });
    },

    ubbGetBannedUsers: function(cb) {
        var banned = {};
        this.ubbq("SELECT * FROM " + ubbPrefix + "BANNED_USERS;", function(err, rows){
            if (err) throw err;

            rows.forEach(function(row){
                banned[row.USER_ID] = row.BAN_REASON || "UNKNOWN";
            });

            if (typeof cb == "function")
                cb(banned);
        });
    }
};