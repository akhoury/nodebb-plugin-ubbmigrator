###No official release yet, this is a pre-alfa version.

<br/>

nodebb-plugin-ubbmigrator
=========

UBB to NodeBB forum migrator, a one time use thing.

<br />

### What?
This is a not a normal NodeBB Plugin, at the moment there is no way to run it from the NodeBB/admin panel, so it doesn't really matter
if it's activated or not, as long as you find this readme somehow.
you must install it in NodeBB/node_modules/nodebb-plugin-ubbmigrator, then you run it from the command line, for the time being.

### What does it migrate:

read carefully: 

- ####Users: 
    * __Username__ YES. if a user have an invalid username per NodeBB rules, the migrator will try to clean it, then test again, if that's still invalid, the migrator will test the UBB.User.UserDisplayName, if that doesn't work, this user will be skipped. UBB for some reason allows duplicate users with same emails? so the first ones by ID orders will be saved, the rest will be skipped. (UBB appends [username]_dup[Number] next to the dups.. so those will be skipped too if the email is already used)
    * __Passwords__ NO. UBB use MD5, NodeBB uses Sha1 I think, so can't do, the migrator will generate random passwords of length 13 and a set of characters (configurable), don't worry, the migrator will give out the clear text passwords in the report, so you can email them to your users, keep them safe.
    * __Admins & Moderators__: SORT-OF. NodeBB uses repuration for moderators access, so, even though I add the admins to the NodeBB.Administrators group, and also create a group for old timers (moderators), they don't really become admins nor moderators, so what I do here, is explicitely add reputation points (NodeBB default is 1000 + UBB.User.rating (to keep the karma)) - so .. you can keep track of your moderators and admins in the nodebb/admin panel, and manually add/remove them later.
    * __Joindate__ YES.
    * __Website__ YES. if URL looks valid, it is migrated, but it's not checked if 404s 
    * __Avatar__ YES. if URL looks valid, it is migrated, but it's not checked if 404s, if not valid, it's set to "" and NodeBB will generate a gravatar URl for the user, but the migrator will also add an attribute `user.customPicture = true` in the generated map if you'd like to make sure the URLs are 200s, you can iterate over them.
    * __Reputation__ SORT-OF. assumed the UBB.User.raking (Moderators and Admins get extra points)
    * __Location__ YES. migrated as is, clear text
    * __Signature__ YES. migrated as is (HTML -- __read the Markdown note below__)
    * __Banned__ YES. it will stay banned, by username
    * __Confimartion emails__? there is an option for this migrator (look in the configs) `nbbAutoConfirmEmails = true/false` which will try to prevent the confirmation email from sending out, and will explicitly set the accounts to verified in NodeBB.
    * __Nginx RedirectRules__ YES. per each user's profile for your convience, see the configs to find out more.
    * __Oh and__, UBB have a weird User with ID == 1, ******DONOTDELETE****** <= that's like the first user created, and somehow, in my UBB installation, it does own few topics and posts, so these will be assigned to the NodeBB initial Admin created. 



- ####Forums (AKA Categories per NodeBB Speak): 
    * __Title__ YES
    * __description__: YES
    * __Order__: per FORUM_ID order, you can reorder those later
    * __NodeBB Icon__: they all get the comment icon for noww, you can change them later
    * __Nginx RedirectRule__ YES. per each forum's url, for your convience, see the configs to find out more.


