nodebb-plugin-ubbmigrator
=========

UBB to NodeBB forum migrator, a one time use thing, you know, like a condom. This is probably a pre-alpha verion, so it's fragile, handle with care.

## Versions tested on:
  - UBB 7.5.7 ---> NodeBB 0.1.1

## Example usage
#### Readme: 
This is a not a normal plugin, at the moment there is no way you can run it from the NodeBB/admin panel, you must install it in NodeBB/node_modules/nodebb-plugin-ubbmigrator
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
node run.js
# and hope for the best.
```
### run.js with your configs
```javasript
var ubb = require("./library.js");
ubb.migrate({

    // or just "debug" for all
    log: "info,warn,error",

    // ubb db config
    ubbDbConfig: {
        host: "localhost",
        user: "ubb_user",
        password: "password",
        database: "ubb_test"
    },

    // re-setup my nodebb installation, basically calling node app.js --setup={...} with the configs sepcified
    // for now, the nbbReSetup only works on UNIX
    nbbReSetup: {
        run: true,
        // WARNING !!!!!!! THIS WILL FLUSH YOUR REDIS NODEBB DATABASE !!!! 
        flushdb: true,

        // these will be stringified into a string and passed to --setup
        config: {
            // these 4 are required to bypass the prompts
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

    // optional, that's the ubb default, I think
    ubbTablePrefix: "ubbt_",
});
```

### What does it migrate:

read carefully: 

- ####Users: 
    * __Username__ YES. if a user have an invalid username per NodeBB rules, the migrator will try to clean it, then test again, if that's still invalid, the migrator will test the UBB UserDisplayName, if that doesn't work, this user will be skipped.
    * UBB for some reason allows duplicate users with same emails? so the first ones by ID orders will be saved, the rest will be skipped. (UBB appends [username]_dup[Number] next to the dups.. so those will be skipped too if the email is already used)
    * __Passwords__ NO. UBB use MD5, NodeBB uses Sha1 I think, so can't do, the migrator will generate random passwords of length 13 and a set of characters (configurable), don't worry, the migrator will give out the clear text passwords so you can emails your users, keep them safe.
    * __Admins & Moderators__: SORT-OF. NodeBB uses repuration for moderators access, so, even though I add the admins to the NodeBB.Administrators group, and I create a group for old timers (moderators), they don't really become admins nor moderators, so what i do here, is explicitely add reputation points (NodeBB default is 1000 + UBB.User.rating (to keep the karma)) - so .. you can keep track of your moderators and admins, and manually add/remove them later.
    * __Joindates__ YES.
    * __Website__ YES. if URL looks valid, it is migrated, but it's not checked if 404s 
    * __Avatar__ YES. if URL looks valid, it is migrated, but it's not checked if 404s, if not valid, it's set to "" and NodeBB will generate gravatar for the user, but I will also add an attribute `user.customPicture = true` in the generated map if you'd like to make sure the URLs are 200s
    * __Reputation__ SORT-OF. assumed the UBB.User.raking (Moderators and Admins get extra points)
    * __location__ YES. migrated as is, clear text
    * __signatures__ YES. migrated as is (HTML -- __read the Markdown note below__)
    * __banned__ YES. it will stay banned, by username
    * __Confimartion emails__? there is an option, (look in the configs) `nbbAutoConfirmEmails = true/false` which will try to prevent the confirmation email from sending out, and will explicitly set the accounts to veified in NodeBB.
    * __Nginx RedirectRules__ YES. per each user's profile for your convience, see the configs to find out more.
    * oh and, UBB have a weird User with ID == 1, ******DONOTDELETE****** <= that's like the first user created, and somehow, mine does own few topics and posts, so these will be assigned to the NodeBB initial Admin id=1 too. 



- ####Forums (AKA Categories per NodeBB Speak): 
    * __Title__ YES
    * __description__: YES
    * __Order__: per id order, you can reorder those later
    * __NodeBB Icon__: they all get the comment icon, you can change them later
    * __Nginx RedirectRule__ YES. per each forum's url, for your convience, see the configs to find out more.


- ####Topics:
    * __Within its Forum (aka Category)__ YES (but if forum is skipped, this topic is skipped)
    * __Owned by its User__ YES (but if the user is skipped, this topic is skipped)
    * __Title__ YES
    * __Content__ YES (HTML - Read the Markdown Note)
    * __DateTime__ YES
    * __Pinned__ YES (I don't know how mnay you can pin in NodeBB)
    * __ViewCount__ YES
    * __Nginx RedirectRule__ YES. per each forum's url, for your convience, see the configs to find out more.


- ####Posts:
    * __Within its Forum (aka Category)__ YES (but if forum is skipped, the parent topic is skipped, so this post is skipped)
    * __Within its Topic__ YES (the parent topic is skipped, this post is skipped)
    * __Owned by its User__ YES (but if the user is skipped, this post is skipped)
    * __Content__ YES (HTML - Read the Markdown Note)
    * __DateTime__ YES
    * __Nginx RedirectRule__ YES. per each forum's url, for your convience, see the configs to find out more.


### Future versions support
* Will keep supporting future NodeBB versions, since it's still very young and I'm a fan, but you need to submit an issue with all the details (NodeBB version, UBB version, issue etc..), and I will help as fast as I can.
* Will not support multi-UBB versions, unless minor point releases, not major
* If you're running an old version of UBB, upgrade to 7.5.7, then migrate

### Markdown Note

NodeBB uses Markdown for the user submitted content, UBB uses HTML, so, I tried to use an html-to-markdown converter, but it was a huge memory hog, was hitting segmentation faults and memory limits beyong 18k posts conversion, so I took it out, for the record I used `html-md`. Having that said, you still need to convert that content to Markdown somehow, but I'll let you do that. Or you can wait for me to write a NodeBB client-side plugin that will understand html content or something.. or write your own, or submit another solution, I'm open for that, till then, expect to see html tags in the migrated post-contents and user signatures.


    