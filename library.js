/*
 if you're reading this source please note that 'NodeBB' == 'nbb' ==  'Nbb' == 'NBB' as a terminology
 and ubb means the UBB Threads Forum Software, here's a link => http://www.ubbcentral.com/

 This Converter is written and tested for UBB 7.5.7 which was released sometime in 2013, that migrates to NodeBB 0.1.1
 */

// todo !!!!! HITTING MEMORY LIMITS OVER 18k POSTS IF MARKDOWNING IS TURNED ON !!
// todo maybe go through all users who has user.customPicture == true, and test each image url if 200 or not and filter the ones pointing to my old forum avatar dir
// todo go through all the html content and Markdown it
// todo still, make sure the old [YOUR_UBB_PATH]/images/avatars/* is still normally accessible to keep the old avatars
// todo generate my nginx rewrite rules from the logs
// todo create a nodebb-theme that works with the site
// todo create a nodebb-plugin that submits all the new user's emails to my mailchimp account
// todo send emails to all users with temp passwords
// todo if I have time, maybe implement a nbb plugin that enforces the 1 time use of temp passwords.
// todo TEST yo


'use strict';


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
    console.log('HA!');
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
    mysql = require('mysql'),

// exactly what it means, ubb uses html for some posts, nbb uses markdown, right?
// todo: too fucking slow ! and a memory hog !!
    htmlToMarkdown = require('html-md'),

// I'm lazy
    $ = require('jquery'),
    async = require('async'),
    fs = require('fs.extra'),
    http = require('http'),
    storage = require('node-persist'),

// a quick logger
    Logger = require('./logger.js'),
// later to be initialized with config in init()
    logger, m;