- ####Topics:
    * __Within its Forum (aka Category)__ YES (but if its parent forum is skipped, this topic gets skipped)
    * __Owned by its User__ YES (but if its user is skipped, this topic gets skipped)
    * __Title__ YES
    * __Content__ YES (HTML - Read the Markdown Note)
    * __DateTime__ YES
    * __Pinned__ YES (I don't know how many you can pin in NodeBB)
    * __ViewCount__ YES
    * __Nginx RedirectRule__ YES. per each forum's url, for your convience, see the configs to find out more.


- ####Posts:
    * __Within its Forum (aka Category)__ YES (but if its grand-parent forum is skipped, its parent topic gets skipped, hence this post gets skipped)
    * __Within its Topic__ YES (but if its parent topic is skipped, this post gets skipped)
    * __Owned by its User__ YES (but if its user is skipped, this post is skipped)
    * __Content__ YES (HTML - Read the Markdown Note)
    * __DateTime__ YES
    * __Nginx RedirectRule__ SORT-OF, every UBB.Post URL basically points to its Parent-Topic's URL with a `ubbthreads.php/topic/123/#Post456789`, I don't think there is an easy way for for nginx to capture the # values, without some Client-Side JavaScript involved, BUT I generate the rule anyway, so you can have a mapping from the UBB posts to the NBB posts. And if you find a solution, please share. 


## Versions tested on:
  - UBB 7.5.7 ---> NodeBB 0.1.1

## Example usage
```bash
# that's your nodebb installation
# I should not need to ask you to try this on a staging machine or locally first
cd [wherever]/NodeBB/

# to install nodebb dependencies
npm install

# not yet on npm but if it was
# npm install nodebb-plugin-ubbmigrator
# since it's not, you can do 
cd ./node_modules/
git clone https://github.com/akhoury/nodebb-plugin-ubbmigrator.git

cd nodebb-plugin-ubbmigrator

# edit your configs
vim run.js

# then 
node run.js --flush | gretee migration.log
# and hope for the best
# I would grep the [useful] lines out stuff later, they're very useful for redirection purposes, getting users email/username/passwd to send them out etc..
# or you could find a gazillion file in the ./storage directory after the migration is done, and read them one by one.. up to you and/or your developer

# !!!! the --flush flag WILL flush your NodeBB database, clears out all the temp storage from previous runs and starts fresh
# do NOT use the --flush flag if you are attempting to resume after some failure or interruption

```
### run.js with your configs
```javasript
var migrator = require('./ubbmigrator.js'),
	config = require('./run.config.json');

migrator.common.migrate(config);
```
### your config are required
see [run.config.json](run.config.json), obviously I can't comment a JSON file, so I will here
```
{
    // common configs
    common: {

        log: 'useful,warn,error,info', // or just 'debug' if you want to spam the logs

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

        // ubb default, I think
        tablePrefix: 'ubbt_',
    },

    nbb: {
        resetup: {
            // the stringified object to be passed to NodeBB's 'node app --setup={...}'
            // these will only be used if you use the --flush flag
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

    // there is few more if you're interested, look in the source
}
```

### Future versions support

* Will keep supporting future NodeBB versions, since it's still very young and I'm a fan, but you need to submit an issue with all the details (NodeBB version, UBB version, issue etc..), and I will help as fast as I can.
* Will not support multi-UBB versions, unless minor point releases, not major
* If you're running an old version of UBB, upgrade to 7.5.7, then migrate

### Redis Note

see [redis.ubbmigrator.conf](redis.ubbmigrator.conf), look for [ubbmigrator] tag to find the temporary changes you need to make.
remember to backup your original config, you will need them after the migration.
If you're an redis guru, you don't need my help, but take a look at it anyway and let me know where I went wrong :)

### Markdown Note

NodeBB uses Markdown for the user submitted content, UBB uses HTML, so,
I tried to use an html-to-markdown converter, but it was a huge memory hog,
was hitting segmentation faults and memory limits beyond 18k posts conversion,
so I disbaled it, for the record I am using `html-md`. You can still enable it by setting `{ commom: { ..., markdown: true, ... } ... }` in the config.
Having that said, if you leave it disabled, you still need to convert that content to Markdown somehow,
but I'll let you do that. Or you can wait for me to write a NodeBB client-side plugin that will understands html content or something..
or write your own, or submit another solution, I'm open for that, till then, expect to see html tags in the migrated post-contents and user signatures, if the markdown is disabled.

### TODO
* todo !!!!! HITTING MEMORY LIMITS OVER 18k POSTS IF MARKDOWNING IS TURNED ON !!
* todo maybe go through all users who has user.customPicture == true, and test each image url if 200 or not and filter the ones pointing to my old forum avatar dir
* todo still, make sure the old [YOUR_UBB_PATH]/images/avatars/* is still normally accessible to keep the old avatars
* todo create a nodebb-theme that works with the site
* todo send emails to all users with temp passwords
* todo if I have time, maybe implement a nbb plugin that enforces the 1 time use of temp passwords.
* todo TEST yo

### Terminology

* 'NodeBB' == 'nbb' ==  'Nbb' == 'NBB' as a terminology
* 'ubb' == 'UBB' == 'Ubb' means the UBB Threads Forum Software, here's a link => [ubbcentral.com](http://www.ubbcentral.com)
* '_ouid' == 'Old user id' the UBB user id
* 'uid' == 'User id' the NodeBB uid
* '_ofid' == 'Old forum id' the UBB forum id
* 'cid' == 'Category id' the NodeBB Category id (Ubb.Forums become NodeBB Categories)
* '_otid' == 'Old topic id' UBB Topic id
* 'tid' == 'Topic id' NodeBB Topic id
* '_opid' == 'Old post id' UBB Post id
* 'pid' == 'Post id' NodeBB post id
* '_variablename' meaning every variable/property/key that starts with an '_' is probably a UBB variable, before it got normalized, after normalziation, it will loose the '_' and probably change name, i.e. _userPicture --> avatar



    