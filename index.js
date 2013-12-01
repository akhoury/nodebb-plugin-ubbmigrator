var	fse = require('fs.extra'),
	marked = require('marked'),
	path = require('path'),

	Ubbmigrator = {
		config: {},

		init: function() {},
		reload: function(hookVals) {},
		admin: {
			menu: function(custom_header, callback) {
				custom_header.plugins.push({
					"route": '/plugins/ubbmigrator',
					"icon": 'icon-edit',
					"name": 'Ubbmigrator'
				});

				return custom_header;
			},

			route: function(custom_routes, callback) {
				fse.readFile(path.join(__dirname, 'README.md'), function(err, tpl) {
					marked(tpl.toString(), function(err, content){
						if (err) throw err;

						custom_routes.routes.push({
							route: '/plugins/ubbmigrator',
							method: "get",
							options: function(req, res, callback) {
								callback({
									req: req,
									res: res,
									route: '/plugins/ubbmigrator',
									name: Ubbmigrator,
									content: content
								});
							}
						});

						callback(null, custom_routes);
					});
				});
			},

			activate: function(id) {
				if (id === 'nodebb-plugin-ubbmigrator') {
					// nothing
				}
			}
		}
	};

Ubbmigrator.init();
module.exports = Ubbmigrator;