module.exports = m = {

    common: {

        migrate: function(config) {

            async.series([
                function(next){
                    console.log("common.init()");
                    m.common.init(config, next);
                },
                function(next){
                    logger.debug('common.setup()');
                    m.common.setup(next);
                },
                function(next) {
                    if (m.nbb.config.resetup && m.nbb.config.resetup.run) {
                        logger.debug('nbb.resetup()');
                        m.nbb.resetup(next);
                    } else {
                        logger.debug('nbb.reloadMem()');
                        m.nbb.reloadMem(next);
                    }
                },
                function (next) {
                    logger.debug('ubb.getUsers()');
                    m.ubb.getUsers(next);
                },
                function (next) {
                    logger.debug('ubb.getForums()');
                    m.ubb.getForums(next);
                },
                function (next) {
                    logger.debug('ubb.getTopics()');
                    m.ubb.getTopics(next);
                },
                function (next) {
                    logger.debug('ubb.getPosts()');
                    m.ubb.getPosts(next);
                },
                function(next) {
                    logger.debug('nbb.setUsers()');
                    m.nbb.setUsers(next);
                },
                function(next) {
                    // ubb.forums ===> nbb.categories
                    logger.debug('nbb.setForums()');
                    m.nbb.setForums(next);
                },
                function(next) {
                    logger.debug('nbb.setTopics()');
                    m.nbb.setTopics(next);
                },
                function(next) {
                    logger.debug('nbb.setPosts()');
                    m.nbb.setPosts(next);
                },
                function(next) {
                    logger.debug('nbb.restoreConfigs()');
                    m.nbb.restoreConfig(next);
                },
                function(next) {
                    logger.debug('common.report()');
                    m.common.report(next);
                },
                function(){
                    logger.debug('common.exit()');
                    m.common.exit();
                }
            ]);
        },

        init: function(config, next){
            config = config || {};

            m.common.config = $.extend({},
                {
                    log: 'info,warn,error,debug',

                    // generate passwords for the users, yea
                    passwordGen: {
                        // chars selection menu
                        chars: '!@#$?)({}*.^qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890',
                        // password length
                        len: 13
                    },

                    nginx: {
                        // ONLY replace the 'MY_UBB_PATH' and 'MY_NBB_PATH' and leave the ${FROM} and ${TO} as they will be replaced appropriately
                        // or i guess if you know what you're doing then modify at will
                        // example: rewrite ^/MY_UBB_PATH/users/123(.*)$ /MY_NBB_PATH/user/elvis/$1 last;
                        // this will be stdout as [info] per each record and also added to the report map.
                        // I am not an nginx expert, but this should be enough for you if you are.

                        rule: ' rewrite ^/MY_UBB_PATH/${FROM}(.*)$ /MY_NBB_PATH/${TO}$1 permanent;'
                    },

                    markdown: false
                }
                , config.common);

            m.ubb.config = $.extend({},
                {
                    // ubb mysql db access configs
                    db: {
                        host: "localhost",
                        user: "ubb_user",
                        password: "password",
                        database: "ubb_test"
                    },

                    // ubb default, I think
                    tablePrefix: 'ubbt_',

                    // Limit ubb queries to certain time frames
                    // timestamp in SECONDS
                    // this is potentially problematic,
                    // since you can't migrate a topic or post that was created by a user who you wish not to migrate
                    // I wouldn't use that, maybe for testing .. like limit your migration to pre 2005 to test it out quick, like I do
                    timeMachine: {
                        users: {
                            after: null,
                            before: null
                        },
                        forums: {
                            after: null,
                            before: null
                        },
                        topics: {
                            after: null,
                            before: null
                        },
                        posts: {
                            after: null,
                            before: null
                        }
                    }
                }
                , config.ubb);

            m.nbb.config = $.extend({},
                {
                    resetup: {
                        run: false,

                        setupVal:  {
                            'admin:username': 'admin',
                            'admin:password': 'password',
                            'admin:password:confirm': 'password',
                            'admin:email': 'you@example.com',
                            'base_url': 'http://localhost',
                            'port': '4567',
                            'use_port': 'y',
                            'redis:host': '127.0.0.1',
                            'redis:port': 6379,
                            'redis:password': '',
                            'redis:database': 0,
                            'bind_address': '0.0.0.0',
                            'secret': ''
                        }
                    },

                    // to be randomly selected from migrating the ubb.forums
                    categoriesTextColors: ['#FFFFFF'],
                    categoriesBgColors: ['#ab1290','#004c66','#0059b2'],
                    categoriesIcons: ['fa-comment'],

                    // this will set the nodebb 'email:*:confirm' records to true
                    // and will del all the 'confirm:*KEYS*:emails' too
                    // if you want to auto confirm the user's accounts..
                    autoConfirmEmails: true,

                    moderatorAddedReputation: 1000,
                    adminAddedReputation: 1000,

                    moderatorsLikeGroupName: "GoldClub",
                    moderatorsLikeGroupDescription: "Previous migrated moderators"

                }, config.nbb);


            storage.initSync();

            logger = Logger.init(m.common.config.log);
            logger.debug('init()');

            if (typeof next == 'function')
                next();
        },

        setup: function(next){

            // temp memory
            m.mem = {
                users: {
                    normalized: {}
                },
                forums: {
                    normalized: {}
                },
                topics: {
                    normalized: {}
                },
                posts: {
                    normalized: {}
                }
            };

            m.mem.startTime = new Date();

            if (!m.ubb.config.db) throw new Error('config.ubb.db needs to be passed in to common.migrate()');

            // mysql connection to ubb database
            m.ubb.connection = mysql.createConnection(m.ubb.config.db);
            m.ubb.connection.connect();

            if (m.nbb.config.resetup.run)
                storage.clear();

            next();
        },

        // helpers

        report: function(next) {

            logger.log('====  REMEMBER TO:\n'
                + '\n\t*-) Email all your users their new passwords, find them in the map file reported few lines up.'
                + '\n\t*-) Go through all users in the saved users map, each who has user.customPicture == true, test the image url if 200 or not, also filter the ones pointing to your old forum avatar dir, or keep that dir ([YOUR_UBB_PATH]/images/avatars/*) path working, your call'
                +  (m.common.config.markdown ? '' : '\n\t*-) All of the posts and topics content are still in HTML, I will try to write a nbb plugin to consume those, otherwise, you would have to go through all the html content and Markdown it on your own.')
                + '\n\t*-) Create a nodebb-theme that works with your site\n'
                + '\n\t*-) I may write a NodeBB plugin to enforce one time use of temp passwords, if you beat me to it, let me know\n');

            logger.info('DONE, Took ' + (((new Date()).getTime() - m.mem.startTime.getTime()) / 1000 / 60).toFixed(2) + ' minutes.');
            next();
        },

        redirectRule: function(from, to) {
            var res = m.common.config.nginx.rule.replace('${FROM}', from).replace('${TO}', to);
            logger.debug(res);
            return res;
        },

        exit: function(code, msg){
            code = m.common.isNumber(code) ? code : 0;
            logger.info('Exiting ... code: ' + code + ( msg ? ' msg: ' + msg : '') );
            m.ubb.disconnect();
            process.exit(code);
        },

        maybeMarkdown: function(str){
            if (!m.common.config.markdown) return str || '';
            return htmlToMarkdown(str || '');
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
            fs.writeFileSync(file, '{');
            var first = true;
            for(var prop in json) {
                if(json.hasOwnProperty(prop)) {
                    if(first)
                        first = false;
                    else
                        fs.appendFileSync(file, ',\n');

                    fs.appendFileSync(file, JSON.stringify(prop, null, 4) + ':' + JSON.stringify(json[prop], null, 4));
                }
            }
            fs.appendFileSync(file, '}\n');

            callback();
        },

        // yea, for faster lookup
        // fn is optional which will take item and apply something to it
        convertListToMap: function(list, key, fn){
            var map = {};
            var f = typeof fn == 'function';

            list.forEach(function(item) {
                if (f)
                    item = fn(item);

                map[item[key]] = item;
            });
            return map;
        },

        // check if valid url
        isValidUrlSimple: function(url){
            // no ftp allowed and length must be > 10 .. whatever.
            return url && url.indexOf('http') == 0 && url.length > 10 && url.length <= 2083;
        },

        // a helper method to generate temporary passwords
        genRandPwd: function(len, chars) {
            var index = (Math.random() * (chars.length - 1)).toFixed(0);
            return len > 0 ? chars[index] + m.common.genRandPwd(len - 1, chars) : '';
        },

        truncateStr : function (str, len) {
            if (typeof str != 'string') return str;
            len = m.common.isNumber(len) && len > 3 ? len : 20;
            return str.length <= len ? str : str.substr(0, len - 3) + '...';
        },

        isNumber : function (n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        // todo: i think I got that right?
        cleanUsername: function(str) {
            str = str.replace(/[^\u00BF-\u1FFF\u2C00-\uD7FF\-.*\w\s]/gi, '');
            // todo: i don't know what I'm doing HALP
            return str.replace(/ /g,'').replace(/\*/g, '').replace(/æ/g, '').replace(/ø/g, '').replace(/å/g, '');
        },

        // todo: holy fuck clean this shit
        makeValidNbbUsername: function(_username, _userDisplayName) {
            var _userslug = utils.slugify(_username || '');

            if (utils.isUserNameValid(_username) && _userslug) {
                return {username: _username, userslug: _userslug, validUsername: true, _username: _username, _userDisplayName: _userDisplayName};

            } else {

                logger.warn(_username + ' [_username] is invalid, attempting to clean.');
                var username = m.common.cleanUsername(_username);
                var userslug = utils.slugify(username);

                if (utils.isUserNameValid(username) && userslug) {
                    return {username: username, userslug: userslug, validUsername: true, _username: _username, _userDisplayName: _userDisplayName};

                } else {

                    logger.warn(username + ' [username.cleaned] is still invalid, attempting to use the userDisplayName.');
                    var _userDisplaySlug = utils.slugify(_userDisplayName);

                    if (utils.isUserNameValid(_userDisplayName) && _userDisplaySlug) {
                        return {username: _userDisplayName, userslug: _userDisplaySlug, validUsername: true, _username: _username, _userDisplayName: _userDisplayName};

                    } else {

                        logger.warn(_userDisplayName + ' [_userDisplayName] is invalid, attempting to clean.');
                        var userDisplayName = m.common.cleanUsername(_userDisplayName);
                        var userDisplaySlug = utils.slugify(userDisplayName);

                        if (utils.isUserNameValid(userDisplayName) && userDisplaySlug) {
                            return {username: userDisplayName, userslug: userDisplaySlug, validUsername: true, _username: _username, _userDisplayName: _userDisplayName};
                        } else {
                            logger.warn(userDisplayName + ' [_userDisplayName.cleaned] is still invalid. sorry. no luck');
                            return {username: userDisplayName, userslug: userDisplaySlug, validUsername: false, _username: _username, _userDisplayName: _userDisplayName};
                        }
                    }
                }
            }
        },

        // todo: remove unused functions

        hazHtml: function(str){
            return !!str.match(/<[a-z][\s\S]*>/i);
        },

        hasNumber : function (n) {
            return !isNaN(parseFloat(n));
        },

        monthWord : function (i) {
            return (function(){return {0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
                6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec' }})()[i];
        },

        checkUrlResponse: function(url, callback) {
            http.get(url, function(res) {
                res.on('data', function(c){
                    callback(true);
                });
                res.on('end', function() {
                });
                res.on('error', function() {
                    callback(false)
                });
            });
        },


        // check if valid url
        isValidUrl: function(url){
            return url && url.length < 2083 && url.match(/^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i);
        },


        // writing json to file prop by prop to avoid Out of memory errors
        writeJSONtoFile: function(file, json, callback) {
            fs.writeFile(file, JSON.stringify(json, null, 4), callback);
        },

        // dont ask
        saveMap: function(file, nbbid, ubbid) {

        }
    },

    ubb: {
        // get ubb users
        getUsers: function(next) {
            var prefix = m.ubb.config.tablePrefix
                , query = 'SELECT '
                    + prefix + 'USERS.USER_ID as _ouid, '
                    + prefix + 'USERS.USER_LOGIN_NAME as _username, '
                    + prefix + 'USERS.USER_DISPLAY_NAME as _userDisplayName, '
                    + prefix + 'USERS.USER_REGISTRATION_EMAIL as _email, '
                    + prefix + 'USERS.USER_MEMBERSHIP_LEVEL as _level, '
                    + prefix + 'USERS.USER_REGISTERED_ON as _joindate, '
                    + prefix + 'USERS.USER_IS_APPROVED as _approved, '
                    + prefix + 'USERS.USER_IS_banned as _banned, '

                    + prefix + 'USER_PROFILE.USER_SIGNATURE as _signature, '
                    + prefix + 'USER_PROFILE.USER_HOMEPAGE as _website, '
                    + prefix + 'USER_PROFILE.USER_OCCUPATION as _occupation, '
                    + prefix + 'USER_PROFILE.USER_LOCATION as _location, '
                    + prefix + 'USER_PROFILE.USER_AVATAR as _avatar, '
                    + prefix + 'USER_PROFILE.USER_TITLE as _title, '
                    + prefix + 'USER_PROFILE.USER_POSTS_PER_TOPIC as _postsPerTopic, '
                    + prefix + 'USER_PROFILE.USER_TEMPORARY_PASSWORD as _tempPassword, '
                    + prefix + 'USER_PROFILE.USER_TOTAL_POSTS as _totalPosts, '
                    + prefix + 'USER_PROFILE.USER_RATING as _rating, '
                    + prefix + 'USER_PROFILE.USER_TOTAL_RATES as _totalRates, '
                    + prefix + 'USER_PROFILE.USER_BIRTHDAY as _birthday, '
                    + prefix + 'USER_PROFILE.USER_UNVERIFIED_EMAIL as _unverifiedEmail '

                    + 'FROM ' + prefix + 'USERS, ' + prefix + 'USER_PROFILE '
                    + 'WHERE ' + prefix + 'USERS.USER_ID = ' + prefix + 'USER_PROFILE.USER_ID '

                    + (m.ubb.config.timeMachine.users.before ?
                    'AND ' + prefix + 'USERS.USER_REGISTERED_ON < ' + m.ubb.config.timeMachine.users.before : ' ')

                    + (m.ubb.config.timeMachine.users.after ?
                    'AND ' + prefix + 'USERS.USER_REGISTERED_ON >= ' + m.ubb.config.timeMachine.users.after : ' ');

            var users = storage.getItem('ubb.getUsers');

            if (users) {
                m.mem.users.normalized = users;
                next();
            } else {
                m.ubb.query(query, function(err, rows) {
                    if (err) throw err;

                    logger.info('Users query came back with ' + rows.length + ' records, now preparing, please be patient.');
                    m.mem.users.normalized = m.ubb._normalizeUsers(rows);
                    storage.setItem('ubb.getUsers', m.mem.users.normalized);
                    next();
                });
            }
        },

        _normalizeUsers: function(users) {
            var kept = 0;

            users.forEach(function(user, ui) {
                if (user._username && user._joindate && user._email) {

                    user = $.extend({}, user, m.common.makeValidNbbUsername(user._username, user._userDisplayName, user._ouid));
                    if (user.validUsername) {

                        // maybe markdown
                        user.signature = m.common.maybeMarkdown (
                            // nbb forces signatures to be less than 150 chars
                            m.common.truncateStr(user._signature || '', 150)
                        );

                        // from unix timestamp (s) to JS timestamp (ms)
                        user._joindate = user._joindate * 1000;


                        // lower case the email as well
                        user.email = user._email.toLowerCase();

                        // I don't know about you about I noticed a lot my users have incomplete urls
                        // user.avatar = m._isValidUrl(user._avatar) ? user._avatar : '';
                        // user.website = m._isValidUrl(user._website) ? user._website : '';
                        // this is a little faster, and less agressive
                        user.avatar = m.common.isValidUrlSimple(user._avatar) ? user._avatar : '';
                        user.website = m.common.isValidUrlSimple(user._website) ? user._website : '';

                        // generate a temp password, don't worry i'll add the clear text to the map so you can email it to the user
                        user.password = m.common.genRandPwd(m.common.config.passwordGen.len, m.common.config.passwordGen.chars);

                        kept++;
                        users[ui] = user;

                        if (ui % 1000 == 0)
                            logger.info('Prepared ' + ui + ' users so far.');

                    } else {
                        storage.setItem('users.skipped._ouid.' + user._ouid, user);
                        users.slice(ui, 1);
                        logger.warn('[!username] skipping user ' + user._username + ':' + user._email + ' _ouid: ' + user._ouid);
                    }
                } else {
                    logger.warn('[!_username | !_joindate | !_email] skipping user ' + user._username + ':' + user._email + ' _ouid: ' + user._ouid);
                    storage.setItem('users.skipped._ouid.' + user._ouid, user);
                    users.slice(ui, 1);
                }
            });

            logger.info('Preparing users done. kept ' + kept + '/' + users.length);
            var _map = m.common.convertListToMap(users, '_ouid');

            // hardcode the first user, give it the uid 1
            _map["1"] = {
                uid: 1
            };

            return _map;
        },

        // get ubb forums
        getForums: function(next) {

            var prefix = m.ubb.config.tablePrefix
                , query = 'SELECT '
                    + prefix + 'FORUMS.FORUM_ID as _ofid, '
                    + prefix + 'FORUMS.FORUM_TITLE as _name, '
                    + prefix + 'FORUMS.FORUM_DESCRIPTION as _description, '
                    + prefix + 'FORUMS.CATEGORY_ID as _categoryId, '
                    + prefix + 'FORUMS.FORUM_CREATED_ON as _datetime '
                    + 'FROM ' + prefix + 'FORUMS '
                    + 'WHERE 1 = 1 '
                    + (m.ubb.config.timeMachine.forums.before ?
                    'AND ' + prefix + 'FORUMS.FORUM_CREATED_ON < ' + m.ubb.config.timeMachine.forums.before : ' ')
                    + (m.ubb.config.timeMachine.forums.after ?
                    'AND ' + prefix + 'FORUMS.FORUM_CREATED_ON >= ' + m.ubb.config.timeMachine.forums.after : ' ');

            var forums = storage.getItem('ubb.getForums');

            if (forums) {
                m.mem.forums.normalized = forums;
                next();
            } else {
                m.ubb.query(query,
                    function(err, rows){
                        if (err) throw err;

                        logger.info('Forums query came back with ' + rows.length + ' records, now preparing, please be patient.');
                        m.mem.forums.normalized = m.ubb._normalizeForums(rows);
                        storage.setItem('ubb.getForums', m.mem.forums.normalized);
                        next();
                    });
            }
        },

        // ubb.forums == nbb.categories
        _normalizeForums: function(forums) {
            var kept = 0;

            forums.forEach(function(forum, fi) {
                if (forum._name && forum._description) {

                    // set some defaults since i don't have them
                    forum.icon = m.nbb.config.categoriesIcons[Math.floor(Math.random() * m.nbb.config.categoriesIcons.length)];
                    forum.bgColor = m.nbb.config.categoriesBgColors[Math.floor(Math.random() * m.nbb.config.categoriesBgColors.length)];
                    forum.color = m.nbb.config.categoriesTextColors[Math.floor(Math.random() * m.nbb.config.categoriesTextColors.length)];

                    // order based on index i guess
                    forum.order = fi + 1;

                    forum.name = forum._name;
                    forum.description = forum._description;

                    kept++;
                    forums[fi] = forum;

                    if (fi % 1000 == 0)
                        logger.info('Prepared ' + fi + ' forums so far.');

                } else {
                    logger.warn('skipping forum ' + forum._name + ':' + forum._description + ' _ofid: ' + forum._ofid);
                    storage.setItem('forums.skipped._ofid.' + forum._ofid, forum);
                    forums.slice(fi, 1);
                }
            });

            logger.info('Preparing forums done. kept ' + kept + '/' + forums.length);
            return m.common.convertListToMap(forums, '_ofid');
        },

        // get ubb topics
        getTopics: function(next) {
            var prefix = m.ubb.config.tablePrefix
                , query =
                    'SELECT '
                        + prefix + 'TOPICS.TOPIC_ID as _otid, '
                        + prefix + 'TOPICS.FORUM_ID as _forumId, '
                        + prefix + 'TOPICS.POST_ID as _postId, '
                        + prefix + 'TOPICS.USER_ID as _userId, '
                        + prefix + 'TOPICS.TOPIC_VIEWS as _views, '
                        + prefix + 'TOPICS.TOPIC_SUBJECT as _title, '
                        + prefix + 'TOPICS.TOPIC_REPLIES as _replies, '
                        + prefix + 'TOPICS.TOPIC_TOTAL_RATES as _totalRates,'
                        + prefix + 'TOPICS.TOPIC_RATING as _rating, '
                        + prefix + 'TOPICS.TOPIC_CREATED_TIME as _datetime, '
                        + prefix + 'TOPICS.TOPIC_IS_APPROVED as _approved, '
                        + prefix + 'TOPICS.TOPIC_STATUS as _status, '
                        + prefix + 'TOPICS.TOPIC_IS_STICKY as _pinned, '

                        + prefix + 'POSTS.POST_PARENT_ID as _postParent, '
                        + prefix + 'POSTS.TOPIC_ID as _postTopicId, '
                        + prefix + 'POSTS.POST_BODY as _firstPostBody '

                        + 'FROM ' + prefix + 'TOPICS, ' + prefix + 'POSTS '
                        + 'WHERE ' + prefix + 'TOPICS.TOPIC_ID=' + prefix + 'POSTS.TOPIC_ID '
                        + 'AND ' + prefix + 'POSTS.POST_PARENT_ID=0 '

                        + (m.ubb.config.timeMachine.topics.before ?
                        'AND ' + prefix + 'TOPICS.TOPIC_CREATED_TIME < ' + m.ubb.config.timeMachine.topics.before : ' ')
                        + (m.ubb.config.timeMachine.topics.after ?
                        'AND ' + prefix + 'TOPICS.TOPIC_CREATED_TIME >= ' + m.ubb.config.timeMachine.topics.after : ' ');

            var topics = storage.getItem('ubb.getTopics');

            if (topics) {
                m.mem.topics.normalized = topics;
                next();
            } else {
                m.ubb.query(query,
                    function(err, rows) {
                        if (err) throw err;

                        logger.info('Topics query came back with ' + rows.length + ' records, now preparing, please be patient.');
                        m.mem.topics.normalized = m.ubb._normalizeTopics(rows);
                        storage.setItem('ubb.getTopics', m.mem.topics.normalized);
                        next();
                    });
            }
        },

        // ubb.forums == nbb.categories
        _normalizeTopics: function(topics) {
            var kept = 0;

            topics.forEach(function(topic, ti) {

                var user = m.mem.users.normalized[topic._userId];
                var forum = m.mem.forums.normalized[topic._forumId];

                if (user && forum) {

                    // from s to ms
                    var time = topic._datetime * 1000;

                    // maybe markdown
                    topic.content = m.common.maybeMarkdown(topic._firstPostBody);

                    topic.title = topic._title ? topic._title[0].toUpperCase() + topic._title.substr(1) : 'Untitled';
                    topic.timestamp = time;
                    topic.relativeTime = new Date(time).toISOString();
                    topic.viewcount = topic._views || 0;
                    topic.pinned = topic._pinned || 0;

                    kept++;
                    topics[ti] = topic;

                    if (ti % 1000 == 0)
                        logger.info('Prepared ' + ti + ' topics so far.');
                } else {
                    var requiredValues = [forum, user];
                    var requiredKeys = ['forum','user'];
                    var falsyIndex = m.common.whichIsFalsy(requiredValues);

                    logger.warn('Skipping topic: ' + topic._otid + ' titled: ' + topic._title + ' because ' + requiredKeys[falsyIndex] + ' is falsy. Value: ' + requiredValues[falsyIndex]);
                    storage.setItem('topics.skipped._otid.' + topic._otid, topic);
                    topics.slice(ti, 1);
                }
            });

            logger.info('Preparing topics done. kept ' + kept + '/' + topics.length);
            return m.common.convertListToMap(topics, '_otid')
        },

        // get ubb forums
        getPosts: function(next) {
            var prefix = m.ubb.config.tablePrefix
                , query =
                    'SELECT POST_ID as _opid, POST_PARENT_ID as _parent, POST_PARENT_USER_ID as _parentUserId, TOPIC_ID as _topicId, '
                        + 'POST_POSTED_TIME as _datetime, POST_SUBJECT as _subject, '
                        + 'POST_BODY as _body, USER_ID as _userId, '
                        + 'POST_MARKUP_TYPE as _markup, POST_IS_APPROVED as _approved '
                        + 'FROM ' + prefix + 'POSTS '
                        + 'WHERE POST_PARENT_ID > 0 '
                        + (m.ubb.config.timeMachine.posts.before ?
                        'AND POST_POSTED_TIME < ' + m.ubb.config.timeMachine.posts.before : ' ')
                        + (m.ubb.config.timeMachine.posts.after ?
                        'AND POST_POSTED_TIME >= ' + m.ubb.config.timeMachine.posts.after : ' ');

            var posts = storage.getItem('ubb.getPosts');

            if (posts) {
                m.mem.posts.normalized = posts;
                next();
            } else {
                m.ubb.query(query, function(err, rows) {
                    if (err) throw err;

                    logger.info('Posts query came back with ' + rows.length + ' records, now preparing, please be patient.');
                    m.mem.posts.normalized = m.ubb._ubbNormalizePosts(rows);
                    storage.setItem('ubb.getPosts', m.mem.posts.normalized);
                    next();
                });
            }
        },

        _ubbNormalizePosts: function(posts) {
            var kept = 0;

            posts.forEach(function(post, pi){

                var topic = m.mem.topics.normalized[post._topicId];
                var user = m.mem.users.normalized[post._userId];

                if (topic && user) {

                    // from s to ms
                    var time = post._datetime * 1000;

                    post.content = m.common.maybeMarkdown(post._body);

                    post.timestamp = time;
                    post.relativeTime = new Date(time).toISOString();

                    kept++;

                    if (pi % 1000 == 0)
                        logger.info('Prepared ' + pi + ' posts so far.');
                } else {
                    var requiredValues = [topic, user];
                    var requiredKeys = ['topic', 'user'];
                    var falsyIndex = m.common.whichIsFalsy(requiredValues);

                    logger.warn('Skipping post: ' + post._opid + ' because ' + requiredKeys[falsyIndex] + ' is falsy. Value: ' + requiredValues[falsyIndex]);
                    storage.setItem('posts.skipped._opid.' + post._opid, post);
                    posts.slice(pi, 1);
                }
            });
            logger.info('Preparing posts done. kept ' + kept + '/' + posts.length + '\n\n\n');
            return m.common.convertListToMap(posts, '_opid');
        },

        // disconnect from the ubb mysql database
        disconnect: function(){
            m.ubb.connection.end();
        },

        // query ubb mysql database
        query: function(q, callback){
            m.ubb.connection.query(q, callback);
        }
    },

    nbb: {
        resetup: function(next){
            var execSync = require('exec-sync')
                , setupVal = JSON.stringify(m.nbb.config.resetup.setupVal).replace(/"/g, '\\"')
                , node, result, command;

            var setup = function(){
                logger.debug('stating nodebb setup');

                try {
                    // todo: won't work on windows
                    // todo: do i even need this?
                    node = execSync('which node', true).stdout;
                    logger.debug('node lives here: ' + node);

                    // assuming we're in nodebb/node_modules/nodebb-plugin-ubbmigrator
                    command = node + ' ' + __dirname + '/../../app.js --setup="' + setupVal + '"';
                    logger.info('Calling this command on your behalf: \n' + command + '\n\n');
                    result = execSync(command, true);

                } catch (e){
                    logger.error(e);
                    logger.info('COMMAND');
                    logger.info(result);
                    m.exit(1);
                }
                if (result.stdout.indexOf('NodeBB Setup Completed') > -1) {
                    logger.info('\n\nNodeBB re-setup completed.');
                    m.nbb.clearDefaultCategories(next);
                } else {
                    logger.error(JSON.stringify(result));
                    throw new Error('NodeBB automated setup didn\'t go too well. ');
                }
            };

            RDB.flushdb(function(err, res){
                if (err) throw err;
                logger.info('flushdb done. ' + res);
                setup();
            });
        },

        reloadMem: function(next) {
            next();
        },

        clearDefaultCategories: function(next) {

            // deleting the first 12 default categories by nbb
            RDB.keys('category:*', function(err, arr) {
                arr.forEach(function(k){
                    RDB.del(k);
                });
                RDB.del('categories:cid', function(){
                    m.nbb.setupGroups(next);
                });
            });
        },

        setupGroups: function(next){

            Group.getGidFromName('Administrators', function(err, gid) {
                // save it
                storage.setItem('nbb.groups.administrators.gid', gid);

                // create an moderators group from the users who are ubb Moderators
                Group.create(m.nbb.config.moderatorsLikeGroupName, m.nbb.config.moderatorsLikeGroupDescription, function(err, groupData) {
                    if (err) {
                        if (err.message == 'group-exists') {
                            Group.getGidFromName(m.nbb.config.moderatorsLikeGroupName, function(err, mgid){
                                // save it to use it when needed, bro
                                storage.setItem('nbb.groups.moderators.gid', mgid);
                                m.nbb.backupConfig(next);
                            });
                        }
                    } else {
                        // save it
                        storage.setItem("nbb.groups.moderators.gid", groupData.gid);
                        m.nbb.backupConfig(next);
                    }
                });

            });
        },

        backupConfig: function(next){
            RDB.hgetall('config', function(err, data) {
                if (err) throw err;
                m.nbb.config.backedConfig = data || {};
                m.common.slowWriteJSONtoFile('./.nbb.config.json', m.nbb.config, function(){
                    m.nbb.setTmpConfig(next);
                });
            });
        },

        setTmpConfig: function(next){
            // clone the configs
            var config = $.extend(true, {}, m.nbb.config.backedConfig);

            // get the nbb backedConfigs, change them, then set them back to the db
            // just to make the transition a little less flexible
            // yea.. i dont know .. i have a bad feeling about this
            config.postDelay = 0;
            config.minimumPostLength = 1;
            config.minimumTitleLength = 1;
            config.maximumUsernameLength = 50;
            config.maximumProfileImageSize = 1024;

            // if you want to auto confirm email, set the host to null, if there is any
            // this will prevent User.sendConfirmationEmail from setting expiration time on the email address
            // per https://github.com/designcreateplay/NodeBB/blob/master/src/user.js#L458'ish
            if (m.nbb.config.autoConfirmEmails)
                config['email:smtp:host'] = 'm.mail.host.is.set.by.ubbmigrator.todisable.email.confirmation.i.hope.m.wont.work';

            RDB.hmset('config', config, function(err){
                if (err) throw err;
                next();
            });
        },

        // im nice
        restoreConfig: function(next) {
            m.nbb.config = require('./.nbb.config.json');
            RDB.hmset('config', m.nbb.config.backedConfig, function(err){
                if (err) {
                    logger.error('Something went wrong while restoring your nbb configs');
                    logger.warn('here are your backedup configs, you do it.');
                    logger.warn(m.nbb.config.backedConfig);
                    throw err;
                }

                next();
            });
        },


        // save the UBB users to nbb's redis
        setUsers: function(next) {
            var count = 0;

            var nbbAdministratorsGid = storage.getItem('nbb.groups.administrators.gid');
            var nbbModeratorsGid = storage.getItem('nbb.groups.moderators.gid');

            logger.debug("Administrator gid: " + nbbAdministratorsGid + " Moderators gid: " + nbbModeratorsGid);

            var users = m.mem.users.normalized;
            var _users = Object.keys(users);

            async.eachSeries(_users, function(key, done) {
                var user = users[key]; count++;

                var migratedUser = storage.getItem('users.migrated._ouid.' + user._ouid);
                var skippedUser = storage.getItem('users.skipped._ouid.' + user._ouid);

                if (migratedUser || skippedUser) {
                    logger.info('[c:' + count + '] user: ' + user._ouid + ' already processed, result: ' + (migratedUser ? 'migrated' : 'skipped'));
                    delete m.mem.users.normalized[user._ouid];
                    done();
                    return;
                }

                if (!user.username) {
                    storage.setItem('users.skipped._ouid.' + user._ouid, user);
                    logger.warn('[c:' + count + '] user: "' + (user.username || user._username) + '" is invalid.');
                    delete m.mem.users.normalized[user._ouid];
                    done();
                    return;
                }

                logger.debug('[c: ' + count + '] saving user: ' + user.username);
                User.create(user.username, user.password, user.email, function(err, uid) {
                    if (err) {
                        logger.error(' username: "' + user.username + '" ' + err + ' .. skipping');
                        storage.setItem('users.skipped._ouid.' + user._ouid, user);
                        delete m.mem.users.normalized[user._ouid];
                        done();
                    } else {

                        var reputation = 0;

                        if (user._level == 'Moderator') {
                            reputation = m.nbb.config.moderatorAddedReputation + user._rating;
                            Group.join(nbbModeratorsGid, uid, function(){
                                logger.info(user.username + ' became a Moderator');
                            });
                        } else if (user._level == 'Administrator') {
                            reputation = m.nbb.config.adminAddedReputation + user._rating;
                            Group.join(nbbAdministratorsGid, uid, function(){
                                logger.info(user.username + ' became an Administrator');
                            });
                        } else {
                            reputation = user._rating || 0;
                        }

                        // set some of the fields got from the ubb
                        var _u_ = {
                            // preseve the signature and website if there is any
                            signature: user.signature,
                            website: user.website || '',
                            // if that user is banned, we would still h/im/er to be
                            banned: user._banned || 0,
                            // reset the location
                            location: user._location || '',
                            // preserse the  joindate, luckily here, ubb uses timestamps too
                            joindate: user._joindate,
                            // that's the best I could come up with I guess
                            reputation: reputation || 0,
                            profileviews: user._totalRates || 0
                        };

                        if (user.avatar) {
                            _u_.gravatarpicture = user.avatar;
                            _u_.picture = user.avatar;
                            user.customPicture = true;
                        } else {
                            user.customPicture = false;
                        }

                        _u_.redirectRule = m.common.redirectRule('users/' + user._ouid + '/' + user._username + '/', 'user/' + user.userslug);

                        User.setUserFields(uid, _u_, function() {
                            _u_.uid = uid;

                            storage.setItem('users.migrated._ouid.' + user._ouid, $.extend({}, user, _u_));
                            delete m.mem.users.normalized[user._ouid];

                            if (m.nbb.config.autoConfirmEmails)
                                RDB.set('email:' + user.email + ':confirm', true, function(){
                                    done();
                                });
                            else
                                done();
                        });
                    }
                });
            }, function(){

                // hard code the first UBB Admin user as migrated, as it may actually own few posts/topics
                storage.setItem('users.migrated._ouid.1', {uid: 1});

                m.mem.users.normalized = null;

                if (m.nbb.config.autoConfirmEmails) {
                    RDB.keys('confirm:*:email', function(err, keys){
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

        // save the UBB forums to nbb's redis as categories
        // forums chez UBB are categories chez NBB
        setForums: function(next) {
            var count = 0;

            var forums = m.mem.forums.normalized;
            var _forums = Object.keys(forums);

            async.eachSeries(_forums, function(key, done) {

                var forum = forums[key]; count++;

                var migratedForum = storage.getItem('forums.migrated._ofid.' + forum._ofid);
                var skippedForum = storage.getItem('forums.skipped._ofid.' + forum._ofid);

                if (migratedForum || skippedForum) {
                    logger.info('[c:' + count + '] forum: ' + forum._ofid + ' already processed, result: ' + (migratedForum ? 'migrated' : 'skipped'));
                    delete m.mem.forums.normalized[forum._ofid];
                    done();
                    return;
                }

                logger.debug('[c:' + count + '] saving forum (aka category) : ' + forum.name);

                Categories.create(forum, function(err, categoryData) {
                    if (err) {
                        logger.error('forum: ' + forum.title + ' : ' + err);
                        storage.setItem('forums.skipped._ofid.' + forum._ofid, $.extend({}, forum, categoryData || {}));
                        delete m.mem.forums.normalized[forum._ofid];
                        done();
                    } else {
                        categoryData.redirectRule = m.common.redirectRule('forums/' + forum._ofid + '/', 'category/' + categoryData.slug);
                        storage.setItem('forums.migrated._ofid.' + forum._ofid, $.extend({}, forum, categoryData || {}));
                        done();
                    }
                });
            }, function(){
                m.mem.forums.normalized = null;
                next();
            });
        },

        // save the UBB topics to nbb's redis
        setTopics: function(next) {
            var count = 0;

            var topics = m.mem.topics.normalized;
            var _topics = Object.keys(topics);

            async.eachSeries(_topics, function(key, done) {
                var topic = topics[key]; count++;

                var migratedTopic = storage.getItem('topics.migrated._otid.' + topic._otid);
                var skippedTopic = storage.getItem('topics.skipped._otid.' + topic._otid);

                if (migratedTopic || skippedTopic) {
                    logger.info('[c:' + count + '] topic: ' + topic._otid + ' already processed, result: ' + (migratedTopic ? 'migrated' : 'skipped'));
                    delete m.mem.topics.normalized[topic._otid];
                    done();
                    return;
                }

                var forum = storage.getItem('forums.migrated._ofid.' + topic._forumId);
                var user = storage.getItem('users.migrated._ouid.' + topic._userId);

                if (!user || !forum) {
                    logger.error('[c:' + count + '] topic: "' + topic._title + '" _old-forum-valid: ' + !!forum  + ' _old-user-valid: ' + !!user + ' .. skipping');
                    storage.setItem('topics.skipped._otid.' + topic._otid, topic);
                    delete m.mem.topics.normalized[topic._otid];
                    done();
                } else {

                    // forum aka categories, that's why the cid here from nbb (instead of a fid)
                    topic.cid = forum.cid;
                    topic.uid = user.uid;

                    logger.debug('[c:' + count + '] saving topic: ' + topic.title);
                    Topics.post(topic.uid, topic.title, topic.content, topic.cid, function(err, ret){
                        if (err) {
                            logger.error('topic: ' + topic.title + ' ' + err + ' ... skipping');
                            storage.setItem('topics.skipped._otid.' + topic._otid, topic);
                            delete m.mem.topics.normalized[topic._otid];
                            done();
                        } else {
                            ret.topicData.redirectRule = m.common.redirectRule('topics/' + topic._otid + '/', 'topic/' + ret.topicData.slug);

                            Topics.setTopicField(ret.topicData.tid, 'timestamp', topic.timestamp);
                            Topics.setTopicField(ret.topicData.tid, 'viewcount', topic.viewcount);
                            Topics.setTopicField(ret.topicData.tid, 'pinned', topic.pinned);
                            Posts.setPostField(ret.postData.pid, 'timestamp', topic.timestamp);
                            Posts.setPostField(ret.postData.pid, 'relativeTime', topic.relativeTime);

                            storage.setItem('topics.migrated._otid.' + topic._otid, $.extend({}, topic, ret.topicData));
                            delete m.mem.topics.normalized[topic._otid];
                            done();
                        }
                    });
                }
            }, function(){
                m.mem.topics.normalized = null;
                next();
            });
        },

        // save the UBB posts to nbb's redis
        setPosts: function(next) {
            var count = 0;
            var posts = m.mem.posts.normalized;
            var _posts = Object.keys(posts);

            async.eachSeries(_posts, function(key, done) {
                var post = posts[key]; count++;


                var migratedPost = storage.getItem('posts.migrated._opid.' + post._opid);
                var skippedPost = storage.getItem('posts.skipped._opid.' + post._opid);

                if (migratedPost || skippedPost) {
                    logger.info('post: ' + post._opid + ' already processed, result: ' + (migratedPost ? 'migrated' : 'skipped'));
                    delete m.mem.posts.normalized[post._opid];
                    done();
                    return;
                }

                var topic = storage.getItem('topics.migrated._otid.' + post._topicId);
                var user = storage.getItem('users.migrated._ouid.' + post._userId);

                if (!user || !topic) {
                    logger.error('post: "' + post._opid + '" _old-topic-valid: ' + !!topic + ' _old-user-valid: ' + !!user +   ' .. skipping');
                    storage.setItem('posts.skipped._opid.' + post._opid, post);
                    delete m.mem.posts.normalized[post._opid];
                    done();
                } else {

                    post.tid = topic.tid;
                    post.uid = user.uid;

                    logger.debug('[c: ' + count + '] saving post: ' + post._opid);
                    Posts.create(post.uid, post.tid, post.content || '', function(err, postData){
                        if (err) {
                            logger.error('post: ' + post._opid + ' ' + err + ' ... skipping');
                            storage.setItem('posts.skipped._opid.' + post._opid, post);
                            delete m.mem.posts.normalized[post._opid];
                            done();
                        } else {
                            postData.redirectRule = m.common.redirectRule('topics/' + post._topicId + '/(.)*#Post' + post._opid, 'topic/' + post.tid + '#' + postData.pid);
                            Posts.setPostField(postData.pid, 'timestamp', post.timestamp);
                            Posts.setPostField(postData.pid, 'relativeTime', post.relativeTime);
                            storage.setItem('posts.migrated._opid.' + post._opid, $.extend({}, post, postData));

                            delete m.mem.posts.normalized[post._opid];
                            done();
                        }
                    });
                }
            }, function(){
                m.mem.posts.normalized = null;
                next();
            });
        }
    }
};