nodebb-plugin-ubbmigrator
=========

UBB to NodeBB forum migrator, a one time use thing.

<br />

### What?
This is a not a normal NodeBB Plugin, at the moment there is no way to run it from the NodeBB/admin panel, so it doesn't really matter
if it's activated or not, as long as you find this readme somehow.
you must install it in NodeBB/node_modules/nodebb-plugin-ubbmigrator, then you run it from the command line, for the time being, keep reading to find out how

### What does it migrate:

read carefully: 

- ####Users: 
    * __Username__ YES. if a user have an invalid username per NodeBB rules, the migrator will try to clean it, then test again, if that's still invalid, the migrator will test the UBB.User.UserDisplayName, if that doesn't work, this user will be skipped. UBB for some reason allows duplicate users with same emails? so the first ones by ID orders will be saved, the rest will be skipped. (UBB appends [username]_dup[Number] next to the dups.. so those will be skipped too if the email is already used)
    * __Passwords__ NO. UBB use MD5, NodeBB uses Sha1 I think, so can't do, the migrator will generate random passwords of length 13 and a set of characters (configurable), don't worry, the migrator will give out the clear text passwords in the report, so you can email them to your users, keep them safe. Read the [Users new generated passwords Note](#users-new-generated-passwords-note) for more details.
    * __Admins & Moderators__: YES. Admins will stay Admins, and Moderators will stay Moderators, the catch here though is that each moderator is a moderator on ALL of the categories, since I didn't find anywhere UBB separating these powers. Hopefully soon you will be able to edit the Moderators easily via the NodeBB/admin.
    * __Joindate__ YES.
    * __Website__ YES. if URL looks valid, it is migrated, but it's not checked if 404s 
    * __Avatar__ YES. if URL looks valid, it is migrated, but it's not checked if 404s, if not valid, it's set to "" and NodeBB will generate a gravatar URl for the user, but the migrator will also add an attribute `user.customPicture = true` in the generated map if you'd like to make sure the URLs are 200s, you can iterate over them.
    * __Reputation__ SORT-OF. assumed as the UBB.User.raking * 5 (by default) to boost the Karma !! (it's configurable)
    * __Location__ YES. migrated as is, clear text
    * __Signature__ YES. migrated as is (HTML -- read the [Markdown note](#markdown-note) below)
    * __Banned__ YES. it will stay banned, by username
    * __Confimartion emails__? there is an option for this migrator (look in the configs) `nbbAutoConfirmEmails = true/false` which will try to prevent the confirmation email from sending out, and will explicitly set the accounts to verified in NodeBB.
    * __Nginx RedirectRules__ YES. per each user's profile for your convience, read the [Redirect Urls Note](#redirect-urls-note) to find out more.
    * __Oh and__, UBB have a weird User with ID == 1, ******DONOTDELETE****** <= that's like the first user created, and somehow, in my UBB installation, it does own few topics and posts, so these will be assigned to the NodeBB initial Admin created. 



- ####Forums (AKA Categories per NodeBB Speak): 
    * __Title__ YES
    * __description__: YES
    * __Order__: per FORUM_ID order, you can reorder those later
    * __NodeBB Icon__: they all get the comment icon for now, you can change them later
    * __Nginx RedirectRule__ YES. per each forum's url, for your convenience, read the [Redirect Urls Note](#redirect-urls-note) to find out more.


- ####Topics:
    * __Within its Forum (aka Category)__ YES (but if its parent forum is skipped, this topic gets skipped)
    * __Owned by its User__ YES (but if its user is skipped, this topic gets skipped)
    * __Title__ YES
    * __Content__ YES (HTML - read the [Markdown Note](#markdown-note) below)
    * __DateTime__ YES
    * __Pinned__ YES (I don't know how many you can pin in NodeBB)
    * __ViewCount__ YES
    * __Nginx RedirectRule__ YES. per each forum's url, for your convenience, read the [Redirect Urls Note](#redirect-urls-note) to find out more.


- ####Posts:
    * __Within its Forum (aka Category)__ YES (but if its grand-parent forum is skipped, its parent topic gets skipped, hence this post gets skipped)
    * __Within its Topic__ YES (but if its parent topic is skipped, this post gets skipped)
    * __Owned by its User__ YES (but if its user is skipped, this post is skipped)
    * __Content__ YES (HTML - read the [Markdown Note](#markdown-note) below)
    * __DateTime__ YES
    * __Nginx RedirectRule__ SORT-OF, every UBB.Post URL basically points to its Parent-Topic's URL with a `ubbthreads.php/topic/123/#Post456789`, I don't think there is an easy way for for nginx to capture the # values, without some Client-Side JavaScript involved, BUT I generate the rule anyway, so you can have a mapping from the UBB posts to the NBB posts. And if you find a solution, please share. The good news is even if you ignore this and you just redirect the old topics, all the OLD POSTS URLS WILL land at the correct NEW TOPIC.


## Versions tested on:
  - UBB 7.5.7 ---> NodeBB 0.1.x-edge (I was almost daily updating from nodebb/master during development)

## Example usage
```sh
# that's your nodebb installation
# I should not need to ask you to try this on a staging machine or locally first
cd [wherever]/NodeBB/

# to install nodebb dependencies
npm install

npm install nodebb-plugin-ubbmigrator

cd node_modules/nodebb-plugin-ubbmigrator

# edit your configs
vim config.json

# then 
node ubbmigrator.js --flush --config="config.json" --storage="/home/you/Desktop/there" --log="useful,info,warn,debug,error"

# and hope for the best
# I would grep the [useful] lines out stuff later, they're very useful for redirection purposes, getting users email/username/passwd to send them out etc..
# node run.js --flush | tee migration.log | grep "[useful]" > useful.log
# or you could find a gazillion file in the ./storage directory after the migration is done, and read them one by one.. up to you and/or your developer

# !!!! the --flush flag WILL flush your NodeBB database, clears out all the temp storage from previous runs and starts fresh
# do NOT use the --flush flag if you are attempting to resume after some failure or interruption
```

### Your config are required

see [config.json](config.json), obviously I can't neatly comment a JSON file, so I will here

```javascript
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
            
            // [EDIT]: there is relatively a better solution, see the Urls Redirect Note below

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
        autoConfirmEmails: true,

        userReputationMultiplier: 5
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
so I disabled it, for the record I am using [html-md](https://github.com/neocotic/html.md). You can still enable it by setting `{ commom: { ..., markdown: true, ... } ... }` in the config.

Having that said, if you leave it disabled, you still need to convert that content to Markdown somehow, OR you can use my early version of [nodebb-plugin-sanitizehtml](https://github.com/akhoury/nodebb-plugin-sanitizehtml), combined with [nodebb-plugin-markdown](https://github.com/julianlam/nodebb-plugin-markdown)
BUT YOU MUST to TURN OFF the HTML sanitization on __nodebb-plugin-markdown__,
and then activate __nodebb-plugin-sanitizehtml__ and let it do the less agressive, but still secure sanitization.


### Redirect Urls Note

This migrator will spit out the nginx "rewrite rules" for each record,
in a log mesage tagged [useful] if it's turned on, but it will also save a file for EACH record (user/topic/forum/post) in the __storage__ directory.
You can either ```grep``` the logs and clean them up as you wish, or iterate over these files in storage to build a map for all the ```[:oldid]: [:newIdOrSlug]```.
When you build your map, you can use this [ubb-redirector](https://github.com/akhoury/ubb-redirector) (Or you can just add a flag ```--ubbredirector``` to generate a map that works well with ubb-redirector))
to handle thre redirection of these urls (you may have to manually adjust your map, a 2 minutes of work),
or use the built-in nginx  [HttpMapModule](http://wiki.nginx.org/HttpMapModule).

If you decide to use straight out rule-by-rule nginx rewrite rules, not recommended, but you can, see the ```rule: 'rewrite ^/MY_UBB_PATH/${FROM}(.*)$ /MY_NBB_PATH/${TO}$1 permanent;'``` in the config, you can edit that, but leave the ```${FROM}``` and the ```${TO}``` in there as the migrator will replace them with the correct values per each record (forum/topic/user/post).

### Users new generated passwords Note

in the [Redirect Urls Note](#redirect-urls-note) above, I mentioned the storage files, and the [useful] tags, (look for ```[user-json]``` and/or ```[user-csv]```)
also these logs will spit out a JSON (AND CSV) string for each user's ```email```, ```username```, ```password```, ```_ouid``` (old user id), ```uid``` (new user id) and ```ms``` (joindate in Milliseconds),
so you or your developer can easily build a list of these emails with their usernames and passwords so you can send out the blast.
If you decide to use the storage to build that list, look for u.* files, which are the users files appended with their old user id (```_ouid```).


## Limitations
* UNIX only (Linux, Mac) but no Windows support yet, it's one a time use, I probably won't support Windows soon.
* If you're migrating very large forum, I'm talking about 200k records and up, expect to wait hours, depending on your machine, but, you might need to hack and disable some things in NodeBB, temporarily. Can't figure out what yet, since NodeBB is highly active and unstable at the moment, but give me a buzz, I'll help you out. once the next stable version comes out, I will stabilize this migrator.

### TODO
* todo !!!!! HITTING MEMORY LIMITS OVER 18k POSTS IF MARKDOWNING IS TURNED ON !! FUCK it turn it off !!
* todo maybe go through all users who has user.customPicture == true, and test each image url if 200 or not and filter the ones pointing to my old forum avatar dir
* todo still, make sure the old [YOUR_UBB_PATH]/images/avatars/* is still normally accessible to keep the old avatars
* todo create a nodebb-theme that works with the site
* todo send emails to all users with temp passwords
* todo if I have time, maybe implement a nbb plugin that enforces the 1 time use of temp passwords.
* todo TEST yo

### Terminology

* 'NodeBB' == 'nbb' ==  'Nbb' == 'NBB' as a terminology, which a new [NodeJS](http://nodejs.org/) based Forum Software, [check it out](http://nodebb.org/)
* 'ubb' == 'UBB' == 'Ubb' means the UBB Threads Forum Software, here's a link => [ubbcentral.com](http://www.ubbcentral.com)
* '_ouid' == 'Old user id' the UBB user id
* 'uid' == 'User id' the NodeBB uid
* '_ofid' == 'Old forum id' the UBB forum id
* 'cid' == 'Category id' the NodeBB Category id (Ubb.Forums become NodeBB Categories)
* '_otid' == 'Old topic id' UBB Topic id
* 'tid' == 'Topic id' NodeBB Topic id
* '_opid' == 'Old post id' UBB Post id
* 'pid' == 'Post id' NodeBB post id
* every variable/property/key that starts with an __underscore__ such as ```_username``` is probably a UBB variable, before it got normalized, after normalization, it will loose the __underscore__ and probably change name, i.e. ```_userPicture --> avatar```


    
