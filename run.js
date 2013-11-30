var migrator = require('./library.js');

migrator.common.migrate({

    // common configs
    common: {

        log: 'debug', // or just 'info,warn,error' to spam the log

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

            rule: 'rewrite ^/MY_UBB_PATH/${FROM}(.*)$ /MY_NBB_PATH/${TO}$1 permanent;'
        },

        // if enabled, this is a memory hog,
        // YOU WILL HIT MEMORY limits for large forums (5k+ each users, topics, posts - that depends on your machine but you know what i mean)
        markdown: false
    },

    // ubb specific configs
    ubb: {
        // ubb mysql db access configs
        db: {
            host: 'localhost',
            user: 'ubb_user',
            password: 'password',
            database: 'ubb_test'
        },

        // ubb_tiny live Db with mock data
        // doesn't have anything worth stealing, don't waste your time
        // also abusing it will only block access to it for a little while.
        // oh if you want to set it locally just install mysql
        // then mysql -uyourusername -hyourhost yourdatabasename -pyourpassword < ubb_tiny.sql
//        db: {
//            host: 'us-cdbr-east-04.cleardb.com',
//            user: 'bab20eb2cf65fe',
//            password: '8d1a480e',
//            database: 'heroku_5c1b73282d8a005'
//        },

        // ubb default, I think
        tablePrefix: 'ubbt_',

        timeMachine: {
            users: {
                after: null,
                before: null //1049942244
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
    },

    nbb: {
        resetup: {
            // the stringified object to be passed to NodeBB's 'node app --setup={...}'
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
        autoConfirmEmails: true
    }
});
